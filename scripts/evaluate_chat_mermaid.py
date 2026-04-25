"""Run a bounded smoke evaluation of the live chat Mermaid workflow.

This gate is intentionally small and stable. It checks the production webhook
for Mermaid-oriented prompts and also runs local validator fixtures for the
diagram-shape rules introduced in Phase 3.

Required env vars:
- N8N_CHAT_WEBHOOK_URL (optional; defaults to production chat webhook)

Usage:
  python scripts/evaluate_chat_mermaid.py
"""

import json
import os
import re
import sys
import urllib.request


WEBHOOK_URL = os.environ.get(
    "N8N_CHAT_WEBHOOK_URL",
    "https://n8n.learningpacer.org/webhook/6f2a40a0-765a-44f0-a012-b24f418869bb",
)

LIVE_CASES = [
    {
        "name": "diagram_handshake",
        "payload": {
            "query": "Use a Mermaid diagram to explain the TCP three-way handshake.",
            "sessionId": "phase3-mermaid-eval-handshake",
            "mode": "auto",
            "responseStyle": "full_explanation",
        },
        "expect": {
            "has_diagram": True,
            "diagram_type": "mermaid",
            "trace_error_stage": None,
        },
    },
    {
        "name": "diagram_http_flow",
        "payload": {
            "query": "Draw a Mermaid diagram for a simple HTTP request and response flow, then explain it briefly.",
            "sessionId": "phase3-mermaid-eval-http",
            "mode": "auto",
            "responseStyle": "full_explanation",
        },
        "expect": {
            "has_diagram": True,
            "diagram_type": "mermaid",
            "trace_error_stage": None,
        },
    },
    {
        "name": "no_forced_diagram",
        "payload": {
            "query": "Explain RTT in TCP in one short paragraph only. Do not use a diagram.",
            "sessionId": "phase3-mermaid-eval-no-diagram",
            "mode": "auto",
            "responseStyle": "quick_answer",
        },
        "expect": {
            "has_diagram": False,
            "trace_error_stage": None,
        },
    },
]

