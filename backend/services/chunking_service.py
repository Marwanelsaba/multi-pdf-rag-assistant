from langchain_text_splitters import RecursiveCharacterTextSplitter


def create_chunks(pages):
    """
    Split extracted PDF pages into smaller chunks
    while preserving page information.
    """

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = []

    for page in pages:
        page_documents = splitter.create_documents(
            [page["text"]],
            metadatas=[
                {
                    "page": page["page"]
                }
            ]
        )

        for document in page_documents:
            chunks.append(
                {
                    "text": document.page_content,
                    "page": document.metadata["page"]
                }
            )

    return chunks