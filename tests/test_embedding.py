from backend.services.embedding_service import get_embedding_model


embeddings = get_embedding_model()

text = "The Transformer uses attention mechanisms."

vector = embeddings.embed_query(text)

print("Embedding model loaded successfully")
print("Vector length:", len(vector))
print("First 10 values:", vector[:10])