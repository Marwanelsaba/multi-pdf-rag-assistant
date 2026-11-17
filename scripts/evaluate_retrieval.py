"""Compare similarity and MMR retrieval on a small, page-labeled fixture corpus."""
import argparse
import json
import os
import tempfile
from pathlib import Path
from time import perf_counter

CORPUS = {
    "observatory.pdf": [
        "Staff access the observatory through the north gate. The gate closes at midnight.",
        "The observatory's primary telescope uses a 2.4-meter mirror for infrared imaging.",
        "The observation room has a whiteboard and two visitor chairs.",
    ],
    "greenhouse.pdf": [
        "The greenhouse irrigation system runs every four hours during the summer.",
        "Tomatoes thrive at temperatures between 21 and 27 degrees Celsius.",
        "The greenhouse is located next to the visitor entrance.",
    ],
    "transit.pdf": [
        "The last ferry to Alder Island leaves Pier 3 at 8:45 p.m.",
        "The shuttle from the terminal costs six dollars per adult.",
        "For a bicycle permit, travelers should fill in a paper form at the station.",
    ],
}
QUESTIONS = [
    ("What size is the observatory's primary mirror?", "observatory.pdf", 2),
    ("Where do staff enter the observatory?", "observatory.pdf", 1),
    ("How often are the plants watered in summer?", "greenhouse.pdf", 1),
    ("What is the recommended temperature for tomatoes?", "greenhouse.pdf", 2),
    ("When is the final ferry to Alder Island?", "transit.pdf", 1),
    ("How much does the terminal shuttle cost?", "transit.pdf", 2),
    ("How can I apply for a bicycle permit?", "transit.pdf", 3),
]


def evaluate(workspace, k):
    os.environ["RAG_DATA_DIR"] = workspace
    from fastapi.testclient import TestClient

    from backend.main import app
    from backend.services.retrieval_service import retrieve_chunks
    from scripts.pdf_fixture import pdf_bytes

    with TestClient(app) as client:
        session = client.post("/sessions").json()["id"]
        uids = []
        for name, pages in CORPUS.items():
            response = client.post(
                f"/upload?session_id={session}", files={"file": (name, pdf_bytes(*pages), "application/pdf")}
            )
            response.raise_for_status()
            uids.append(response.json()["document_uid"])

        results = {}
        for strategy in ("similarity", "mmr"):
            scores = []
            for question, file, page in QUESTIONS:
                start = perf_counter()
                chunks = retrieve_chunks(question, session, uids, k=k, strategy=strategy)
                elapsed_ms = (perf_counter() - start) * 1000
                rank = next((
                    index for index, chunk in enumerate(chunks, 1)
                    if (chunk["source"], chunk["page"]) == (file, page)
                ), None)
                scores.append({"question": question, "expected": f"{file} p.{page}", "rank": rank, "ms": round(elapsed_ms, 2)})
            results[strategy] = {
                f"hit_at_{k}": round(sum(row["rank"] is not None for row in scores) / len(scores), 3),
                "mrr": round(sum(1 / row["rank"] for row in scores if row["rank"]) / len(scores), 3),
                "mean_ms": round(sum(row["ms"] for row in scores) / len(scores), 2),
                "cases": scores,
            }
        return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--k", type=int, choices=range(1, 10), default=3)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as workspace:
        results = evaluate(workspace, args.k)
    report = json.dumps(results, indent=2)
    if args.output:
        args.output.write_text(report + "\n", encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
