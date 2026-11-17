from functools import lru_cache

from langchain_ollama import ChatOllama

from backend.config import OLLAMA_MODEL, OLLAMA_URL


@lru_cache(maxsize=1)
def get_llm():
    return ChatOllama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_URL,
        temperature=0,
        num_ctx=4096,
        num_predict=768,
        client_kwargs={"timeout": 600.0, "trust_env": False},
        validate_model_on_init=False,
    )
