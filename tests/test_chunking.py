from backend.services.pdf_service import extract_pages
from backend.services.chunking_service import create_chunks


PDF_PATH = "data/uploads/attpdf1.pdf"


pages = extract_pages(PDF_PATH)

chunks = create_chunks(pages)

print(f"Extracted {len(pages)} pages")
print(f"Created {len(chunks)} chunks")

for i, chunk in enumerate(chunks[:10]):
    print("\n-------------------------")
    print(f"CHUNK {i + 1}")
    print("PAGE:", chunk["page"])
    print("LENGTH:", len(chunk["text"]))
    print("TEXT:")
    print(chunk["text"][:300])