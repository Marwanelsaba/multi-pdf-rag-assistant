from functools import lru_cache

from backend.config import RERANK_MODEL
from backend.services.vectordb_service import get_vectorstore


@lru_cache(maxsize=1)
def get_reranker():
    from sentence_transformers import CrossEncoder

    return CrossEncoder(RERANK_MODEL, device="cpu")


def retrieve_chunks(query, session_id, document_uids, k=5, strategy="mmr"):
    if not document_uids:
        return []
    store = get_vectorstore()
    filters = {"$and": [{"session_id": session_id}, {"document_uid": {"$in": list(document_uids)}}]}
    if strategy == "similarity":
        results = store.similarity_search(query, k=k, filter=filters)
    else:
        results = store.max_marginal_relevance_search(
            query, k=max(k * 2, 10) if RERANK_MODEL else k, fetch_k=max(k * 4, 20),
            lambda_mult=0.75, filter=filters,
        )
        if RERANK_MODEL and results:
            scores = get_reranker().predict([(query, item.page_content) for item in results])
            results = [results[index] for index in sorted(
                range(len(results)), key=lambda index: float(scores[index]), reverse=True
            )[:k]]
    return [{"text": result.page_content, **result.metadata} for result in results]
