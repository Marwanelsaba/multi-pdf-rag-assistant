import re

from langchain_text_splitters import RecursiveCharacterTextSplitter


def create_chunks(pages):
    """Prefer paragraph and sentence boundaries while keeping each chunk on one page."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=160,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
        keep_separator="end",
    )
    chunks = []
    for page in pages:
        text = re.sub(r"[ \t]{2,}", " ", page["text"])
        for part in splitter.split_text(text):
            chunks.append({"page": page["page"], "text": part})
    return chunks
