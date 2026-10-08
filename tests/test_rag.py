from backend.services.rag_service import ask_question


questions = [
    "What is the Transformer architecture?",
    "How does scaled dot-product attention work?",
    "Why does the Transformer use multi-head attention?",
    "What datasets were used to evaluate the Transformer?"
]


for question in questions:

    print("\n")
    print("=" * 60)
    print("QUESTION:", question)
    print("=" * 60)

    result = ask_question(question)

    print("\nANSWER:")
    print(result["answer"])

    print("\nSOURCES:")

    for source in result["sources"]:
        print(
            f"- {source['file']} "
            f"(Page {source['page']})"
        )