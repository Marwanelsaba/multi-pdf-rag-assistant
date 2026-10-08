from backend.services.pdf_service import extract_pages
from backend.services.chunking_service import create_chunks
from backend.services.vectordb_service import get_vectorstore


PDF_PATH = "data/uploads/attpdf1.pdf"


pages = extract_pages(PDF_PATH)

chunks = create_chunks(pages)

vectorstore = get_vectorstore()

documents = [chunk["text"] for chunk in chunks]

metadatas = [
    {
        "page": chunk["page"],
        "source": "attpdf1.pdf"
    }
    for chunk in chunks
]

vectorstore.add_texts(
    texts=documents,
    metadatas=metadatas
)

print(f"Added {len(chunks)} chunks to ChromaDB")