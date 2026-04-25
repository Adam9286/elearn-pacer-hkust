"""Run a bounded smoke evaluation of the live chat retrieval workflow.

This is deliberately small and stable so we do not drift into endless manual
threshold tuning. Use it after retrieval changes to confirm routing behavior.

Required env vars:
- N8N_CHAT_WEBHOOK_URL (optional; defaults to production chat webhook)

Usage:
  python scripts/evaluate_chat_retrieval.py
"""

import json
import os
import sys
import urllib.request


WEBHOOK_URL = os.environ.get(
    "N8N_CHAT_WEBHOOK_URL",
    "https://n8n.learningpacer.org/webhook/6f2a40a0-765a-44f0-a012-b24f418869bb",
)

SMOKE_QUERIES = [
    ("casual", "hi"),
    ("casual", "thanks"),
    ("lecture_first", "What is TCP slow start?"),
    ("lecture_first", "Compare Go-Back-N and Selective Repeat."),
    ("lecture_first", "What is the difference between flow control and congestion control?"),
    ("fallback_ok", "Explain TCP fast recovery."),
    ("fallback_ok", "What is the bandwidth-delay product?"),
    ("textbook_fallback", "Explain HTTP cookies."),
]

EXPECTATIONS = {
    "casual": {
        "used_lecture_rag": False,
        "used_textbook_rag": False,
        "min_retrieved_count": 0,
    },
    "lecture_first": {
        "used_lecture_rag": True,
        "min_retrieved_count": 2,
    },
    # These do not have to hit the textbook specifically, but they should
    # retrieve grounding from at least one course source. Otherwise the
    # fallback branch is not earning its keep.
    "fallback_ok": {
        "min_retrieved_count": 1,
        "requires_any_rag": True,
    },
    "textbook_fallback": {
        "used_textbook_rag": True,
        "min_retrieved_count": 1,
    },
}


def call_webhook(query: str) -> dict:
    payload = {
        "query": query,
        "sessionId": "phase2-eval",
        "mode": "auto",
        "responseStyle": "full_explanation",
    }
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        WEBHOOK_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def summarize(query_type: str, query: str, payload: dict) -> dict:
    trace = payload.get("trace") or {}
    materials = payload.get("retrieved_materials") or []
    answer_raw = payload.get("answer")

    title = None
    if isinstance(answer_raw, str):
        try:
            title = json.loads(answer_raw).get("title")
        except Exception:
            title = None

    return {
        "bucket": query_type,
        "query": query,
        "title": title,
        "route": trace.get("route"),
        "response_style": trace.get("response_style"),
        "used_lecture_rag": trace.get("used_lecture_rag"),
        "used_textbook_rag": trace.get("used_textbook_rag"),
        "retrieved_count": trace.get("retrieved_count"),
        "material_sources": [m.get("source_type") for m in materials],
    }


def validate(summary: dict) -> list[str]:
    bucket = summary["bucket"]
    rules = EXPECTATIONS[bucket]
    issues = []

    if "used_lecture_rag" in rules and summary["used_lecture_rag"] != rules["used_lecture_rag"]:
        issues.append(
            f"expected used_lecture_rag={rules['used_lecture_rag']}, got {summary['used_lecture_rag']}"
        )

    if "used_textbook_rag" in rules and summary["used_textbook_rag"] != rules["used_textbook_rag"]:
        issues.append(
            f"expected used_textbook_rag={rules['used_textbook_rag']}, got {summary['used_textbook_rag']}"
        )

    min_retrieved = rules.get("min_retrieved_count")
    if min_retrieved is not None and (summary["retrieved_count"] or 0) < min_retrieved:
        issues.append(
            f"expected retrieved_count>={min_retrieved}, got {summary['retrieved_count']}"
        )

    if rules.get("requires_any_rag") and not (
        summary["used_lecture_rag"] or summary["used_textbook_rag"]
    ):
        issues.append("expected at least one retrieval source to be used")

    return issues


def main() -> int:
    results = []
    failures = []
    expectation_failures = []

    for bucket, query in SMOKE_QUERIES:
        try:
            payload = call_webhook(query)
            summary = summarize(bucket, query, payload)
            results.append(summary)
            issues = validate(summary)
            if issues:
                expectation_failures.append(
                    {"query": query, "bucket": bucket, "issues": issues}
                )
        except Exception as exc:
            failures.append({"query": query, "error": str(exc)})

    print(
        json.dumps(
            {
                "results": results,
                "failures": failures,
                "expectation_failures": expectation_failures,
            },
            indent=2,
        )
    )
    return 1 if failures or expectation_failures else 0


if __name__ == "__main__":
    sys.exit(main())
