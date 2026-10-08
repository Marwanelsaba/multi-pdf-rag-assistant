from backend.services.pdf_service import extract_pages


PDF_PATH = "data/uploads/attpdf1.pdf"


pages = extract_pages(PDF_PATH)

print(f"Extracted {len(pages)} pages")

for page in pages[:3]:
    print("\nPAGE:", page["page"])
    print(page["text"][:300])