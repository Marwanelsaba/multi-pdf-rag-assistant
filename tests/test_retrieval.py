from backend.services.retrieval_service import retrieve_chunks


queries = [
    "What is the Transformer architecture?",
    "How does scaled dot-product attention work?",
    "Why does the Transformer use multi-head attention?",
    "What datasets were used to evaluate the Transformer?"
]


for query in queries:

    print("\n========================================")
    print("QUESTION:", query)
    print("========================================")

    results = retrieve_chunks(query, k=3)

    for i, result in enumerate(results):

        print(f"\n--- RESULT {i + 1} ---")
        print("SOURCE:", result["source"])
        print("PAGE:", result["page"])
        print("TEXT:")
        print(result["text"][:500])