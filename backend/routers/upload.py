import hashlib
import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pypdf.errors import PdfReadError
from sqlalchemy.orm import Session

from backend.auth import current_owner, session_for_owner
from backend.config import MAX_PDF_BYTES, UPLOAD_DIR
from backend.database import get_db
from backend.models.document import Document
from backend.services.chunking_service import create_chunks
from backend.services.pdf_service import extract_pages
from backend.services.storage_service import existing_pdf, storage_lock, upload_path
from backend.services.vectordb_service import get_collection, get_vectorstore

router = APIRouter(prefix="/upload", tags=["Upload"])
logger = logging.getLogger(__name__)


@router.post("")
def upload_pdf(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    owner_id: int | None = Depends(current_owner),
):
    filename = (file.filename or "").replace(chr(92), "/").rsplit("/", 1)[-1]
    if len(filename) > 255 or any(ord(char) < 32 for char in filename) or not filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Choose a PDF with a valid filename.")
    content = file.file.read(MAX_PDF_BYTES + 1)
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(413, "Individual PDFs must be 50 MB or smaller.")
    if b"%PDF-" not in content[:1024]:
        raise HTTPException(400, "The uploaded file is not a readable PDF.")
    file_hash = hashlib.sha256(content).hexdigest()

    with storage_lock:
        session_for_owner(db, session_id, owner_id)
        document = db.query(Document).filter_by(session_id=session_id, file_hash=file_hash).first()
        repairing = document is not None
        if repairing:
            indexed = get_collection().get(where={"document_uid": document.document_uid}, include=[])
            if len(indexed["ids"]) == document.chunk_count and document.chunk_count:
                if existing_pdf(document) is None:
                    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
                    target = upload_path(document.document_uid)
                    restored = target.with_suffix(".part")
                    try:
                        restored.write_bytes(content)
                        restored.replace(target)
                    finally:
                        restored.unlink(missing_ok=True)
                return upload_result(document, duplicate=True)
        else:
            document = Document(
                document_uid=str(uuid4()), filename=filename, file_hash=file_hash, session_id=session_id
            )
        path = upload_path(document.document_uid)
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        staging = path.with_suffix(".part")
        wrote_pdf = False
        try:
            staging.write_bytes(content)
            try:
                pages = extract_pages(staging)
            except (PdfReadError, ValueError, TypeError, IndexError, KeyError, OSError) as exc:
                raise HTTPException(400, "The PDF is damaged or password-protected.") from exc
            chunks = create_chunks(pages)
            if not chunks:
                raise HTTPException(422, "No readable text was found. Run OCR on scanned PDFs before uploading.")

            document.page_count = len(pages)
            document.chunk_count = len(chunks)
            db.add(document)
            db.flush()
            vectors = get_vectorstore()
            if repairing:
                get_collection().delete(where={"document_uid": document.document_uid})
            for start in range(0, len(chunks), 128):
                batch = chunks[start:start + 128]
                vectors.add_texts(
                    texts=[chunk["text"] for chunk in batch],
                    metadatas=[
                        {
                            "page": chunk["page"], "source": document.filename,
                            "document_id": document.id, "document_uid": document.document_uid,
                            "session_id": session_id,
                        }
                        for chunk in batch
                    ],
                    ids=[f"{document.document_uid}:{index}" for index in range(start, start + len(batch))],
                )
            staging.replace(path)
            wrote_pdf = True
            db.commit()
        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
            if not repairing:
                uid = document.document_uid
                try:
                    get_collection().delete(where={"document_uid": uid})
                    if wrote_pdf:
                        path.unlink(missing_ok=True)
                except Exception:
                    logger.exception("Could not clean up failed upload %s", uid)
            logger.exception("PDF indexing failed")
            raise HTTPException(503, "PDF indexing failed. Check the backend log and try again.") from exc
        finally:
            staging.unlink(missing_ok=True)
        return upload_result(document)


def upload_result(document, duplicate=False):
    return {
        "message": "This PDF has already been uploaded." if duplicate else "PDF uploaded successfully.",
        "document_id": document.id,
        "document_uid": document.document_uid,
        "filename": document.filename,
        "duplicate": duplicate,
        "session_id": document.session_id,
        "pages": document.page_count,
        "chunks": document.chunk_count,
    }
