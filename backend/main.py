import mimetypes
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.auth import router as auth_router
from backend.config import DIST_DIR
from backend.database import SessionLocal, init_db
from backend.routers import chat, documents, sessions, upload
from backend.services.storage_service import retry_artifact_cleanup


@asynccontextmanager
async def lifespan(app):
    init_db()
    with SessionLocal() as db:
        retry_artifact_cleanup(db)
    yield


app = FastAPI(
    title="Multi-PDF RAG Assistant",
    description="Local document question answering with page citations.",
    version="1.0.3",
    lifespan=lifespan,
)


@app.middleware("http")
async def check_request_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and request.method not in {"GET", "HEAD", "OPTIONS"}:
        try:
            origin_parts = urlsplit(origin)
            same_origin = (
                origin_parts.scheme in {"http", "https"} and origin_parts.netloc
                and origin_parts.netloc.lower() == request.headers.get("host", "").lower()
            )
        except ValueError:
            same_origin = False
        if not same_origin:
            return JSONResponse({"detail": "Cross-origin writes are disabled."}, status_code=403)
    return await call_next(request)


@app.get("/health", tags=["System"])
@app.get("/api/health", include_in_schema=False)
def health_check():
    return {"status": "healthy"}


for router in (auth_router, upload.router, chat.router, documents.router, sessions.router):
    app.include_router(router)
    app.include_router(router, prefix="/api", include_in_schema=False)


if (DIST_DIR / "index.html").is_file():
    # Windows registry associations can override the module worker MIME type.
    mimetypes.add_type("text/javascript", ".mjs")
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    app.mount("/pdfjs", StaticFiles(directory=DIST_DIR / "pdfjs"), name="pdfjs")

    @app.get("/", include_in_schema=False)
    @app.get("/chat/{session_id}", include_in_schema=False)
    def frontend(session_id: str | None = None):
        return FileResponse(DIST_DIR / "index.html", headers={"Cache-Control": "no-store"})
