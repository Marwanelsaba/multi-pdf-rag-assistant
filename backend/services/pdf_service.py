from pypdf import PdfReader


def extract_pages(pdf_path: str):
    """Extract readable text with one-based physical page numbers."""
    with open(pdf_path, "rb") as file:
        reader = PdfReader(file)
        if reader.is_encrypted and not reader.decrypt(""):
            raise ValueError("The PDF is password-protected.")
        pages = []
        for number, page in enumerate(reader.pages, start=1):
            text = ""
            if "/Contents" in page:
                text = page.extract_text(extraction_mode="layout")
                if not text.strip():
                    text = page.extract_text()
            pages.append({"page": number, "text": text})
        return pages
