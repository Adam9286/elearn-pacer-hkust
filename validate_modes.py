import json, sys, re

MODES = [
    ("explain",         "resp_explain.json"),
    ("exam_focus",      "resp_exam_focus.json"),
    ("worked_example",  "resp_worked_example.json"),
]

def extract_answer(payload):
    # Payload may be {answer, retrieved_materials, citations} or raw
    if isinstance(payload, dict):
        for k in ("answer", "output", "response", "message", "content", "text"):
            if k in payload and payload[k] is not None:
                return payload[k]
    if isinstance(payload, list) and payload:
        return extract_answer(payload[0])
    return payload

def strip_fences(s):
    if not isinstance(s, str):
        return s
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", s)
    if m:
        return m.group(1)
    return s.strip()

def word_count(s):
    if not s:
        return 0
    # Strip markdown emphasis/code but count words reasonably
    txt = re.sub(r"[`*_#>]", " ", s)
    txt = re.sub(r"\s+", " ", txt).strip()
    return len(txt.split())

def summarize(name, obj):
    keys = ["question_type", "title", "summary", "main_explanation",
            "table", "diagram", "elec3120_context", "exam_tip",
            "check_understanding", "calculation_steps"]
    print(f"\n----- {name} field population -----")
    for k in keys:
        v = obj.get(k, "<MISSING>")
        if v is None:
            print(f"  {k}: null")
        elif v == "<MISSING>":
            print(f"  {k}: MISSING")
        elif isinstance(v, str):
            wc = word_count(v)
            preview = v[:90].replace("\n", " ")
            print(f"  {k}: str[{len(v)} chars, ~{wc} words] {preview!r}...")
        elif isinstance(v, dict):
            print(f"  {k}: object keys={list(v.keys())}")
        elif isinstance(v, list):
            print(f"  {k}: list len={len(v)}")
        else:
            print(f"  {k}: {type(v).__name__} = {v!r}")

def check_explain(obj):
    errs = []
    if not obj.get("summary"): errs.append("summary must be non-null")
    has_artifact = any([
        obj.get("table") not in (None, "", {}),
        obj.get("diagram") not in (None, "", {}),
        obj.get("check_understanding") not in (None, ""),
    ])
    if not has_artifact:
        errs.append("need at least one of {table, diagram, check_understanding}")
    return errs

def check_exam_focus(obj):
    errs = []
    wc = word_count(obj.get("main_explanation") or "")
    if wc >= 150: errs.append(f"main_explanation {wc} words >= 150")
    if not obj.get("exam_tip"): errs.append("exam_tip must be non-null")
    if not obj.get("elec3120_context"): errs.append("elec3120_context must be non-null")
    if obj.get("calculation_steps") is not None:
        errs.append("calculation_steps must be null")
    return errs

def check_worked_example(obj):
    errs = []
    cs = obj.get("calculation_steps")
    if not cs or not isinstance(cs, dict):
        errs.append("calculation_steps must be non-null object")
    else:
        if not cs.get("setup"): errs.append("calculation_steps.setup missing")
        steps = cs.get("steps")
        if not isinstance(steps, list) or len(steps) < 3:
            errs.append(f"calculation_steps.steps should be 3-7 strings (got {type(steps).__name__} len={len(steps) if isinstance(steps, list) else 'n/a'})")
        if not cs.get("answer"): errs.append("calculation_steps.answer missing")
        if "common_mistakes" not in cs:
            errs.append("calculation_steps.common_mistakes missing key")
    wc = word_count(obj.get("main_explanation") or "")
    if wc >= 100: errs.append(f"main_explanation {wc} words >= 100")
    return errs

CHECKERS = {
    "explain": check_explain,
    "exam_focus": check_exam_focus,
    "worked_example": check_worked_example,
}

all_pass = True
for mode, path in MODES:
    print(f"\n============ MODE: {mode} ({path}) ============")
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    try:
        payload = json.loads(raw)
    except Exception as e:
        print(f"outer JSON parse failed: {e}")
        all_pass = False
        continue
    ans = extract_answer(payload)
    if not isinstance(ans, (str, dict, list)):
        print(f"no answer field found; payload keys={list(payload.keys()) if isinstance(payload, dict) else type(payload).__name__}")
        all_pass = False
        continue
    if isinstance(ans, str):
        cleaned = strip_fences(ans)
        try:
            obj = json.loads(cleaned)
        except Exception as e:
            print(f"answer not valid JSON after fence strip: {e}")
            print(f"first 300 chars: {cleaned[:300]!r}")
            all_pass = False
            continue
    else:
        obj = ans
    if not isinstance(obj, dict):
        print(f"parsed answer is not an object: {type(obj).__name__}")
        all_pass = False
        continue
    summarize(mode, obj)
    errs = CHECKERS[mode](obj)
    print(f"\n  CONTRACT CHECK ({mode}):")
    if errs:
        for e in errs:
            print(f"    FAIL: {e}")
        all_pass = False
    else:
        print("    PASS")

print("\n============ OVERALL ============")
print("ALL PASS" if all_pass else "FAILURES PRESENT")
sys.exit(0 if all_pass else 1)
