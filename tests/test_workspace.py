import json

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, AIMessageChunk

from backend import auth, database
from backend.main import app
from backend.services import rag_service, vectordb_service
from backend.services.chunking_service import create_chunks
from backend.services.pdf_service import extract_pages
from scripts.pdf_fixture import pdf_bytes


def session(client):
    response = client.post("/api/sessions")
    assert response.status_code == 200, response.text
    return response.json()["id"]


def upload(client, session_id, contents, filename="notes.pdf"):
    return client.post(
        f"/api/upload?session_id={session_id}", files={"file": (filename, contents, "application/pdf")}
    )


def document_url(record, session_id):
    return f'/api/documents/{record["document_id"]}/file?session_id={session_id}&document_uid={record["document_uid"]}'


def ask(client, session_id, question="Which planet has a cobalt beacon?", *, stream=False):
    return client.post(
        "/api/chat/stream" if stream else "/api/chat",
        json={"session_id": session_id, "question": question},
    )


class Model:
    def __init__(self, output):
        self.output = output
        self.rewrites = []

    def invoke(self, messages):
        self.rewrites.append(json.loads(messages[-1].content))
        return AIMessage(content="Which planet has a cobalt beacon?")

    def stream(self, messages):
        prompt = json.loads(messages[-1].content)
        yield AIMessageChunk(content=self.output(prompt) if callable(self.output) else self.output)


def test_pdf_pages_and_chunking(tmp_path):
    path = tmp_path / "pages.pdf"
    path.write_bytes(pdf_bytes("", "A header. " + "A sentence with words. " * 100))
    pages = extract_pages(path)
    chunks = create_chunks(pages)
    assert len(pages) == 2
    assert chunks and all(chunk["page"] == 2 and len(chunk["text"]) <= 1000 for chunk in chunks)


def test_upload_duplicate_and_same_filename_isolation(client):
    first, second = session(client), session(client)
    alpha = pdf_bytes("Cobalt beacons are on Mars.")
    beta = pdf_bytes("Copper beacons are on Venus.")
    doc_a = upload(client, first, alpha, "ملاحظات.pdf").json()
    doc_b = upload(client, second, beta, "ملاحظات.pdf").json()
    doc_c = upload(client, first, beta, "ملاحظات.pdf").json()
    assert len({doc["document_uid"] for doc in (doc_a, doc_b, doc_c)}) == 3
    assert upload(client, first, alpha, "different.pdf").json()["document_id"] == doc_a["document_id"]
    assert client.get(document_url(doc_a, first)).content == alpha
    assert "filename*=" in client.get(document_url(doc_a, first)).headers["content-disposition"]
    assert client.get(document_url(doc_a, second)).status_code == 404
    assert client.get(document_url(doc_b, second), headers={"Range": "bytes=0-7"}).status_code == 206
    assert client.get(f"/api/documents?session_id={second}").json()[0]["id"] == doc_b["document_id"]
    assert client.delete(f"/api/sessions/{first}").status_code == 200
    assert client.get(document_url(doc_b, second)).content == beta
    assert len(vectordb_service.get_collection().get(include=[])["ids"]) == 1


def test_invalid_upload_and_failed_index_can_retry(client, monkeypatch):
    sid = session(client)
    assert upload(client, sid, b"invalid").status_code == 400
    assert upload(client, sid, pdf_bytes("")).status_code == 422

    class FailingIndex:
        def add_texts(self, **kwargs):
            original().add_texts(**kwargs)
            raise RuntimeError("Index failure after writing vectors")

    from backend.routers import upload as router
    original = router.get_vectorstore
    with monkeypatch.context() as patch:
        patch.setattr(router, "get_vectorstore", FailingIndex)
        assert upload(client, sid, pdf_bytes("Cobalt is a metal.")).status_code == 503
    assert client.get(f"/api/documents?session_id={sid}").json() == []
    assert vectordb_service.get_collection().get(include=[])["ids"] == []
    assert list(router.UPLOAD_DIR.iterdir()) == []
    assert upload(client, sid, pdf_bytes("Cobalt is a metal.")).status_code == 200


