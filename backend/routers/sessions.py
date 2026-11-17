from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, StringConstraints
from sqlalchemy.orm import Session

from backend.auth import current_owner, session_for_owner
from backend.database import get_db
from backend.models.chat import ChatMessage
from backend.models.document import Document
from backend.models.session import Session as ChatSession
from backend.services.storage_service import retry_artifact_cleanup, stage_artifact_cleanup, storage_lock

router = APIRouter(prefix="/sessions", tags=["Sessions"])
SessionName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class SessionRenameRequest(BaseModel):
    name: SessionName


def session_details(session):
    return {"id": session.id, "name": session.name, "created_at": session.created_at}


@router.post("")
def create_session(
    name: Annotated[SessionName, Query()] = "New Chat",
    db: Session = Depends(get_db),
    owner_id: int | None = Depends(current_owner),
):
    with storage_lock:
        session = ChatSession(name=name, owner_id=owner_id)
        db.add(session)
        db.commit()
        return session_details(session)


@router.get("")
def get_sessions(db: Session = Depends(get_db), owner_id: int | None = Depends(current_owner)):
    sessions = db.query(ChatSession).filter_by(owner_id=owner_id).order_by(ChatSession.id.desc())
    return [session_details(session) for session in sessions]


@router.patch("/{session_id}")
def rename_session(
    session_id: int,
    request: SessionRenameRequest,
    db: Session = Depends(get_db),
    owner_id: int | None = Depends(current_owner),
):
    with storage_lock:
        session = session_for_owner(db, session_id, owner_id)
        session.name = request.name
        db.commit()
        return session_details(session)


@router.delete("/{session_id}")
def delete_session(
    session_id: int, db: Session = Depends(get_db), owner_id: int | None = Depends(current_owner)
):
    with storage_lock:
        session = session_for_owner(db, session_id, owner_id)
        documents = db.query(Document).filter_by(session_id=session_id).all()
        db.query(Document).filter_by(session_id=session_id).delete()
        db.query(ChatMessage).filter_by(session_id=session_id).delete()
        db.flush()
        stage_artifact_cleanup(documents, db)
        db.delete(session)
        db.commit()
        retry_artifact_cleanup(db)
    return {"message": "Session deleted successfully.", "session_id": session_id}
