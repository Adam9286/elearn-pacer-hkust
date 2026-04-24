import json, re

MODES = [
    ("explain",         "resp_explain.json"),
    ("exam_focus",      "resp_exam_focus.json"),
    ("worked_example",  "resp_worked_example.json"),
]

def strip_fences(s):
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", s)
    return m.group(1) if m else s.strip()

for mode, path in MODES:
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    ans = payload.get("answer") if isinstance(payload, dict) else payload
    if isinstance(ans, str):
        ans = json.loads(strip_fences(ans))
    out_path = f"answer_{mode}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(ans, f, indent=2, ensure_ascii=False)
    print(f"wrote {out_path}")
