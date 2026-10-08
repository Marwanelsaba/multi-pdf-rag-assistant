from backend.services.retrieval_service import retrieve_chunks
from backend.services.citation_service import create_citations
from backend.services.llm_service import get_llm

NO_ANSWER = "I could not find the answer in the provided documents."


def ask_question(question, session_id, chat_history=None, k=5):
    retrieval_query = question

    if chat_history:
        history_text = "\n".join(
            f"{message['role'].upper()}: {message['content']}"
            for message in chat_history
        )

        rewrite_prompt = f"""
Rewrite the user's latest question into a clear standalone question
that can be used to search the provided documents.

Use the conversation history only to resolve references such as:
"it", "they", "he", "she", "that", or "which one".

Do not answer the question.
Return ONLY the rewritten question.

CONVERSATION HISTORY:
{history_text}

LATEST USER QUESTION:
{question}

REWRITTEN QUESTION:
"""

        rewrite_response = get_llm().invoke(rewrite_prompt)
        retrieval_query = rewrite_response.content.strip()

    chunks = retrieve_chunks(
        query=retrieval_query,
        session_id=session_id,
        k=k
    )

    if not chunks:
        return {
            "answer": NO_ANSWER,
            "sources": []
        }

    context_parts = []

    for chunk in chunks:
        context_parts.append(
            f"[Source: {chunk['source']}, Page: {chunk['page']}]\n"
            f"{chunk['text']}"
        )

    context = "\n\n".join(context_parts)

    history_text = ""

    if chat_history:
        history_parts = []

        for message in chat_history:
            history_parts.append(
                f"{message['role'].upper()}: {message['content']}"
            )

        history_text = "\n".join(history_parts)

    prompt = f"""
You are a document question-answering assistant.

Your job is to answer the user's question using ONLY the information
contained in the provided document context.

You may use the conversation history to understand what the user
is referring to, but the actual answer must be supported by the
provided document context.

Rules:

1. Do not use outside knowledge.
2. Do not invent facts.
3. If the context does not contain enough information to answer the
   question, respond exactly with:

{NO_ANSWER}

4. Only answer what can be supported by the documents.
5. Keep the answer clear and concise.
6. Do not mention information that is not supported by the documents.

CONVERSATION HISTORY:
{history_text}

DOCUMENT CONTEXT:
{context}

USER QUESTION:
{question}

ANSWER:
"""

    llm = get_llm()

    response = llm.invoke(prompt)

    answer = response.content.strip()

    if answer == NO_ANSWER:
        return {
            "answer": NO_ANSWER,
            "sources": []
        }

    citations = create_citations(chunks)

    return {
        "answer": answer,
        "sources": citations
    }