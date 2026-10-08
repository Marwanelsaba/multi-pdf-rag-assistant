from fastapi import FastAPI

from backend.database import Base, engine
from backend.models.document import Document
from backend.models.chat import ChatMessage
from backend.routers.upload import router as upload_router
from backend.routers.chat import router as chat_router
from backend.routers.documents import router as documents_router
from backend.routers.sessions import router as sessions_router

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Multi-PDF RAG Assistant",
    description="AI assistant for querying multiple PDF documents",
    version="1.0.0"
)


app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(sessions_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }