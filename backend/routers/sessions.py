from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.session import Session as SessionModel
from backend.models.document import Document
from backend.models.chat import ChatMessage
from backend.services.vectordb_service import get_vectorstore


router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"]
)


class SessionRenameRequest(BaseModel):
    name: str


@router.post("")
def create_session(
    name: str = "New Chat",
    db: Session = Depends(get_db)
):
    session = SessionModel(
        name=name
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "name": session.name,
        "created_at": session.created_at
    }


@router.get("")
def get_sessions(
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(SessionModel)
        .order_by(SessionModel.created_at.desc())
        .all()
    )

    return [
        {
            "id": session.id,
            "name": session.name,
            "created_at": session.created_at
        }
        for session in sessions
    ]


@router.patch("/{session_id}")
def rename_session(
    session_id: int,
    request: SessionRenameRequest,
    db: Session = Depends(get_db)
):
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

    cleaned_name = request.name.strip()

    if not cleaned_name:
        raise HTTPException(
            status_code=400,
            detail="Session name cannot be empty."
        )

    if len(cleaned_name) > 100:
        raise HTTPException(
            status_code=400,
            detail="Session name must be 100 characters or fewer."
        )

    session.name = cleaned_name

    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "name": session.name,
        "created_at": session.created_at
    }


@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db)
):
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

    # Get all documents belonging to this session.
    documents = (
        db.query(Document)
        .filter(Document.session_id == session_id)
        .all()
    )

    vectorstore = get_vectorstore()
    collection = vectorstore._collection

    # Delete documents, vectors, and PDF files.
    for document in documents:
        collection.delete(
            where={
                "document_uid": document.document_uid
            }
        )

        file_path = Path("data/uploads") / document.filename

        if file_path.exists():
            file_path.unlink()

        db.delete(document)

    # Delete chat history.
    db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).delete()

    # Delete the session.
    db.delete(session)
    db.commit()

    return {
        "message": "Session and all associated data deleted successfully.",
        "session_id": session_id
    }