from backend.services.vectordb_service import get_vectorstore


vectorstore = get_vectorstore()

results = vectorstore._collection.get(
    where={
        "session_id": 1
    }
)

print("Number of chunks:", len(results["ids"]))

for metadata in results["metadatas"]:
    print(metadata)