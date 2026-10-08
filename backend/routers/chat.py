from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.chat import ChatMessage
from backend.models.session import Session as SessionModel

from backend.services.rag_service import ask_question


router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


class ChatRequest(BaseModel):
    question: str
    session_id: int


@router.post("")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):

    # Check that the session exists
    session = (
        db.query(SessionModel)
        .filter(SessionModel.id == request.session_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    # Save user message
    user_message = ChatMessage(
        session_id=request.session_id,
        role="user",
        content=request.question
    )

    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Run RAG
    chat_history = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == request.session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    history = [
        {
            "role": message.role,
            "content": message.content
        }
        for message in chat_history
    ]

    result = ask_question(
        question=request.question,
        session_id=request.session_id,
        chat_history=history
    )

    # Save assistant message
    assistant_message = ChatMessage(
        session_id=request.session_id,
        role="assistant",
        content=result["answer"]
    )
    assistant_message.set_sources(result["sources"])

    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)

    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "session_id": request.session_id,
        "user_message_id": user_message.id,
        "assistant_message_id": assistant_message.id
    }


@router.get("/{session_id}/messages")
def get_chat_history(
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

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return [
        {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "sources": message.get_sources(),
            "created_at": message.created_at
        }
        for message in messages
    ]