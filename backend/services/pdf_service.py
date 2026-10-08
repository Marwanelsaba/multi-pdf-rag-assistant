from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader


def extract_pages(pdf_path: str):
    """
    Extract text from a PDF while preserving page information.
    """

    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    loader = PyPDFLoader(str(path))

    documents = loader.load()

    pages = []

    for document in documents:
        pages.append(
            {
                "page": document.metadata.get("page", 0) + 1,
                "text": document.page_content,
            }
        )

    return pages