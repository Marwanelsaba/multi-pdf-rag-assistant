def create_citations(chunks):
    """
    Create a clean list of sources from retrieved chunks.

    Removes duplicate document/page combinations and includes the
    document ID required by the source-preview endpoint.
    """

    citations = []
    seen = set()

    for chunk in chunks:
        source = chunk.get("source")
        page = chunk.get("page")
        document_id = chunk.get("document_id")

        citation_key = (document_id, page)

        if citation_key in seen:
            continue

        seen.add(citation_key)

        citations.append(
            {
                "file": source,
                "page": page,
                "document_id": document_id,
            }
        )

    return citations