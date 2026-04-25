"""Deploy the main chat workflow export to n8n.

Reads a workflow export JSON file, updates the target workflow by id, and
reactivates it. This keeps live edits aligned with the repo patcher flow.

Required env vars:
- N8N_API_URL
- N8N_API_KEY

Optional env vars:
- N8N_CHAT_WORKFLOW_ID (defaults to the production chat workflow id)

Usage:
  python scripts/deploy_main_chat_workflow.py
  python scripts/deploy_main_chat_workflow.py wf_after.json
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path


WORKFLOW_ID = os.environ.get("N8N_CHAT_WORKFLOW_ID", "MznVBhIC4sbFquyy")
ALLOWED_TOP_LEVEL_FIELDS = {"name", "nodes", "connections", "settings", "staticData"}
ALLOWED_SETTINGS_FIELDS = {
    "saveExecutionProgress",
    "saveManualExecutions",
    "saveDataErrorExecution",
    "saveDataSuccessExecution",
    "executionTimeout",
    "errorWorkflow",
    "timezone",
    "executionOrder",
}


def request_json(url: str, api_key: str, method: str = "GET", body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "X-N8N-API-KEY": api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def load_deployable_workflow(path: Path) -> dict:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    body = {key: value for key, value in raw.items() if key in ALLOWED_TOP_LEVEL_FIELDS}
    settings = body.get("settings") or {}
    body["settings"] = {key: value for key, value in settings.items() if key in ALLOWED_SETTINGS_FIELDS}
    return body


def main() -> None:
    api_url = os.environ["N8N_API_URL"].rstrip("/")
    api_key = os.environ["N8N_API_KEY"]
    workflow_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("wf.json")

    body = load_deployable_workflow(workflow_path)
    result = request_json(f"{api_url}/workflows/{WORKFLOW_ID}", api_key, method="PUT", body=body)
    request_json(f"{api_url}/workflows/{WORKFLOW_ID}/activate", api_key, method="POST")

    print(
        json.dumps(
            {
                "workflow_id": result.get("id", WORKFLOW_ID),
                "name": result.get("name"),
                "source_file": str(workflow_path),
                "active": True,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
