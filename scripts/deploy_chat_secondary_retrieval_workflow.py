"""Create or update the dedicated chat secondary retrieval workflow in n8n.

This isolates the maintained question-bank fallback behind a stable webhook so
the main chat workflow is not dependent on brittle zero-item branching.

Required env vars:
- N8N_API_URL
- N8N_API_KEY
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
import uuid


WORKFLOW_NAME = "Chat Secondary Retrieval Service"
WEBHOOK_PATH = "chat-secondary-retrieval"


def request_json(url: str, api_key: str, method: str = "GET", body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "X-N8N-API-KEY": api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.load(response)


def new_id() -> str:
    return str(uuid.uuid4())


def build_workflow() -> dict:
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": WEBHOOK_PATH,
                "responseMode": "responseNode",
                "options": {"allowedOrigins": "*"},
            },
            "id": new_id(),
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2.1,
            "position": [-480, 0],
        },
        {
            "parameters": {
                "jsCode": (
                    "const body = typeof $input.first().json.body === 'string' "
                    "? JSON.parse($input.first().json.body) "
                    ": ($input.first().json.body || $input.first().json); "
                    "return [{ json: { query: String(body.query || ''), topK: Number(body.topK || 4) } }];"
                )
            },
            "id": new_id(),
            "name": "Parse",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [-240, 0],
        },
        {
            "parameters": {
                "mode": "load",
                "tableName": {
                    "__rl": True,
                    "value": "question_bank",
                    "mode": "list",
                    "cachedResultName": "question_bank",
                },
                "prompt": "={{ $json.query }}",
                "topK": "={{ $json.topK || 4 }}",
                "options": {"queryName": "match_lecture_questions"},
            },
            "id": new_id(),
            "name": "Retrieve",
            "type": "@n8n/n8n-nodes-langchain.vectorStoreSupabase",
            "typeVersion": 1.3,
            "position": [0, 0],
            "credentials": {
                "supabaseApi": {"id": "FqXaEHnoK8HR3Mfy", "name": "Supabase account"}
            },
        },
        {
            "parameters": {"modelName": "BAAI/bge-base-en-v1.5", "options": {}},
            "id": new_id(),
            "name": "Embeddings",
            "type": "@n8n/n8n-nodes-langchain.embeddingsHuggingFaceInference",
            "typeVersion": 1,
            "position": [0, 192],
            "credentials": {
                "huggingFaceApi": {"id": "2H2u78oqVixzZOQy", "name": "Hugging Face account"}
            },
        },
        {
            "parameters": {
                "jsCode": (
                    "return [{ json: { count: $input.all().length, items: $input.all().map((item) => item.json) } }];"
                )
            },
            "id": new_id(),
            "name": "Dump",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [240, 0],
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ JSON.stringify($json) }}",
                "options": {"responseCode": 200},
            },
            "id": new_id(),
            "name": "Respond",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.4,
            "position": [480, 0],
        },
    ]

    connections = {
        "Webhook": {"main": [[{"node": "Parse", "type": "main", "index": 0}]]},
        "Parse": {"main": [[{"node": "Retrieve", "type": "main", "index": 0}]]},
        "Embeddings": {
            "ai_embedding": [[{"node": "Retrieve", "type": "ai_embedding", "index": 0}]]
        },
        "Retrieve": {"main": [[{"node": "Dump", "type": "main", "index": 0}]]},
        "Dump": {"main": [[{"node": "Respond", "type": "main", "index": 0}]]},
    }

    return {
        "name": WORKFLOW_NAME,
        "nodes": nodes,
        "connections": connections,
        "settings": {},
        "staticData": {},
    }


def find_existing_workflow(api_url: str, api_key: str) -> str | None:
    cursor = None
    while True:
        params = {"limit": 100}
        if cursor:
            params["cursor"] = cursor
        url = f"{api_url}/workflows?{urllib.parse.urlencode(params)}"
        payload = request_json(url, api_key)
        for item in payload.get("data", []):
            if item.get("name") == WORKFLOW_NAME:
                return item.get("id")
        cursor = payload.get("nextCursor")
        if not cursor:
            return None


def main() -> None:
    api_url = os.environ["N8N_API_URL"].rstrip("/")
    api_key = os.environ["N8N_API_KEY"]
    existing_id = find_existing_workflow(api_url, api_key)
    workflow = build_workflow()

    if existing_id:
        result = request_json(f"{api_url}/workflows/{existing_id}", api_key, method="PUT", body=workflow)
        workflow_id = result["id"]
    else:
        result = request_json(f"{api_url}/workflows", api_key, method="POST", body=workflow)
        workflow_id = result["id"]

    request_json(f"{api_url}/workflows/{workflow_id}/activate", api_key, method="POST")
    print(json.dumps({"workflow_id": workflow_id, "name": WORKFLOW_NAME, "webhook_path": WEBHOOK_PATH}, indent=2))


if __name__ == "__main__":
    main()
