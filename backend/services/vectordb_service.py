from pathlib import Path

from langchain_chroma import Chroma

from backend.services.embedding_service import get_embedding_model


CHROMA_PATH = "data/chroma"


def get_vectorstore():
    """
    Load or create the ChromaDB vector store.
    """

    Path(CHROMA_PATH).mkdir(parents=True, exist_ok=True)

    embeddings = get_embedding_model()

    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings
    )

    return vectorstore