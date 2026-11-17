import hashlib
import re

import pytest
from fastapi.testclient import TestClient
from langchain_core.embeddings import Embeddings
from sqlalchemy import URL, create_engine

from backend import auth, database
from backend.routers import upload
from backend.services import storage_service, vectordb_service
from backend.main import app


class TestEmbeddings(Embeddings):
    """Deterministic embeddings for API tests that run without model downloads."""

    def embed_query(self, text):
        counts = [0.0] * 128
        for word in re.findall(r"[a-z0-9]+", text.lower()):
            position = hashlib.sha256(word.encode()).digest()[0] % len(counts)
            counts[position] += 1
        return counts

    def embed_documents(self, texts):
        return [self.embed_query(text) for text in texts]


@pytest.fixture
def isolated(monkeypatch, tmp_path):
    engine = create_engine(URL.create("sqlite", database=str(tmp_path / "db.sqlite")))
    database.event.listen(engine, "connect", database.set_sqlite_options)
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database.SessionLocal, "kw", {**database.SessionLocal.kw, "bind": engine})
    monkeypatch.setattr(storage_service, "UPLOAD_DIR", tmp_path / "uploads")
    monkeypatch.setattr(upload, "UPLOAD_DIR", tmp_path / "uploads")
    monkeypatch.setattr(vectordb_service, "CHROMA_DIR", tmp_path / "chroma")
    monkeypatch.setattr(vectordb_service, "get_embedding_model", TestEmbeddings)
    monkeypatch.setattr(auth, "AUTH_ENABLED", False)
    vectordb_service.get_chroma_client.cache_clear()
    yield
    engine.dispose()
    vectordb_service.get_chroma_client.cache_clear()


@pytest.fixture
def client(isolated):
    with TestClient(app) as client:
        yield client
