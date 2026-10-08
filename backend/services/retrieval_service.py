from backend.services.vectordb_service import get_vectorstore


def retrieve_chunks(query, session_id, k=5):
    vectorstore = get_vectorstore()

    results = vectorstore.similarity_search(
        query,
        k=k,
        filter={"session_id": session_id}
    )

    chunks = []

    for result in results:
        chunks.append({
            "text": result.page_content,
            "page": result.metadata.get("page"),
            "source": result.metadata.get("source"),
            "document_id": result.metadata.get("document_id"),
            "document_uid": result.metadata.get("document_uid"),
            "session_id": result.metadata.get("session_id")
        })

    return chunks