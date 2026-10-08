from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma


PDF_PATH = "data/documents/attpdf1.pdf"
CHROMA_PATH = "data/chroma"


# 1. Load PDF
loader = PyPDFLoader(PDF_PATH)
documents = loader.load()

print(f"Loaded {len(documents)} pages")


# 2. Split documents into chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)

chunks = splitter.split_documents(documents)

print(f"Created {len(chunks)} chunks")


# Check chunk sizes
for i, chunk in enumerate(chunks[:10]):
    print(
        f"Chunk {i}: "
        f"{len(chunk.page_content)} characters | "
        f"Page {chunk.metadata.get('page')}"
    )


# 3. Create embeddings
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

print("Embedding model loaded")


# 4. Store chunks in ChromaDB
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory=CHROMA_PATH
)

print("Documents stored in ChromaDB")


# 5. Test questions
queries = [
    "What is the Transformer architecture?",
    "How does scaled dot-product attention work?",
    "Why does the Transformer use multi-head attention?",
    "What datasets were used to evaluate the Transformer?"
]


# 6. Test retrieval
for query in queries:

    print("\n\n========================================")
    print("QUESTION:", query)
    print("========================================")


    # Similarity Search
    print("\n---------- SIMILARITY SEARCH ----------")

    similarity_results = vectorstore.similarity_search(
        query,
        k=3
    )

    for i, result in enumerate(similarity_results):
        print(f"\n--- RESULT {i + 1} ---")
        print(result.page_content[:700])
        print("PAGE:", result.metadata.get("page"))


    # MMR Search
    print("\n---------- MMR SEARCH ----------")

    mmr_results = vectorstore.max_marginal_relevance_search(
        query,
        k=3,
        fetch_k=10
    )

    for i, result in enumerate(mmr_results):
        print(f"\n--- RESULT {i + 1} ---")
        print(result.page_content[:700])
        print("PAGE:", result.metadata.get("page"))