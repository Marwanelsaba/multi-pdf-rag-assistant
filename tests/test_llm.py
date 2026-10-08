from backend.services.llm_service import get_llm


llm = get_llm()


context = """
The Transformer is a model architecture based entirely on attention
mechanisms. It eliminates recurrence and convolutions and uses
self-attention to draw global dependencies between input and output.

The Transformer allows for significantly more parallelization and can
reach strong results in sequence transduction tasks.
"""


question = "What is the Transformer architecture?"


prompt = f"""
You are a helpful document assistant.

Answer the user's question using ONLY the provided context.

If the answer is not contained in the context, say:
"I could not find the answer in the provided documents."

Do not use outside knowledge.

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:
"""


response = llm.invoke(prompt)


print("QUESTION:")
print(question)

print("\nANSWER:")
print(response.content)
