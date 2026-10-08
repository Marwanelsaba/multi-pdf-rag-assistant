import hashlib
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.document import Document
from backend.models.session import Session as SessionModel

from backend.services.pdf_service import extract_pages
from backend.services.chunking_service import create_chunks
from backend.services.vectordb_service import get_vectorstore


router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)


UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("")
async def upload_pdf(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # Check that the session exists
    session = (
        db.query(SessionModel)
        .filter(SessionModel.id == session_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    # Check file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    # Read file
    file_content = await file.read()

    # Calculate SHA-256 hash
    file_hash = hashlib.sha256(file_content).hexdigest()

    # Check if the exact PDF already exists in this session
    existing_document = (
        db.query(Document)
        .filter(
            Document.file_hash == file_hash,
            Document.session_id == session_id
        )
        .first()
    )

    if existing_document:
        return {
            "message": "This PDF has already been uploaded.",
            "document_id": existing_document.id,
            "document_uid": existing_document.document_uid,
            "filename": existing_document.filename,
            "session_id": existing_document.session_id
        }

    # Save PDF
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as f:
        f.write(file_content)

    # Extract pages
    pages = extract_pages(str(file_path))

    # Create chunks
    chunks = create_chunks(pages)

    # Create database record
    document = Document(
        filename=file.filename,
        file_hash=file_hash,
        page_count=len(pages),
        chunk_count=len(chunks),
        session_id=session_id
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    # Store chunks in ChromaDB
    vectorstore = get_vectorstore()

    documents = [
        chunk["text"]
        for chunk in chunks
    ]

    metadatas = [
        {
            "page": chunk["page"],
            "source": file.filename,
            "document_id": document.id,
            "document_uid": document.document_uid,
            "session_id": session_id
        }
        for chunk in chunks
    ]

    vector_ids = [
        f"{document.document_uid}:{index}"
        for index in range(len(chunks))
    ]

    vectorstore.add_texts(
        texts=documents,
        metadatas=metadatas,
        ids=vector_ids
    )

    return {
        "message": "PDF uploaded successfully.",
        "document_id": document.id,
        "document_uid": document.document_uid,
        "filename": file.filename,
        "session_id": session_id,
        "pages": len(pages),
        "chunks": len(chunks)
    }