import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, StringConstraints
from sqlalchemy.orm import Session

from backend.auth import current_owner, session_for_owner
from backend.database import SessionLocal, get_db
from backend.models.chat import ChatMessage
from backend.models.document import Document
from backend.services.rag_service import answer_question
from backend.services.storage_service import storage_lock

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger(__name__)
SERVICE_ERROR = "The local RAG service could not finish. Check that Ollama is running and the configured model is installed."


class ChatRequest(BaseModel):
    question: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    session_id: int


def prepare_chat(request, db, owner_id):
    with storage_lock:
        session = session_for_owner(db, request.session_id, owner_id)
        messages = db.query(ChatMessage).filter_by(session_id=session.id).order_by(
            ChatMessage.id.desc()
        ).limit(6).all()
        history = [{"role": item.role, "content": item.content} for item in reversed(messages)]
        uids = db.query(Document.document_uid).filter_by(session_id=session.id).all()
        return session.created_at, [uid for (uid,) in uids], history


def chat_events(request, owner_id, prepared):
    created_at, uids, history = prepared
    try:
        for kind, data in answer_question(request.question, request.session_id, uids, history):
            if kind == "result":
                data = save_exchange(request, owner_id, created_at, data)
            yield {"type": kind, **data}
    except HTTPException as exc:
        yield {"type": "error", "message": exc.detail, "status": exc.status_code}
    except Exception:
        logger.exception("Chat generation failed for session %s", request.session_id)
        yield {"type": "error", "message": SERVICE_ERROR, "status": 503}


def save_exchange(request, owner_id, created_at, result):
    with storage_lock, SessionLocal() as db:
        session = session_for_owner(db, request.session_id, owner_id)
        if session.created_at != created_at:
            raise HTTPException(404, "Session not found.")
        source_uids = {source["document_uid"] for source in result["sources"]}
        if source_uids:
            active = db.query(Document.document_uid).filter(
                Document.session_id == session.id, Document.document_uid.in_(source_uids)
            ).all()
            if len(active) != len(source_uids):
                raise HTTPException(409, "A source was removed while answering. Try the question again.")
        user_message = ChatMessage(session_id=session.id, role="user", content=request.question)
        assistant = ChatMessage(session_id=session.id, role="assistant", content=result["answer"])
        assistant.set_sources(result["sources"])
        db.add_all([user_message, assistant])
        db.commit()
        return {
            **result, "session_id": session.id,
            "user_message_id": user_message.id, "assistant_message_id": assistant.id,
        }


@router.post("")
def chat(
    request: ChatRequest, db: Session = Depends(get_db, scope="function"),
    owner_id: int | None = Depends(current_owner, scope="function"),
):
    prepared = prepare_chat(request, db, owner_id)
    for event in chat_events(request, owner_id, prepared):
        if event["type"] == "error":
            raise HTTPException(event["status"], event["message"])
        if event["type"] == "result":
            return {key: value for key, value in event.items() if key != "type"}
    raise HTTPException(503, SERVICE_ERROR)


@router.post("/stream")
def stream_chat(
    request: ChatRequest, db: Session = Depends(get_db, scope="function"),
    owner_id: int | None = Depends(current_owner, scope="function"),
):
    prepared = prepare_chat(request, db, owner_id)
    events = (json.dumps(event, ensure_ascii=False) + "\n" for event in chat_events(request, owner_id, prepared))
    return StreamingResponse(
        events, media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.get("/{session_id}/messages")
def get_chat_history(
    session_id: int, db: Session = Depends(get_db), owner_id: int | None = Depends(current_owner)
):
    session_for_owner(db, session_id, owner_id)
    messages = db.query(ChatMessage).filter_by(session_id=session_id).order_by(ChatMessage.id.asc())
    return [
        {
            "id": item.id, "role": item.role, "content": item.content,
            "sources": item.get_sources(), "created_at": item.created_at,
        }
        for item in messages
    ]
