"""Run a bounded smoke evaluation of chat answer clarity and compactness.

This gate checks the live chat webhook with a fixed prompt set and validates
high-signal structure rules:
- quick answers stay compact and artifact-light
- full explanations do not keep both table and diagram by default
- optional callout fields stay suppressed unless explicitly requested

Required env vars:
- N8N_CHAT_WEBHOOK_URL (optional; defaults to production chat webhook)

Usage:
  python scripts/evaluate_chat_answer_clarity.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request


WEBHOOK_URL = os.environ.get(
    "N8N_CHAT_WEBHOOK_URL",
    "https://n8n.learningpacer.org/webhook/6f2a40a0-765a-44f0-a012-b24f418869bb",
)


CASES = [
    {
        "name": "cookies_quick",
        "payload": {
            "query": "Explain HTTP cookies.",
            "sessionId": "clarity-eval-cookies",
            "mode": "auto",
            "responseStyle": "quick_answer",
        },
        "expect": {
            "response_style": "quick_answer",
            "has_table": False,
            "has_diagram": False,
            "has_exam_tip": False,
            "has_check_understanding": False,
            "max_major_artifacts": 0,
            "max_main_words": 180,
            "max_summary_sentences": 1,
            "min_list_items": 3,
            "max_list_items": 6,
            "max_long_sentences": 1,
        },
    },
    {
        "name": "tcp_handshake_diagram",
        "payload": {
            "query": "show me tcp handshake using a diagram",
            "sessionId": "clarity-eval-handshake",
            "mode": "auto",
            "responseStyle": "full_explanation",
        },
        "expect": {
            "response_style": "full_explanation",
            "has_table": False,
            "has_diagram": True,
            "has_exam_tip": False,
            "has_check_understanding": False,
            "max_major_artifacts": 1,
            "max_main_words": 340,
            "max_summary_sentences": 1,
            "max_long_sentences": 2,
        },
    },
    {
        "name": "gbn_vs_sr_compare",
        "payload": {
            "query": "Compare Go-Back-N and Selective Repeat.",
            "sessionId": "clarity-eval-gbn-sr",
            "mode": "auto",
            "responseStyle": "full_explanation",
        },
        "expect": {
            "response_style": "full_explanation",
            "has_table": True,
            "has_diagram": False,
            "has_exam_tip": False,
            "has_check_understanding": False,
            "max_major_artifacts": 1,
            "max_main_words": 380,
            "max_summary_sentences": 1,
            "max_long_sentences": 2,
        },
    },
    {
        "name": "bdp_simple_terms",
        "payload": {
            "query": "Explain bandwidth-delay product in simple terms.",
            "sessionId": "clarity-eval-bdp",
            "mode": "auto",
            "responseStyle": "full_explanation",
        },
        "expect": {
            "response_style": "full_explanation",
            "has_table": False,
            "has_diagram": False,
            "has_exam_tip": False,
            "has_check_understanding": False,
            "max_major_artifacts": 0,
            "max_main_words": 280,
            "max_summary_sentences": 1,
            "max_long_sentences": 2,
        },
    },
    {
        "name": "casual_hi",
        "payload": {
            "query": "hi",
            "sessionId": "clarity-eval-hi",
            "mode": "auto",
            "responseStyle": "quick_answer",
        },
        "expect": {
            "response_style": "quick_answer",
            "question_type": "casual",
            "has_table": False,
            "has_diagram": False,
            "has_exam_tip": False,
            "has_check_understanding": False,
            "max_major_artifacts": 0,
            "max_main_words": 60,
            "max_summary_sentences": 1,
            "max_long_sentences": 0,
        },
    },
]


def call_webhook(payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        WEBHOOK_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def parse_answer(payload: dict) -> dict | None:
    raw = payload.get("answer")
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def word_count(text: str | None) -> int:
    return len(re.findall(r"\b[\w/-]+\b", str(text or "")))


def sentence_count(text: str | None) -> int:
    stripped = str(text or "").strip()
    if not stripped:
        return 0
    parts = re.split(r"(?<=[.!?])\s+|\n{2,}", stripped)
    return len([part for part in parts if part.strip()])


def long_sentence_count(text: str | None, threshold: int = 30) -> int:
    stripped = str(text or "").strip()
    if not stripped:
        return 0
    parts = re.split(r"(?<=[.!?])\s+|\n{2,}", stripped)
    return sum(1 for part in parts if word_count(part) > threshold)


def list_item_count(text: str | None) -> int:
    return sum(
        1
        for line in str(text or "").splitlines()
        if re.match(r"^\s*(?:[-*]|\d+\.)\s+", line)
    )


def summarize(case: dict, payload: dict) -> dict:
    answer = parse_answer(payload) or {}
    table = answer.get("table") if isinstance(answer.get("table"), dict) else None
    diagram = answer.get("diagram") if isinstance(answer.get("diagram"), dict) else None
    main = answer.get("main_explanation")
    summary_text = answer.get("summary")

    return {
        "name": case["name"],
        "title": answer.get("title"),
        "question_type": answer.get("question_type"),
        "response_style": answer.get("response_style"),
        "has_table": bool(table and table.get("headers") and table.get("rows")),
        "has_diagram": bool(diagram and diagram.get("type") == "mermaid" and diagram.get("code")),
        "has_exam_tip": bool(answer.get("exam_tip")),
        "has_check_understanding": bool(answer.get("check_understanding")),
        "major_artifact_count": sum(
            [
                bool(table and table.get("headers") and table.get("rows")),
                bool(diagram and diagram.get("type") == "mermaid" and diagram.get("code")),
            ]
        ),
        "summary_sentences": sentence_count(summary_text),
        "main_word_count": word_count(main),
        "main_list_items": list_item_count(main),
        "main_long_sentences": long_sentence_count(main),
    }


def validate(summary: dict, expected: dict) -> list[str]:
    issues: list[str] = []

    if "response_style" in expected and summary["response_style"] != expected["response_style"]:
        issues.append(
            f"expected response_style={expected['response_style']}, got {summary['response_style']}"
        )

    if "question_type" in expected and summary["question_type"] != expected["question_type"]:
        issues.append(
            f"expected question_type={expected['question_type']}, got {summary['question_type']}"
        )

    for key in ["has_table", "has_diagram", "has_exam_tip", "has_check_understanding"]:
        if key in expected and summary[key] != expected[key]:
            issues.append(f"expected {key}={expected[key]}, got {summary[key]}")

    if "max_major_artifacts" in expected and summary["major_artifact_count"] > expected["max_major_artifacts"]:
        issues.append(
            f"expected major_artifact_count<={expected['max_major_artifacts']}, got {summary['major_artifact_count']}"
        )

    if "max_main_words" in expected and summary["main_word_count"] > expected["max_main_words"]:
        issues.append(
            f"expected main_word_count<={expected['max_main_words']}, got {summary['main_word_count']}"
        )

    if "max_summary_sentences" in expected and summary["summary_sentences"] > expected["max_summary_sentences"]:
        issues.append(
            f"expected summary_sentences<={expected['max_summary_sentences']}, got {summary['summary_sentences']}"
        )

    if "min_list_items" in expected and summary["main_list_items"] < expected["min_list_items"]:
        issues.append(
            f"expected main_list_items>={expected['min_list_items']}, got {summary['main_list_items']}"
        )

    if "max_list_items" in expected and summary["main_list_items"] > expected["max_list_items"]:
        issues.append(
            f"expected main_list_items<={expected['max_list_items']}, got {summary['main_list_items']}"
        )

    if "max_long_sentences" in expected and summary["main_long_sentences"] > expected["max_long_sentences"]:
        issues.append(
            f"expected main_long_sentences<={expected['max_long_sentences']}, got {summary['main_long_sentences']}"
        )

    return issues


def main() -> int:
    results = []
    failures = []

    for case in CASES:
        try:
            payload = call_webhook(case["payload"])
            summary = summarize(case, payload)
            results.append(summary)
            issues = validate(summary, case["expect"])
            if issues:
                failures.append({"name": case["name"], "issues": issues})
        except Exception as exc:
            failures.append({"name": case["name"], "issues": [str(exc)]})

    print(
        json.dumps(
            {
                "webhook_url": WEBHOOK_URL,
                "results": results,
                "failures": failures,
            },
            indent=2,
        )
    )

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
