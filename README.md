# Multi-PDF RAG Assistant

A local AI document assistant that lets users create isolated chat sessions, upload multiple PDF documents, ask questions about their contents, and receive grounded answers with file and page-level citations.

The application combines a React frontend with a FastAPI backend, ChromaDB for vector search, SentenceTransformers for embeddings, and a local Qwen 2.5 7B model running through Ollama.

---

## Features

- Upload multiple PDF documents
- Create independent chat sessions
- Session-based document isolation
- PDF page extraction
- Recursive text chunking
- Local semantic embeddings
- Persistent ChromaDB vector storage
- Retrieval-Augmented Generation (RAG)
- Local Qwen 2.5 7B inference through Ollama
- No-answer fallback when documents do not support a question
- Multi-turn conversation history
- Query rewriting for follow-up questions
- Persistent chat history with SQLite
- File and page-level citations
- Interactive citation chips
- PDF source preview inside the application
- Open cited PDF pages in a new browser tab
- Session deletion
- Document deletion
- Duplicate PDF detection within a session
- Automatic session naming
- Dark desktop-oriented document workspace
- Responsive React interface

---

## Architecture

```mermaid
flowchart LR
    U[User]

    FE[React + Vite Frontend]
    API[FastAPI Backend]

    PDF[PDF Processing]
    CHUNK[Text Chunking]
    EMB[SentenceTransformers Embeddings]
    DB[(ChromaDB)]
    SQLITE[(SQLite)]

    RET[Semantic Retrieval]
    RW[Query Rewriting]
    LLM[Qwen 2.5 7B via Ollama]
    CIT[File + Page Citations]

    U --> FE
    FE --> API

    API --> PDF
    PDF --> CHUNK
    CHUNK --> EMB
    EMB --> DB

    API --> RW
    RW --> RET
    RET --> DB
    RET --> LLM

    LLM --> CIT
    CIT --> FE

    API --> SQLITE

RAG Pipeline
The application follows a document-grounded RAG workflow:
PDF Upload
    ↓
Page Extraction
    ↓
Recursive Chunking
    ↓
SentenceTransformer Embeddings
    ↓
ChromaDB
    ↓
Semantic Retrieval
    ↓
Optional Query Rewriting
    ↓
Relevant Document Context
    ↓
Qwen 2.5 7B
    ↓
Grounded Answer
    ↓
File + Page Citations

1. PDF ingestion
Uploaded PDFs are processed page by page using PyPDFLoader.
Page numbers are preserved as metadata so retrieved chunks can later be associated with their source page.
2. Chunking
Document text is split using RecursiveCharacterTextSplitter.
Current configuration:
- Chunk size: 1000
- Chunk overlap: 200
3. Embeddings
The project uses:
sentence-transformers/all-MiniLM-L6-v2

Embeddings are generated locally and stored in ChromaDB.
4. Vector storage and retrieval
ChromaDB stores document chunks together with metadata such as:
- source filename
- page number
- document ID
- document UID
- session ID
Semantic similarity search retrieves the most relevant chunks for a question.
5. Session isolation
Every document chunk is associated with a session_id.
Retrieval is filtered by the active session, preventing documents from another conversation from being included in the RAG context.
This allows the same PDF to exist in different sessions without mixing their retrieval results.
6. Query rewriting
For multi-turn conversations, the system can rewrite follow-up questions into standalone retrieval queries.
For example:
User:
What programming languages does Marwan know?

User:
Which one is listed first?

The second question can be rewritten into a standalone retrieval query using the conversation history.
The rewritten question is used for retrieval, while the final answer must still be supported by the retrieved document context.
7. Local generation
The retrieved context is passed to:
Qwen 2.5 7B

running locally through Ollama.
The model is instructed to answer only from the supplied document context.
When the required information cannot be supported by the documents, the system returns:
I could not find the answer in the provided documents.

8. Citations
Successful answers can include citations such as:
attpdf1.pdf · Page 3

Citations are persisted with chat messages and can be opened through the frontend source viewer.
Technology Stack
Backend
Technology	Purpose
Python	Backend language
FastAPI	REST API
LangChain	Document/RAG orchestration
PyPDFLoader	PDF extraction
RecursiveCharacterTextSplitter	Chunking
SentenceTransformers	Embeddings
ChromaDB	Vector database
Ollama	Local model runtime
Qwen 2.5 7B	Local LLM
SQLite	Application metadata and chat persistence
SQLAlchemy	Database ORM


Frontend
Technology	Purpose
React	Frontend framework
Vite	Development/build tooling
Material UI	UI components and theming
React Router	Client-side routing


Project Structure
multi-pdf-rag-assistant/
│
├── app/
│   └── rag.py
│
├── backend/
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   │
│   ├── models/
│   │   ├── chat.py
│   │   ├── document.py
│   │   └── session.py
│   │
│   ├── routers/
│   │   ├── chat.py
│   │   ├── documents.py
│   │   ├── sessions.py
│   │   └── upload.py
│   │
│   ├── services/
│   │   ├── chunking_service.py
│   │   ├── citation_service.py
│   │   ├── embedding_service.py
│   │   ├── llm_service.py
│   │   ├── pdf_service.py
│   │   ├── rag_service.py
│   │   ├── retrieval_service.py
│   │   └── vectordb_service.py
│   │
│   └── utils/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── theme/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
│
├── tests/
│   ├── test_chunking.py
│   ├── test_citations.py
│   ├── test_embedding.py
│   ├── test_llm.py
│   ├── test_pdf.py
│   ├── test_rag.py
│   ├── test_retrieval.py
│   ├── test_session_vectors.py
│   └── test_vectordb.py
│
├── requirements.txt
├── .gitignore
└── LICENSE

Local runtime data
The application creates local runtime data under:
data/
├── uploads/
├── chroma/
└── metadata/

These files are intentionally excluded from version control.
API Overview
Health
GET /health

Sessions
Create a session:
POST /sessions?name=New%20Chat

Get sessions:
GET /sessions

Rename a session:
PATCH /sessions/{session_id}

Example body:
{
  "name": "Transformer Architecture"
}

Delete a session:
DELETE /sessions/{session_id}

Documents
Get documents:
GET /documents

Delete a document:
DELETE /documents/{document_id}

Serve a document PDF for source preview:
GET /documents/{document_id}/file?session_id={session_id}

Upload
Upload a PDF to a session:
POST /upload?session_id={session_id}

The PDF is sent as multipart form data using the field:
file

Chat
Send a question:
POST /chat

Example:
{
  "question": "What architecture does the paper introduce?",
  "session_id": 5
}

Example response structure:
{
  "answer": "The paper introduces the Transformer architecture...",
  "sources": [
    {
      "file": "attpdf1.pdf",
      "page": 3
    }
  ],
  "session_id": 5,
  "user_message_id": 10,
  "assistant_message_id": 11
}

Get conversation history:
GET /chat/{session_id}/messages

Running Locally
Prerequisites
Install:
- Python
- Node.js and npm
- Ollama
Pull the local Qwen model:
ollama pull qwen2.5:7b

Backend Setup
From the project root:
Windows PowerShell
Create and activate the virtual environment:
python -m venv venv
.\venv\Scripts\Activate.ps1

Install Python dependencies:
python -m pip install -r requirements.txt

Start FastAPI:
python -m uvicorn backend.main:app --reload

The API will be available at:
http://127.0.0.1:8000

Swagger documentation:
http://127.0.0.1:8000/docs

Frontend Setup
Open a second terminal:
cd frontend

Install dependencies:
npm install

Start the Vite development server:
npm run dev

The frontend will be available at:
http://localhost:5173

The Vite development server proxies /api requests to the FastAPI backend.
Example Usage
A typical workflow looks like this:
1. Open the dashboard
        ↓
2. Create a new chat session
        ↓
3. Upload one or more PDFs
        ↓
4. PDFs are extracted, chunked, embedded, and indexed
        ↓
5. Ask a question
        ↓
6. Relevant document chunks are retrieved
        ↓
7. Qwen generates a grounded answer
        ↓
8. File/page citations are displayed
        ↓
9. Click a citation
        ↓
10. Inspect the cited PDF page

Session Isolation
Documents are scoped to their chat session.
Each indexed chunk contains session metadata, and retrieval filters results using the active session_id.
For example:
Session 5
├── Marwan_cv.pdf
└── attpdf1.pdf

Session 6
└── No documents

A question in Session 6 cannot retrieve the documents belonging to Session 5.
This design also allows the same PDF file to be uploaded into different sessions without mixing their vector search results.
Citation System
The application preserves source information through the RAG pipeline.
An answer can return:
{
  "file": "attpdf1.pdf",
  "page": 3
}

The frontend renders citations as clickable chips.
Clicking a citation opens a source drawer containing:
- document filename
- cited page
- PDF preview
The application also provides an option to open the cited PDF in a new browser tab.
Design Decisions
Why ChromaDB?
ChromaDB provides persistent local vector storage and simple similarity retrieval without requiring a hosted vector database.
Why SentenceTransformers?
SentenceTransformers provides a lightweight local embedding model suitable for semantic search without an external embedding API.
Why Ollama + Qwen?
Running Qwen locally keeps inference inside the local development environment and avoids dependence on a cloud LLM API.
Why SQLite?
SQLite is sufficient for persisting application metadata, sessions, documents, and chat history while keeping the project simple to run locally.
Why FastAPI?
FastAPI provides a lightweight API layer connecting the React frontend to the document-processing and RAG services.
Why React?
React provides a flexible frontend for managing chat sessions, document uploads, conversation history, citations, and the document workspace.
Testing
The repository contains tests covering core components including:
- PDF processing
- chunking
- embeddings
- retrieval
- citations
- RAG behavior
- session/vector relationships
- vector database functionality
- LLM integration
The tests/ directory contains the current automated test suite.
Limitations
The current project is primarily designed as a local AI/RAG application.
Current limitations include:
- Local Qwen inference can be slower than hosted model APIs depending on available hardware.
- The current chat implementation does not use token streaming.
- PDF previews rely on the browser's native PDF viewer.
- There is currently no authentication or multi-user account system.
- The application has not been deployed as a production hosted service.
- Retrieval quality depends on the selected embedding model, chunking strategy, and retrieved context.
Future Improvements
Potential future work includes:
- Streaming LLM responses
- Improved retrieval strategies such as MMR
- Retrieval evaluation and benchmarking
- Optional reranking
- More advanced chunking strategies
- Expanded automated testing
- Improved backend reliability and cleanup
- Docker-based deployment
- Authentication and multi-user support
- More advanced document preview functionality
These are future improvements and are not represented as completed features.
Screenshots
Dashboard
Add a screenshot here:
docs/screenshots/dashboard.png

Example Markdown:
![Dashboard](docs/screenshots/dashboard.png)

Chat
Add a screenshot here:
docs/screenshots/chat.png

Example:
![Chat](docs/screenshots/chat.png)

Citation Preview
Add a screenshot here:
docs/screenshots/citation-preview.png

Example:
![Citation Preview](docs/screenshots/citation-preview.png)

What This Project Demonstrates
This project demonstrates practical implementation of:
- Retrieval-Augmented Generation
- Semantic vector search
- Local LLM inference
- Embedding-based document retrieval
- FastAPI backend architecture
- React frontend development
- Persistent application state
- Session-aware retrieval
- Multi-document question answering
- Source attribution and page-level citations
- Local AI application design
License
This project is licensed under the MIT License.
See LICENSE for details.

### Before pushing the README

One thing I would **not** do yet is add fake screenshots. We have the real dashboard, chat, and citation-preview screenshots from your development work, so later we can save those actual screenshots into:

```text
docs/screenshots/
