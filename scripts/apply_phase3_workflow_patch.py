"""Apply Phase 3 Mermaid reliability changes to a workflow export.

Idempotent: running twice produces the same result. Modifies in-place.
Run: python scripts/apply_phase3_workflow_patch.py wf_after.json
"""

import importlib.util
import json
import sys
from pathlib import Path


def load_phase2_module():
    module_path = Path(__file__).with_name("apply_phase2_workflow_patch.py")
    spec = importlib.util.spec_from_file_location("apply_phase2_workflow_patch", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load Phase 2 patch module from {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


phase2 = load_phase2_module()


MERMAID_APPENDIX = r"""

## Mermaid reliability
- Only populate diagram when it materially improves understanding. If you are not confident the diagram is valid Mermaid, set diagram to null.
- diagram.code must contain raw Mermaid only. Never wrap it in ``` fences.
- Prefer the simplest diagram family that fits the concept:
  - stateDiagram-v2 for state transitions
  - sequenceDiagram for message exchanges
  - flowchart LR or flowchart TD for pipelines, topologies, and sliding-window intuition
- Use short ASCII-safe node IDs such as Client, Server, Router, Sender, Receiver, Win1.
- Put descriptive text in quoted labels, not inside IDs.
- Keep diagrams compact. Prefer 4-8 nodes/messages over dense wall-of-text diagrams.
- Avoid unsupported HTML, markdown, or explanatory prose inside diagram.code.

Mermaid examples:

Example 1 - TCP state machine
stateDiagram-v2
    [*] --> CLOSED
    CLOSED --> SYN_SENT: active open
    SYN_SENT --> ESTABLISHED: SYN + ACK received
    ESTABLISHED --> FIN_WAIT_1: close()
    FIN_WAIT_1 --> TIME_WAIT: FIN + ACK exchanged
    TIME_WAIT --> [*]

Example 2 - HTTP request / response
sequenceDiagram
    participant Browser
    participant Server
    Browser->>Server: HTTP GET /index.html
    Server-->>Browser: 200 OK + HTML

Example 3 - Sliding window intuition
flowchart LR
    Sender["Sender window"] --> Win1["pkt 1"]
    Sender --> Win2["pkt 2"]
    Sender --> Win3["pkt 3"]
    Win1 --> Receiver["Receiver"]
    Win2 --> Receiver
    Win3 --> Receiver

Before emitting a non-null diagram, silently verify that the first line is a valid Mermaid diagram type and the body contains the connectors/messages expected for that type.
"""


MERMAID_VALIDATION_JS = r"""const item = $input.first().json;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stripFences(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeDiagramCode(code) {
  return String(code || '')
    .replace(/^```(?:mermaid)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function isValidMermaidDiagram(code) {
  const normalized = normalizeDiagramCode(code);
  if (!normalized || normalized.length < 12) return false;
  if (/<\/?[a-z][\w:-]*(?:\s[^>]*)?>/i.test(normalized)) return false;

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return false;

  const first = lines[0];
  const rest = lines.slice(1);

  if (/^(flowchart|graph)\s+(LR|RL|TB|TD|BT)$/i.test(first)) {
    return rest.some((line) => /-->|---|==>|-.->|==|-.|-->/.test(line));
  }

  if (/^sequenceDiagram$/i.test(first)) {
    return rest.some((line) => /^(participant\s+\w+|actor\s+\w+|\w+\s*(?:-+|=+)\>+\s*\w+)/i.test(line));
  }

  if (/^stateDiagram(?:-v2)?$/i.test(first)) {
    return rest.some((line) => /-->|^\[\*\]|^state\s+\w+/i.test(line));
  }

  if (/^classDiagram$/i.test(first)) {
    return rest.some((line) => /^(class\s+\w+|\w+\s+[<|*o.]+--[>|*o.]+\s+\w+)/i.test(line));
  }

  if (/^erDiagram$/i.test(first)) {
    return rest.some((line) => /^(\w+\s+[\|\}\{o]+--[\|\}\{o]+\s+\w+)/i.test(line));
  }

  if (/^(mindmap|timeline|gitGraph|pie)(?:\s|$)/i.test(first)) {
    return rest.length >= 1;
  }

  return false;
}

const rawAnswer = stripFences(item.answer || item.output || item.text || '');
if (!rawAnswer.startsWith('{')) {
  return [{ json: item }];
}

try {
  const parsed = JSON.parse(rawAnswer);
  if (!isRecord(parsed) || !isRecord(parsed.diagram) || parsed.diagram.type !== 'mermaid') {
    return [{ json: item }];
  }

  const code = normalizeDiagramCode(parsed.diagram.code);
  if (isValidMermaidDiagram(code)) {
    parsed.diagram.code = code;
    return [{
      json: {
        ...item,
        answer: JSON.stringify(parsed),
      },
    }];
  }

  parsed.diagram = null;

  const nextTrace = isRecord(item.trace) ? { ...item.trace } : null;
  if (nextTrace && (nextTrace.error_stage === null || nextTrace.error_stage === undefined)) {
    nextTrace.error_stage = 'diagram_validation';
  }

  return [{
    json: {
      ...item,
      answer: JSON.stringify(parsed),
      trace: nextTrace || item.trace || null,
    },
  }];
} catch (error) {
  return [{ json: item }];
}
"""


POLISH_ANSWER_STRUCTURE_JS_NEW = r"""// Parse and sanitize the structured model answer before returning it.
// Compactness rules are structural only: drop over-eager optional artifacts
// without rewriting factual content.

const item = $input.first().json;
const materials = Array.isArray(item.retrieved_materials) ? item.retrieved_materials : [];
const fence = String.fromCharCode(96);

let parseIncomingJson = {};
try {
  const upstream = $('Parse Incoming').first();
  if (upstream && upstream.json) parseIncomingJson = upstream.json;
} catch (e) { /* node ref may be unavailable in some manual runs */ }

const traceId =
  parseIncomingJson.trace_id ||
  ('tr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10));
const traceStartedAt = Number(parseIncomingJson.traceStartedAt) || Date.now();

function normalizeStyle(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (raw === 'quick_answer' || raw === 'quick' || raw === 'exam_focus') return 'quick_answer';
  if (raw === 'full_explanation' || raw === 'full' || raw === 'explain' || raw === 'worked_example') return 'full_explanation';
  return 'full_explanation';
}

function stripThink(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function stripFences(text) {
  return stripThink(text)
    .replace(new RegExp('^\\s*' + fence + '{3}(?:json)?\\s*', 'i'), '')
    .replace(new RegExp('\\s*' + fence + '{3}\\s*$', 'i'), '')
    .trim();
}

function sanitizeString(text) {
  let value = stripThink(text);

  value = value.replace(
    /\s*\[(?:Lecture\s*\d{1,2}\s*,\s*Slide\s*\d{1,3}|Textbook\s*,?\s*p\.?\s*\d{1,4})\]\s*/gi,
    ' '
  );

  value = value.replace(/(\s*\[\s*[^\]]{0,80}\s*\])+/g, (match) => {
    const brackets = match.match(/\[[^\]]+\]/g) || [];
    const allCitationLike = brackets.every((b) =>
      /Lecture\s*\d|Textbook|Slide\s*\d|p\.?\s*\d/i.test(b)
    );
    return allCitationLike ? ' ' : match;
  });

  const metaPatterns = [
    /I couldn['']t find[^.]*\./gi,
    /I could not find[^.]*\./gi,
    /The (?:course )?(?:lecture )?(?:slides|materials|notes) (?:don['']t|do not) (?:cover|mention|include|address)[^.]*\./gi,
    /Based on the (?:retrieved )?(?:course )?(?:context|materials|slides)[^,]*,\s*/gi,
    /According to the (?:slides|textbook|course materials)[^,]*,\s*/gi,
  ];

  for (const re of metaPatterns) value = value.replace(re, '');

  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function sanitizeValue(value) {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = sanitizeValue(child);
    return out;
  }
  return value;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasMeaningfulTable(table) {
  return !!(
    table &&
    Array.isArray(table.headers) &&
    table.headers.length > 0 &&
    Array.isArray(table.rows) &&
    table.rows.length > 0
  );
}

function hasMeaningfulDiagram(diagram) {
  return !!(
    diagram &&
    diagram.type === 'mermaid' &&
    isNonEmptyString(diagram.code)
  );
}

function hasMeaningfulCalculationSteps(steps) {
  return !!(
    steps &&
    isNonEmptyString(steps.setup) &&
    Array.isArray(steps.steps) &&
    steps.steps.length > 0 &&
    isNonEmptyString(steps.answer)
  );
}

function ensureShape(obj) {
  const out = sanitizeValue(obj && typeof obj === 'object' ? obj : {});
  const requestedStyle = normalizeStyle(parseIncomingJson.responseStyle || item.responseStyle || out.response_style);

  out.response_style = requestedStyle;
  out.question_type = out.question_type || 'concept';
  out.title = out.title || 'Answer';
  out.summary = out.summary || null;
  out.main_explanation = out.main_explanation || '';
  out.table = out.table || null;
  out.diagram = out.diagram || null;
  out.elec3120_context = out.elec3120_context || null;
  out.exam_tip = out.exam_tip || null;
  out.check_understanding = out.check_understanding || null;
  out.calculation_steps = out.calculation_steps || null;

  if (out.calculation_steps && typeof out.calculation_steps === 'object') {
    out.calculation_steps.setup = out.calculation_steps.setup || '';
    out.calculation_steps.steps = Array.isArray(out.calculation_steps.steps) ? out.calculation_steps.steps : [];
    out.calculation_steps.answer = out.calculation_steps.answer || '';
    out.calculation_steps.common_mistakes = out.calculation_steps.common_mistakes || null;

    if (!hasMeaningfulCalculationSteps(out.calculation_steps)) {
      out.calculation_steps = null;
    }
  }

  if (!hasMeaningfulTable(out.table)) out.table = null;
  if (!hasMeaningfulDiagram(out.diagram)) out.diagram = null;

  return out;
}

function parseStructuredAnswer(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
}

function detectRequests(query, questionType) {
  const normalized = String(query || '').toLowerCase();
  const wantsDiagram =
    /\b(diagram|mermaid|flowchart|sequence diagram|state diagram)\b/.test(normalized) ||
    /\bdraw\b/.test(normalized) ||
    /\busing a diagram\b/.test(normalized);
  const wantsTable = /\btable|tabulate|tabular\b/.test(normalized);
  const wantsComparison =
    questionType === 'comparison' || /\b(compare|comparison|difference|different|vs\.?|versus)\b/.test(normalized);
  const wantsExamTip =
    /\bexam\b/.test(normalized) ||
    /\btrap\b/.test(normalized) ||
    /\bmarking\b/.test(normalized) ||
    /\bwording\b/.test(normalized) ||
    /\bpitfall\b/.test(normalized) ||
    /\bcommon mistake\b/.test(normalized);
  const wantsCheck =
    /\bcheck (?:my|your) understanding\b/.test(normalized) ||
    /\bquiz me\b/.test(normalized) ||
    /\btest me\b/.test(normalized) ||
    /\bself[- ]check\b/.test(normalized) ||
    /\bpractice question\b/.test(normalized);
  const wantsWorked =
    /\bworked example\b/.test(normalized) ||
    /\bstep[- ]by[- ]step\b/.test(normalized) ||
    /\bcalculate\b/.test(normalized) ||
    /\bcalculation\b/.test(normalized) ||
    /\bsolve\b/.test(normalized);
  const wantsCourseContext =
    /\belec3120\b/.test(normalized) ||
    /\blecture\b/.test(normalized) ||
    /\bslide\b/.test(normalized) ||
    /\bcourse\b/.test(normalized);
  const componentBreakdown =
    /\bcomponent\b/.test(normalized) ||
    /\bcomponents\b/.test(normalized) ||
    /\bheader\b/.test(normalized) ||
    /\bheaders\b/.test(normalized) ||
    /\bfield\b/.test(normalized) ||
    /\bfields\b/.test(normalized) ||
    /\bpart\b/.test(normalized) ||
    /\bparts\b/.test(normalized);
  const wantsBothMajor =
    (wantsDiagram && wantsTable) ||
    /\bboth\b/.test(normalized) && wantsDiagram && wantsComparison;

  return {
    wantsDiagram,
    wantsTable,
    wantsComparison,
    wantsExamTip,
    wantsCheck,
    wantsWorked,
    wantsCourseContext,
    componentBreakdown,
    wantsBothMajor,
  };
}

function keepOnlyOneMajorArtifact(answer, requested) {
  if (!answer.table || !answer.diagram || requested.wantsBothMajor) return answer;

  if (requested.wantsDiagram && !requested.wantsTable && !requested.wantsComparison) {
    answer.table = null;
    return answer;
  }

  if (requested.wantsTable || requested.wantsComparison || requested.componentBreakdown) {
    answer.diagram = null;
    return answer;
  }

  if (answer.question_type === 'process') {
    answer.table = null;
    return answer;
  }

  answer.diagram = null;
  return answer;
}

function applyCompactnessRules(answer) {
  const query = String(parseIncomingJson.query || item.query || '').trim();
  const requested = detectRequests(query, answer.question_type);
  const style = answer.response_style;

  if (style === 'quick_answer') {
    if (!requested.wantsComparison && !requested.wantsTable) answer.table = null;
    if (!requested.wantsDiagram) answer.diagram = null;
    if (!requested.wantsExamTip) answer.exam_tip = null;
    if (!requested.wantsCheck) answer.check_understanding = null;
    if (!requested.wantsWorked && answer.question_type !== 'calculation') {
      answer.calculation_steps = null;
    }
    if (!requested.wantsCourseContext && answer.question_type === 'casual') {
      answer.elec3120_context = null;
    }
    keepOnlyOneMajorArtifact(answer, requested);
    return answer;
  }

  if (answer.table && !(requested.wantsTable || requested.wantsComparison || requested.componentBreakdown)) {
    answer.table = null;
  }

  if (answer.diagram && !(requested.wantsDiagram || answer.question_type === 'process')) {
    answer.diagram = null;
  }

  if (!requested.wantsExamTip) {
    answer.exam_tip = null;
  }

  if (!requested.wantsCheck) {
    answer.check_understanding = null;
  }

  if (!requested.wantsWorked && answer.question_type !== 'calculation' && !hasMeaningfulCalculationSteps(answer.calculation_steps)) {
    answer.calculation_steps = null;
  }

  keepOnlyOneMajorArtifact(answer, requested);
  return answer;
}

function fallbackAnswer(originalText) {
  const safeText = sanitizeString(originalText) || 'I had trouble producing a structured answer for that. Try rephrasing your question.';
  return ensureShape({
    response_style: normalizeStyle(parseIncomingJson.responseStyle),
    question_type: 'casual',
    title: 'Let me try that again',
    summary: null,
    main_explanation: safeText,
  });
}

function detectRouteFromShape(shaped) {
  if (shaped && shaped.question_type === 'casual') return 'casual';
  return 'chat';
}

function buildTrace(extra) {
  const usedLecture = materials.some((m) => /lecture/i.test(String(m && m.source_type || '')));
  const usedTextbook = materials.some((m) => /textbook/i.test(String(m && m.source_type || '')));
  return Object.assign(
    {
      trace_id: traceId,
      route: 'chat',
      response_style: normalizeStyle(parseIncomingJson.responseStyle),
      used_lecture_rag: usedLecture,
      used_textbook_rag: usedTextbook,
      retrieved_count: materials.length,
      latency_ms: Math.max(0, Date.now() - traceStartedAt),
      error_stage: null,
    },
    extra || {}
  );
}

const rawAnswer = item.answer ?? item.output ?? item.text ?? '';
const cleaned = stripFences(rawAnswer);

try {
  const parsed = parseStructuredAnswer(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('no structured JSON object found');
  }
  const shaped = applyCompactnessRules(ensureShape(parsed));
  return [{
    json: {
      answer: JSON.stringify(shaped),
      retrieved_materials: materials,
      trace: buildTrace({
        route: detectRouteFromShape(shaped),
        response_style: shaped.response_style,
      }),
    },
  }];
} catch (error) {
  const fallback = fallbackAnswer(cleaned);
  return [{
    json: {
      answer: JSON.stringify(fallback),
      retrieved_materials: materials,
      trace: buildTrace({
        route: 'casual',
        response_style: fallback.response_style,
        error_stage: 'json_parse',
      }),
    },
  }];
}
"""


def ensure_mermaid_appendix(system_message: str) -> str:
    if "## Mermaid reliability" in system_message:
        return system_message

    marker = "## Final self-check before emitting"
    if marker in system_message:
        return system_message.replace(marker, MERMAID_APPENDIX + "\n" + marker)
    return system_message.rstrip() + MERMAID_APPENDIX


NEW_NODES = {
    "Validate Mermaid Diagram": {
        "parameters": {"jsCode": MERMAID_VALIDATION_JS},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1088, 3088],
        "id": "77f22caf-7d25-44df-a521-1776c1d4e8b9",
        "name": "Validate Mermaid Diagram",
    },
}


def upsert_node(data, new_node):
    for index, node in enumerate(data["nodes"]):
        if node["name"] == new_node["name"]:
            data["nodes"][index] = new_node
            return
    data["nodes"].append(new_node)


def patch_auto_agent(nodes):
    auto_agent = nodes["Auto Agent"]
    options = auto_agent.setdefault("parameters", {}).setdefault("options", {})
    options["systemMessage"] = ensure_mermaid_appendix(options.get("systemMessage", ""))


def patch_polish_answer_structure(nodes):
    polish = nodes["Polish Answer Structure"]
    polish["parameters"]["jsCode"] = POLISH_ANSWER_STRUCTURE_JS_NEW


def patch_connections(data):
    connections = data["connections"]
    connections["Polish Answer Structure"] = {
        "main": [[{"node": "Validate Mermaid Diagram", "type": "main", "index": 0}]]
    }
    connections["Validate Mermaid Diagram"] = {
        "main": [[{"node": "Normalize Agent Output", "type": "main", "index": 0}]]
    }


def main(path: str) -> None:
    phase2.main(path)

    workflow_path = Path(path)
    data = json.loads(workflow_path.read_text(encoding="utf-8-sig"))

    required = {
        "Auto Agent",
        "Polish Answer Structure",
        "Normalize Agent Output",
    }

    nodes = {node["name"]: node for node in data["nodes"]}
    missing = sorted(required - nodes.keys())
    if missing:
        raise RuntimeError(f"Missing expected nodes: {', '.join(missing)}")

    for node in NEW_NODES.values():
        upsert_node(data, node)

    nodes = {node["name"]: node for node in data["nodes"]}
    patch_auto_agent(nodes)
    patch_polish_answer_structure(nodes)
    patch_connections(data)

    workflow_path.write_text(
        json.dumps(data, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Patched {path}")


if __name__ == "__main__":
    targets = sys.argv[1:] if len(sys.argv) > 1 else ["wf_after.json", "wf.json"]
    for target in targets:
        main(target)
