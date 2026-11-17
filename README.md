# Multi-PDF RAG Assistant v1.0.3

Ask questions about multiple PDFs in a local workspace. Completed answers appear in the conversation, and source chips open the cited pages in a PDF viewer with page navigation and zoom. Sessions, uploaded documents, and chat history are stored on your machine.

## Run with Docker Compose

Run this command from the extracted project directory.

```bash
docker compose up --build
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Compose starts Ollama, downloads Qwen 2.5 7B into its model volume, and serves the application on the loopback address. The first PDF upload downloads the embedding model and indexes its text. Compose keeps uploads, chat history, and model caches in named volumes. Use `docker compose down` to stop the services while keeping the volumes.

## Run on Windows

Install Python 3.12 and [Ollama](https://ollama.com). Start Ollama and open PowerShell in the extracted `multi-pdf-rag` folder, where `requirements.txt` and `backend` are located.

```powershell
ollama pull qwen2.5:7b
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app
```

Leave PowerShell running and open [http://127.0.0.1:8000](http://127.0.0.1:8000). The ZIP includes the compiled frontend. For a source checkout, build it with Node.js 24 using `npm ci` and `npm run build` before starting the API. If Ollama cannot connect, start its Windows app and check it with `ollama list`.

## Run on macOS or Linux

Install Python 3.12, Node.js 24, and Ollama, then run the following commands.

```bash
ollama pull qwen2.5:7b
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm ci
npm run build
python -m uvicorn backend.main:app
```

For frontend development, start the API with `python -m uvicorn backend.main:app --reload`, then run `npm run dev` from the project root in a second terminal. Open [http://localhost:5173](http://localhost:5173). Swagger UI is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Use the workspace

1. Select **New chat**. The workspace can name a new chat from its first question.
2. Select or drop one or more text-based PDFs into the upload area. Files can be up to 50 MiB each. Run OCR before importing image-only scans.
3. Ask a question. A progress indicator stays visible until the formatted answer is ready. Equations, Markdown tables, and code render inline in the conversation. Ask a follow-up to use the recent conversation as context. If the retrieved text cannot support an answer, the assistant returns “I could not find the answer in the provided documents.”
4. Select a citation to inspect its page, zoom, browse nearby pages, or open the original PDF in another tab.
5. Manage chat sessions in the sidebar and remove individual documents from the dashboard.

## Configuration

Set these environment variables before starting the API. For Compose, put the variables exposed in `compose.yaml` in a project-root `.env` file or export them to the shell.

| Variable | Default | Purpose |
|---|---|---|
| `RAG_DATA_DIR` | `./data` under project root | Directory for the SQLite database, uploaded PDFs, and Chroma index |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama service endpoint |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Installed Ollama model for generation and query rewriting |
| `RAG_EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Local embedding model, or its downloaded directory |
| `RAG_RERANK_MODEL` | empty | Optional local CrossEncoder model, for example `cross-encoder/ms-marco-MiniLM-L6-v2` |
| `RAG_AUTH_ENABLED` | `0` | Set to `1` to require an account and isolate each user's workspace |
| `RAG_ALLOW_REGISTRATION` | `1` | Set to `0` after provisioning accounts to close registration |
| `RAG_SECURE_COOKIE` | `0` | Set to `1` when the app is served over HTTPS |
| `RAG_PORT` | `8000` | Compose host port |

Changing the embedding model requires reindexing documents into a fresh data directory. Older and newer documents can coexist on the default embedding model. PDF extraction keeps each chunk on one physical page and prefers paragraph and sentence boundaries. Retrieval uses maximal marginal relevance within the active session, with optional CrossEncoder reranking. The model supplies passage markers and the API verifies that those markers identify passages it received. Check cited pages when using an answer for important work.

## Upgrade an existing workspace

With the previous app stopped, back up and copy its entire `data/` folder into the extracted directory, or point `RAG_DATA_DIR` to that folder. SQLite adds the account ownership column at startup. If a previous version overwrote a PDF with a different file of the same name, re-upload the original into its session to restore the preview. The app checks the legacy file's hash before serving it.

For account mode, enable `RAG_AUTH_ENABLED=1` and create your account in the app. Then assign the pre-existing local sessions to that account.

```bash
python -m scripts.claim_local_sessions your_username
```

Use the project virtual environment and the same data directory as the app. With Compose, run `docker compose exec app python -m scripts.claim_local_sessions your_username`. The command assigns every previously unowned session in that database to the specified account.

## API

The UI uses the `/api` prefix. Direct API clients can also use these paths without the prefix.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check that the API is running |
| GET | `/auth/status` | Check account mode and current sign-in |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Manage a browser session |
| GET / POST | `/sessions` | List sessions or create one with optional `?name=New+Chat` |
| PATCH / DELETE | `/sessions/{id}` | Rename with `{"name":"New name"}` or delete |
| POST | `/upload?session_id={id}` | Upload multipart field `file` |
| GET | `/documents` | List documents, optionally filtered by `session_id` |
| GET / HEAD | `/documents/{id}/file?session_id={id}` | Serve an original PDF |
| DELETE | `/documents/{id}` | Delete a document and its index entries |
| POST | `/chat` | Return a full answer |
| POST | `/chat/stream` | Stream newline-delimited JSON events |
| GET | `/chat/{id}/messages` | Retrieve persisted chat messages and citations |

Both chat endpoints take `{"question":"What is the main result?","session_id":1}`. The streaming endpoint emits `delta` events with a `text` field and ends with a `result` containing the answer, sources, and persisted message IDs. An interrupted or rejected operation may end with an `error` event instead.

## Tests and retrieval benchmark

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
npm run lint
npm run build
python -m scripts.evaluate_retrieval --k 3
```

The automated API suite uses real PDFs, SQLite, and Chroma with deterministic embeddings and scripted generation. It exercises upload, isolation, streaming, ownership, citation persistence, error handling, and migration. The retrieval benchmark uses the configured embedding model on seven page-labeled questions. It prints hit rate, mean reciprocal rank, and mean latency for similarity and MMR. Use `--output results.json` to retain the detailed results.

To verify generation with your own Ollama instance, upload a two-page PDF containing different facts on each page. Ask for one fact, open the citation, and verify that it reaches the expected page. Ask a follow-up and refresh the chat to verify persistence.

## Deployment and limits

The application runs as a single API worker with local SQLite and Chroma storage. The default configuration binds to loopback. Multi-user mode is intended for a private deployment. For HTTPS access behind a reverse proxy, preserve the browser's Host header, disable response buffering for `/api/chat/stream`, and enable secure cookies. The initial model downloads require internet access. Once the models are cached, inference and retrieval use the local runtime. The speed of generation depends on the machine and selected model.

Released under the [MIT License](LICENSE).
