from functools import lru_cache

from langchain_ollama import ChatOllama


MODEL_NAME = "qwen2.5:7b"


@lru_cache(maxsize=1)
def get_llm():
    """
    Create the LLM once and reuse it.
    """

    return ChatOllama(
        model=MODEL_NAME,
        temperature=0
    )