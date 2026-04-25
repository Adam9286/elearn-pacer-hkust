"""Apply Phase 1 trace + envelope changes to a workflow export.

Idempotent: running twice produces the same result. Modifies in-place.
Run: python scripts/apply_phase1_workflow_patch.py wf_after.json
"""

import json
import re
import sys
from pathlib import Path


PARSE_INCOMING_TRACE_BLOCK = """// Phase 1: trace_id is generated here at the entry point so every downstream
// node can stamp/propagate a single id per request.
const traceId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
  ? crypto.randomUUID()
  : 'tr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
const traceStartedAt = Date.now();

"""


POLISH_ANSWER_NEW = r"""// Parse and sanitize the structured model answer before returning it.
// Avoid regex editing raw JSON; parse first, then sanitize string fields recursively.

const item = $input.first().json;
const materials = Array.isArray(item.retrieved_materials) ? item.retrieved_materials : [];
const fence = String.fromCharCode(96);

// Phase 1 trace plumbing — pull trace_id and start time from Parse Incoming so
// the downstream Respond node can emit a single trace object per request.
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

function ensureShape(obj) {
  const out = sanitizeValue(obj && typeof obj === 'object' ? obj : {});
  out.response_style = normalizeStyle(out.response_style);
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
  }

  return out;
}

// Build a structured fallback answer when JSON parsing fails. Returning a
// well-formed StructuredAnswer keeps the frontend renderer happy.
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
  const parsed = JSON.parse(cleaned);
  const shaped = ensureShape(parsed);
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


NORMALIZE_AGENT_OUTPUT_NEW = r"""const input = $input.first().json;

// Clean the answer:
// 1. Remove DeepSeek's <think> tags so the user doesn't see the internal reasoning
// 2. Trim extra whitespace
let cleanAnswer = String(input.answer || '')
  .replace(/<think>[\s\S]*?<\/think>/g, '')
  .trim();

const materials = input.retrieved_materials || [];
const trace = input.trace || null;

// Return the clean answer without forcing any "[General Knowledge]" labels
return [{
  json: {
    answer: cleanAnswer,
    retrieved_materials: materials,
    trace: trace,
  }
}];
"""


RESPOND_BODY_NEW = (
    "={{ \n"
    "  JSON.stringify({\n"
    "    answer: $json.answer ?? \"\",\n"
    "    retrieved_materials: Array.isArray($json.retrieved_materials)\n"
    "      ? $json.retrieved_materials\n"
    "      : [],\n"
    "    citations: [],\n"
    "    trace: $json.trace || null\n"
    "  }) \n"
    "}}\n"
)


def patch_parse_incoming(code: str) -> str:
    if "Phase 1: trace_id is generated here" in code:
        return code  # idempotent

    # Inject trace gen right after `const raw = $input.first()?.json ?? {};`
    anchor = "const raw = $input.first()?.json ?? {};"
    if anchor not in code:
        raise RuntimeError("Parse Incoming: anchor line not found")
    code = code.replace(anchor, anchor + "\n\n" + PARSE_INCOMING_TRACE_BLOCK.rstrip())

    # Inject trace fields into both return shapes. Each return object has the
    # closing `}` of the json block followed by `,` and the closing of the
    # outer object. Easiest: find the literal `slideContext,\n      },\n    },`
    # patterns that exist in both returns and prepend trace fields.
    trace_fields = "        trace_id: traceId,\n        traceStartedAt,\n"

    # First return (no-attachment branch): ends with "        slideContext,\n      },\n    },\n  ];"
    pattern_no_attach = re.compile(
        r"(slideContext,\n)(\s+\},\n\s+\},\n\s+\];)",
        re.MULTILINE,
    )
    new_code, n1 = pattern_no_attach.subn(
        lambda m: m.group(1) + trace_fields + m.group(2),
        code,
        count=1,
    )

    # Second return (attachments map): the `slideContext,` is followed by
    # `\n  },\n}));` instead. Use a separate pattern.
    pattern_attach = re.compile(
        r"(slideContext,\n)(\s+\},\n\}\)\);)",
        re.MULTILINE,
    )
    new_code2, n2 = pattern_attach.subn(
        lambda m: m.group(1) + trace_fields + m.group(2),
        new_code,
        count=1,
    )

    if n1 != 1 or n2 != 1:
        raise RuntimeError(
            f"Parse Incoming: expected 2 trace-field injections, got {n1}+{n2}"
        )
    return new_code2


def patch_node(node, name, new_code):
    n = node.get("parameters", {})
    n["jsCode"] = new_code


def main(path: str) -> None:
    p = Path(path)
    data = json.loads(p.read_text(encoding="utf-8"))
    nodes = {n["name"]: n for n in data["nodes"]}

    # 1. Parse Incoming — minimal patch to add trace_id + traceStartedAt
    pi = nodes.get("Parse Incoming")
    if pi is None:
        raise RuntimeError("Parse Incoming node not found")
    pi["parameters"]["jsCode"] = patch_parse_incoming(pi["parameters"]["jsCode"])

    # 2. Polish Answer Structure — full rewrite (additive, preserves existing logic)
    pas = nodes.get("Polish Answer Structure")
    if pas is None:
        raise RuntimeError("Polish Answer Structure node not found")
    pas["parameters"]["jsCode"] = POLISH_ANSWER_NEW

    # 3. Normalize Agent Output — pass trace through
    nao = nodes.get("Normalize Agent Output")
    if nao is None:
        raise RuntimeError("Normalize Agent Output node not found")
    nao["parameters"]["jsCode"] = NORMALIZE_AGENT_OUTPUT_NEW

    # 4. Respond to Webhook — wrap with trace
    rtw = nodes.get("Respond to Webhook")
    if rtw is None:
        raise RuntimeError("Respond to Webhook node not found")
    rtw["parameters"]["responseBody"] = RESPOND_BODY_NEW

    # Use compact single-line JSON to match n8n's native export format and
    # keep git diffs focused on actual content changes (not reformat noise).
    p.write_text(
        json.dumps(data, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Patched {path}")


if __name__ == "__main__":
    targets = sys.argv[1:] if len(sys.argv) > 1 else ["wf_after.json", "wf.json"]
    for t in targets:
        main(t)