VALIDATOR_FIXTURES = [
    {
        "name": "valid_sequence",
        "code": "\n".join(
            [
                "sequenceDiagram",
                "    participant Client",
                "    participant Server",
                "    Client->>Server: SYN",
                "    Server-->>Client: SYN+ACK",
            ]
        ),
        "valid": True,
    },
    {
        "name": "valid_flowchart",
        "code": "\n".join(
            [
                "flowchart LR",
                '    Sender["Sender"] --> Receiver["Receiver"]',
            ]
        ),
        "valid": True,
    },
    {
        "name": "invalid_plain_text",
        "code": "This is not Mermaid at all.",
        "valid": False,
    },
    {
        "name": "invalid_htmlish",
        "code": "\n".join(
            [
                "sequenceDiagram",
                "    <div>bad</div>",
            ]
        ),
        "valid": False,
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


def normalize_diagram_code(code: str) -> str:
    normalized = str(code or "").replace("\r\n", "\n").strip()
    normalized = re.sub(r"^```(?:mermaid)?\s*", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\s*```$", "", normalized, flags=re.IGNORECASE)
    return normalized.strip()


def is_valid_mermaid_diagram(code: str) -> bool:
    normalized = normalize_diagram_code(code)
    if not normalized or len(normalized) < 12:
        return False
    if re.search(r"</?[a-z][\w:-]*(?:\s[^>]*)?>", normalized, flags=re.IGNORECASE):
        return False

    lines = [line.strip() for line in normalized.split("\n") if line.strip()]
    if len(lines) < 2:
        return False

    first = lines[0]
    rest = lines[1:]

    if re.match(r"^(flowchart|graph)\s+(LR|RL|TB|TD|BT)$", first, flags=re.IGNORECASE):
        return any(re.search(r"-->|\-\-\-|==>|-\.\->|==|-\.|-->", line) for line in rest)

    if re.match(r"^sequenceDiagram$", first, flags=re.IGNORECASE):
        return any(
            re.match(r"^(participant\s+\w+|actor\s+\w+|\w+\s*(?:-+|=+)\>+\s*\w+)", line, flags=re.IGNORECASE)
            for line in rest
        )

    if re.match(r"^stateDiagram(?:-v2)?$", first, flags=re.IGNORECASE):
        return any(re.search(r"-->|^\[\*\]|^state\s+\w+", line, flags=re.IGNORECASE) for line in rest)

    if re.match(r"^classDiagram$", first, flags=re.IGNORECASE):
        return any(
            re.match(r"^(class\s+\w+|\w+\s+[<|*o.]+--[>|*o.]+\s+\w+)", line, flags=re.IGNORECASE)
            for line in rest
        )

    if re.match(r"^erDiagram$", first, flags=re.IGNORECASE):
        return any(
            re.match(r"^(\w+\s+[\|\}\{o]+--[\|\}\{o]+\s+\w+)", line, flags=re.IGNORECASE)
            for line in rest
        )

    if re.match(r"^(mindmap|timeline|gitGraph|pie)(?:\s|$)", first, flags=re.IGNORECASE):
        return len(rest) >= 1

    return False


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


def summarize_live_case(case: dict, payload: dict) -> dict:
    answer = parse_answer(payload) or {}
    trace = payload.get("trace") or {}
    diagram = answer.get("diagram") if isinstance(answer.get("diagram"), dict) else None
    code = (diagram or {}).get("code", "")

    return {
        "name": case["name"],
        "question_type": answer.get("question_type"),
        "has_diagram": bool(diagram),
        "diagram_type": (diagram or {}).get("type"),
        "diagram_prefix": code[:120] if code else None,
        "diagram_locally_valid": is_valid_mermaid_diagram(code) if code else None,
        "trace_error_stage": trace.get("error_stage"),
        "route": trace.get("route"),
    }


def validate_live_summary(summary: dict, expected: dict) -> list[str]:
    issues = []

    if "has_diagram" in expected and summary["has_diagram"] != expected["has_diagram"]:
        issues.append(
            f"expected has_diagram={expected['has_diagram']}, got {summary['has_diagram']}"
        )

    if "diagram_type" in expected and summary["diagram_type"] != expected["diagram_type"]:
        issues.append(
            f"expected diagram_type={expected['diagram_type']}, got {summary['diagram_type']}"
        )

    if "trace_error_stage" in expected and summary["trace_error_stage"] != expected["trace_error_stage"]:
        issues.append(
            f"expected trace_error_stage={expected['trace_error_stage']}, got {summary['trace_error_stage']}"
        )

    if summary["has_diagram"] and summary["diagram_locally_valid"] is not True:
        issues.append("diagram was present but failed local Mermaid validity check")

    return issues


def evaluate_validator_fixtures() -> tuple[list[dict], list[dict]]:
    results = []
    failures = []

    for fixture in VALIDATOR_FIXTURES:
        actual = is_valid_mermaid_diagram(fixture["code"])
        result = {
            "name": fixture["name"],
            "expected_valid": fixture["valid"],
            "actual_valid": actual,
        }
        results.append(result)
        if actual != fixture["valid"]:
            failures.append(result)

    return results, failures


def main() -> int:
    live_results = []
    live_failures = []

    for case in LIVE_CASES:
        try:
            payload = call_webhook(case["payload"])
            summary = summarize_live_case(case, payload)
            live_results.append(summary)
            issues = validate_live_summary(summary, case["expect"])
            if issues:
                live_failures.append({"name": case["name"], "issues": issues})
        except Exception as exc:
            live_failures.append({"name": case["name"], "issues": [str(exc)]})

    fixture_results, fixture_failures = evaluate_validator_fixtures()

    print(
        json.dumps(
            {
                "webhook_url": WEBHOOK_URL,
                "live_results": live_results,
                "live_failures": live_failures,
                "validator_fixture_results": fixture_results,
                "validator_fixture_failures": fixture_failures,
            },
            indent=2,
        )
    )

    return 1 if live_failures or fixture_failures else 0


if __name__ == "__main__":
    sys.exit(main())
