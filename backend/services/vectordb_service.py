from functools import lru_cache

import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma

from backend.config import CHROMA_DIR
from backend.services.embedding_service import get_embedding_model

COLLECTION_NAME = "langchain"


@lru_cache(maxsize=1)
def get_chroma_client():
    return chromadb.PersistentClient(path=str(CHROMA_DIR), settings=Settings(anonymized_telemetry=False))


def get_collection():
    return get_chroma_client().get_or_create_collection(COLLECTION_NAME, embedding_function=None)


def get_vectorstore():
    return Chroma(
        client=get_chroma_client(),
        collection_name=COLLECTION_NAME,
        embedding_function=get_embedding_model(),
    )