def test_stream_and_followup_use_only_cited_pages(client, monkeypatch):
    first, second = session(client), session(client)
    upload(client, first, pdf_bytes("Gardens contain copper lamps.", "Cobalt beacon on Mars."), "atlas.pdf")
    upload(client, second, pdf_bytes("Cobalt beacon on Venus."), "other.pdf")

    def respond(prompt):
        passages = prompt["passages"]
        assert all(passage["file"] == "atlas.pdf" for passage in passages)
        match = next(p for p in passages if p["page"] == 2)
        return f'Mars {match["reference"]}.'

    model = Model(respond)
    monkeypatch.setattr(rag_service, "get_llm", lambda: model)
    events = [json.loads(line) for line in ask(client, first, stream=True).text.splitlines()]
    assert [event["type"] for event in events] == ["delta", "result"]
    assert events[-1]["answer"] == "Mars."
    assert [(ref["file"], ref["page"]) for ref in events[-1]["sources"]] == [("atlas.pdf", 2)]
    assert model.rewrites == []
    assert ask(client, first, "Which one?").json()["answer"] == "Mars."
    assert len(model.rewrites[0]["history"]) == 2
    assert model.rewrites[0]["question"] == "Which one?"
    history = client.get(f"/api/chat/{first}/messages").json()
    assert [entry["role"] for entry in history] == ["user", "assistant", "user", "assistant"]
    assert history[-1]["sources"] == events[-1]["sources"]

    result = ask(client, first, "What is the prediction error equation?")
    assert result.json()["answer"] == "Mars."
    assert len(model.rewrites) == 1
    assert not rag_service.is_named_formula_question("What is the first loss equation?")
    assert not rag_service.is_named_formula_question("What is the equation?")


def test_no_answer_and_failed_generation_leave_consistent_history(client, monkeypatch):
    sid = session(client)
    assert ask(client, sid).json()["answer"] == rag_service.NO_ANSWER
    upload(client, sid, pdf_bytes("A red kite is a bird."))

    def fail():
        raise ConnectionError("Ollama unavailable")

    monkeypatch.setattr(rag_service, "get_llm", fail)
    assert ask(client, sid).status_code == 503
    events = [json.loads(line) for line in ask(client, sid, stream=True).text.splitlines()]
    assert events == [{"type": "error", "message": events[0]["message"], "status": 503}]
    assert len(client.get(f"/api/chat/{sid}/messages").json()) == 2

    monkeypatch.setattr(rag_service, "get_llm", lambda: Model("Unsupported answer [999]."))
    answer = ask(client, sid).json()
    assert answer["answer"] == rag_service.NO_ANSWER and answer["sources"] == []


def test_account_boundaries_and_logout(isolated, monkeypatch):
    monkeypatch.setattr(auth, "AUTH_ENABLED", True)
    with TestClient(app) as alice, TestClient(app) as bob:
        assert alice.get("/api/sessions").status_code == 401
        password = "some-long-password"
        for client, username in ((alice, "Alice"), (bob, "Bob")):
            response = client.post("/api/auth/register", json={"username": username, "password": password})
            assert response.status_code == 201
            assert "httponly" in response.headers["set-cookie"].lower()
        sid = session(alice)
        doc = upload(alice, sid, pdf_bytes("Account-specific PDF.")).json()
        assert bob.get("/api/sessions").json() == []
        assert bob.get("/api/documents").json() == []
        assert bob.get(f"/api/documents?session_id={sid}").status_code == 404
        assert bob.get(document_url(doc, sid)).status_code == 404
        assert bob.delete(f'/api/documents/{doc["document_id"]}').status_code == 404
        assert bob.patch(f"/api/sessions/{sid}", json={"name": "Changed"}).status_code == 404
        assert bob.delete(f"/api/sessions/{sid}").status_code == 404
        assert bob.get(f"/api/chat/{sid}/messages").status_code == 404
        assert ask(bob, sid, stream=True).status_code == 404
        assert alice.post("/api/sessions", headers={"Origin": "https://example.org"}).status_code == 403
        old_token = alice.cookies.get(auth.COOKIE)
        assert alice.post("/api/auth/logout").status_code == 204
        assert alice.get("/api/sessions", headers={"Cookie": f"{auth.COOKIE}={old_token}"}).status_code == 401
        assert alice.post("/api/auth/login", json={"username": "ALICE", "password": password}).status_code == 200
        assert alice.get(document_url(doc, sid)).status_code == 200


