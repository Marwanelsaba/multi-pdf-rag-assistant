from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.document import Document
from backend.services.vectordb_service import get_vectorstore


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


UPLOAD_DIRECTORY = Path("data/uploads").resolve()


@router.get("")
def get_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).all()

    return [
        {
            "id": document.id,
            "filename": document.filename,
            "file_hash": document.file_hash,
            "page_count": document.page_count,
            "chunk_count": document.chunk_count,
            "session_id": document.session_id,
            "upload_date": document.upload_date,
        }
        for document in documents
    ]


@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    session_id: int,
    db: Session = Depends(get_db),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.session_id == session_id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found in this session.",
        )

    file_path = (UPLOAD_DIRECTORY / document.filename).resolve()

    try:
        file_path.relative_to(UPLOAD_DIRECTORY)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid document path.",
        ) from exc

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="The stored PDF file could not be found.",
        )

    safe_filename = document.filename.replace('"', "")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="{safe_filename}"'
            )
        },
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
):
    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    # Delete chunks from ChromaDB.
    vectorstore = get_vectorstore()
    collection = vectorstore._collection

    collection.delete(
        where={
            "document_uid": document.document_uid,
        }
    )

    # Delete the physical PDF.
    file_path = (UPLOAD_DIRECTORY / document.filename).resolve()

    try:
        file_path.relative_to(UPLOAD_DIRECTORY)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid document path.",
        ) from exc

    if file_path.is_file():
        file_path.unlink()

    # Delete the database record.
    db.delete(document)
    db.commit()

    return {
        "message": "Document deleted successfully.",
        "document_id": document_id,
        "filename": document.filename,
    }