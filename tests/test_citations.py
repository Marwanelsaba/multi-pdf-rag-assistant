from backend.services.citation_service import create_citations


chunks = [
    {
        "text": "TCP is a transport protocol...",
        "source": "Networks.pdf",
        "page": 17
    },
    {
        "text": "TCP provides reliable delivery...",
        "source": "Networks.pdf",
        "page": 17
    },
    {
        "text": "TCP uses a connection...",
        "source": "Networks.pdf",
        "page": 18
    },
    {
        "text": "Operating systems manage resources...",
        "source": "OS.pdf",
        "page": 132
    }
]


citations = create_citations(chunks)

print("Citations:")

for citation in citations:
    print(
        f"- {citation['file']} "
        f"(Page {citation['page']})"
    )