def test_existing_database_migration(isolated):
    with database.engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE sessions (id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at DATETIME)"
        )
        connection.exec_driver_sql("INSERT INTO sessions (name) VALUES ('Old session')")
    with TestClient(app) as client:
        assert client.get("/api/sessions").json()[0]["name"] == "Old session"


def test_restore_overwritten_legacy_pdf_without_cross_linking(client):
    from backend.services.storage_service import upload_path
    first, second = session(client), session(client)
    alpha, beta = pdf_bytes("The first legacy file."), pdf_bytes("The other legacy file.")
    doc_a = upload(client, first, alpha).json()
    doc_b = upload(client, second, beta).json()
    path_a = upload_path(doc_a["document_uid"])
    path_b = upload_path(doc_b["document_uid"])
    path_a.unlink()
    path_b.replace(path_b.parent / "notes.pdf")
    assert client.get(document_url(doc_a, first)).status_code == 404
    assert client.get(document_url(doc_b, second)).content == beta
    assert upload(client, first, alpha).json()["document_id"] == doc_a["document_id"]
    assert client.get(document_url(doc_a, first)).content == alpha
    assert client.delete(f'/api/documents/{doc_a["document_id"]}').status_code == 200
    assert client.get(document_url(doc_b, second)).content == beta


def test_interrupted_index_deletion_is_retried_at_startup(isolated, monkeypatch):
    from backend.services import storage_service

    with TestClient(app) as client:
        sid = session(client)
        doc = upload(client, sid, pdf_bytes("An old source.")).json()
        def fail():
            raise OSError("Temporary index failure")

        with monkeypatch.context() as patch:
            patch.setattr(storage_service, "get_collection", fail)
            assert client.delete(f'/documents/{doc["document_id"]}').status_code == 200
        assert client.get(document_url(doc, sid)).status_code == 404
        assert len(vectordb_service.get_collection().get(include=[])["ids"]) == 1

    with TestClient(app) as client:
        assert client.get(document_url(doc, sid)).status_code == 404
        assert vectordb_service.get_collection().get(include=[])["ids"] == []


def test_citations_preserve_equation_indices_and_code_indentation():
    answer = (
        "Use the second value. [source:2]\n\n"
        r"\[ L(\hat{y}^{[1]}, y^{[1]}) = 0 \]" "\n\n"
        "```python\nif values:\n    print(values[1])\n```"
    )
    clean, refs = rag_service.extract_references(answer)
    assert refs == [2]
    assert clean == answer.replace(" [source:2]", "")
    assert rag_service.extract_references(r"Use \(x^{[1]}\) [2].") == (r"Use \(x^{[1]}\).", [2])



def test_answer_cut_off_by_token_limit_is_not_saved(client, monkeypatch):
    chat_id = session(client)
    assert upload(client, chat_id, pdf_bytes("Cobalt beacon on Mars.")).is_success

    def stream(_messages):
        yield AIMessageChunk(content=r"Partial equation \[", response_metadata={"done_reason": "length"})

    from types import SimpleNamespace
    monkeypatch.setattr(rag_service, "get_llm", lambda: SimpleNamespace(stream=stream))
    result = ask(client, chat_id)
    assert result.status_code == 422
    assert "length limit" in result.json()["detail"]
    assert client.get(f"/api/chat/{chat_id}/messages").json() == []
