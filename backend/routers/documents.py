from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from backend.auth import current_owner, session_for_owner
from backend.database import get_db
from backend.models.document import Document
from backend.models.session import Session as ChatSession
from backend.services.storage_service import existing_pdf, retry_artifact_cleanup, stage_artifact_cleanup, storage_lock

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("")
def get_documents(
    session_id: int | None = None, db: Session = Depends(get_db), owner_id: int | None = Depends(current_owner),
):
    documents = db.query(Document).join(ChatSession).filter(ChatSession.owner_id == owner_id)
    if session_id is not None:
        session_for_owner(db, session_id, owner_id)
        documents = documents.filter(Document.session_id == session_id)
    return [
        {
            "id": document.id, "filename": document.filename, "file_hash": document.file_hash,
            "page_count": document.page_count, "chunk_count": document.chunk_count,
            "session_id": document.session_id, "upload_date": document.upload_date,
        }
        for document in documents.order_by(Document.id.desc())
    ]


def find_document(db, document_id, owner_id, session_id=None):
    query = db.query(Document).join(ChatSession).filter(
        Document.id == document_id, ChatSession.owner_id == owner_id
    )
    if session_id is not None:
        query = query.filter(Document.session_id == session_id)
    document = query.first()
    if document is None:
        raise HTTPException(404, "Document not found.")
    return document


@router.api_route("/{document_id}/file", methods=["GET", "HEAD"])
def get_document_file(
    request: Request, document_id: int, session_id: int, document_uid: str | None = None,
    db: Session = Depends(get_db), owner_id: int | None = Depends(current_owner),
):
    document = find_document(db, document_id, owner_id, session_id)
    if document_uid is not None and document_uid != document.document_uid:
        raise HTTPException(404, "This citation refers to a deleted PDF.")
    file_path = existing_pdf(document)
    if file_path is None:
        raise HTTPException(404, "The stored PDF is unavailable. Re-upload the original PDF to restore it.")
    headers = {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}
    if request.method == "HEAD":
        return Response(headers=headers, media_type="application/pdf")
    return FileResponse(
        path=file_path, media_type="application/pdf", filename=document.filename,
        content_disposition_type="inline", headers=headers,
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int, db: Session = Depends(get_db), owner_id: int | None = Depends(current_owner)
):
    with storage_lock:
        document = find_document(db, document_id, owner_id)
        stage_artifact_cleanup([document], db)
        db.delete(document)
        db.commit()
        retry_artifact_cleanup(db)
    return {"message": "Document deleted successfully.", "document_id": document_id, "filename": document.filename}
