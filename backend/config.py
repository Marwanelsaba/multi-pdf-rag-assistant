import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("RAG_DATA_DIR", ROOT / "data")).resolve()
UPLOAD_DIR = DATA_DIR / "uploads"
CHROMA_DIR = DATA_DIR / "chroma"
METADATA_DIR = DATA_DIR / "metadata"
DIST_DIR = ROOT / "dist"

OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
EMBEDDING_MODEL = os.environ.get(
    "RAG_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)
RERANK_MODEL = os.environ.get("RAG_RERANK_MODEL", "").strip()
AUTH_ENABLED = os.environ.get("RAG_AUTH_ENABLED") == "1"
SECURE_COOKIE = os.environ.get("RAG_SECURE_COOKIE") == "1"
REGISTRATION_ENABLED = os.environ.get("RAG_ALLOW_REGISTRATION", "1") == "1"
MAX_PDF_BYTES = 50 * 1024 * 1024
