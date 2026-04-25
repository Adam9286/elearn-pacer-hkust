"""Apply Phase 2 deterministic chat retrieval changes to a workflow export.

Idempotent: running twice produces the same result. Modifies in-place.
Run: python scripts/apply_phase2_workflow_patch.py wf_after.json
"""

import json
import sys
from pathlib import Path


CLASSIFY_INTENT_JS = r"""const item = $input.first().json;
const query = String(item.query || '').trim();
const normalized = query.toLowerCase();
const normalizedPhrase = normalized.replace(/[-_]+/g, ' ');
const words = query.match(/\b[\w/-]+\b/g) || [];

const multiWordKeywords = [
  'transport layer',
  'network layer',
  'application layer',
  'link layer',
  'physical layer',
  'slow start',
  'fast retransmit',
  'fast recovery',
  'congestion avoidance',
  'selective repeat',
  'go-back-n',
  'distance vector',
  'spanning tree',
  'sliding window',
  'bandwidth delay product',
  'flow control',
  'congestion control',
];

const singleWordKeywords = [
  'elec3120', 'tcp', 'udp', 'http', 'https', 'dns', 'dhcp', 'ip', 'ipv4', 'ipv6',
  'arp', 'icmp', 'nat', 'pat', 'cidr', 'subnet', 'routing', 'router', 'switch',
  'forwarding', 'dijkstra', 'ospf', 'bgp', 'checksum', 'throughput', 'latency',
  'propagation', 'transmission', 'queueing', 'queue', 'buffer', 'cwnd', 'ssthresh',
  'ack', 'acks', 'sequence', 'window', 'gbn', 'reno', 'cubic', 'wireshark',
  'ethernet', 'mac', 'packet', 'packets', 'socket', 'dash', 'streaming',
  'lecture', 'slide', 'slides', 'midterm', 'homework', 'exam',
];

const casualPatterns = [
  /^(hi|hello|hey|yo|thanks|thank you|thx|ok|okay|cool|nice)\b/,
  /\bhow are you\b/,
  /\bwho are you\b/,
  /\bwhat can you do\b/,
];

const questionPatterns = [
  /\bwhat\b/, /\bhow\b/, /\bwhy\b/, /\bwhen\b/, /\bexplain\b/, /\bcompare\b/,
  /\bdifference\b/, /\bderive\b/, /\bcalculate\b/, /\bsolve\b/, /\bshow\b/,
];

const keywordMatches = [];

for (const keyword of multiWordKeywords) {
  if (normalized.includes(keyword) || normalizedPhrase.includes(keyword)) {
    keywordMatches.push(keyword);
  }
}

for (const keyword of singleWordKeywords) {
  if (normalized.includes(keyword)) keywordMatches.push(keyword);
}

const uniqueKeywordMatches = [...new Set(keywordMatches)];
const hasQuestionPattern = questionPatterns.some((pattern) => pattern.test(normalized));
const looksCasual = casualPatterns.some((pattern) => pattern.test(normalized));
const hasAttachmentContext = Boolean(String(item.finalContext || '').trim());

let score = 0;

if (words.length >= 6) score += 0.12;
if (words.length >= 10) score += 0.12;
if (words.length >= 16) score += 0.08;
if (hasQuestionPattern) score += 0.18;
score += Math.min(uniqueKeywordMatches.length * 0.18, 0.54);
if (hasQuestionPattern && uniqueKeywordMatches.length >= 1) score += 0.12;
if (hasAttachmentContext) score += 0.08;
if (/\blecture\b|\bslide\b|\bmidterm\b|\bhomework\b/.test(normalized)) score += 0.14;
if (!query) score -= 0.5;
if (looksCasual && uniqueKeywordMatches.length === 0 && words.length <= 6) score -= 0.4;

const intent = score >= 0.42 ? 'course_question' : 'casual';
const confidence = Number(
  Math.min(0.98, 0.55 + Math.max(Math.abs(score - 0.42), 0)).toFixed(2)
);

return [{
  json: {
    ...item,
    intent,
    confidence,
    classifier_score: Number(score.toFixed(3)),
    classifier_keyword_matches: uniqueKeywordMatches,
  },
}];
"""


AGGREGATE_LECTURE_RETRIEVAL_JS = r"""const base = $('Classify Intent').first().json;
const rawItems = $input.all();

// Keep the panel's 0.75 target as the preferred bar, but avoid making fallback
// hinge on a single brittle score cutoff. Embedding score distributions drift.
const preferredThreshold = 0.75;
const softFloor = 0.70;
const minUsableChunks = 2;
const minContentChars = 80;

function asNum(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalize(item) {
  const payload = item.json || {};
  const document = payload.document || {};
  const metadata =
    document.metadata && typeof document.metadata === 'object'
      ? document.metadata
      : (payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {});

  const content = String(
    document.pageContent || payload.pageContent || payload.content || ''
  ).trim();

  return {
    source_type: 'Lecture Slides',
    lecture_id: metadata.lecture_id ?? null,
    lecture_title: metadata.lecture_title ?? null,
    slide_number: asNum(metadata.slide_number),
    page_number: asNum(metadata.page_number),
    document_title: metadata.document_title ?? metadata.lecture_title ?? metadata.filename ?? null,
    content,
    excerpt: content,
    similarity: typeof payload.score === 'number' ? payload.score : null,
  };
}

function sortRows(rows) {
  return [...rows].sort((a, b) => (b.similarity ?? -Infinity) - (a.similarity ?? -Infinity));
}

function dedupeRows(rows) {
  const seen = new Set();
  const deduped = [];

  for (const row of rows) {
    const key = [
      row.document_title ?? row.lecture_title ?? '',
      row.slide_number ?? '',
      row.page_number ?? '',
      row.content,
    ].join('|');

    if (!row.content || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

function buildContext(rows) {
  return rows
    .map((row, index) => {
      const labelParts = [row.document_title || row.lecture_title || 'Lecture Slides'];
      if (row.slide_number !== null) labelParts.push(`slide ${row.slide_number}`);
      if (row.page_number !== null) labelParts.push(`page ${row.page_number}`);
      return `[Lecture ${index + 1}] ${labelParts.join(', ')}\n${row.content}`;
    })
    .join('\n\n');
}

const normalizedRows = sortRows(
  dedupeRows(rawItems.map(normalize).filter((row) => row.content))
);
const usableRows = normalizedRows.filter((row) => row.content.length >= minContentChars);
const hasScores = normalizedRows.some((row) => typeof row.similarity === 'number');
const strictRows = hasScores
  ? usableRows.filter((row) => typeof row.similarity === 'number' && row.similarity >= preferredThreshold)
  : usableRows;
const topScore = normalizedRows[0]?.similarity ?? null;

let lectureMaterials = strictRows.slice(0, 5);
let sufficiencyReason = lectureMaterials.length >= minUsableChunks
  ? 'strict_threshold'
  : 'insufficient';

if (lectureMaterials.length < minUsableChunks) {
  const nearThresholdRows = hasScores
    ? usableRows.filter((row) => typeof row.similarity === 'number' && row.similarity >= softFloor)
    : usableRows;

  if (nearThresholdRows.length >= minUsableChunks) {
    lectureMaterials = nearThresholdRows.slice(0, 5);
    sufficiencyReason = 'soft_floor';
  } else if (!hasScores && usableRows.length >= minUsableChunks) {
    lectureMaterials = usableRows.slice(0, 5);
    sufficiencyReason = 'count_only';
  }
}

const lectureEvidenceSufficient = lectureMaterials.length >= minUsableChunks;

return [{
  json: {
    ...base,
    attachment_context: String(base.finalContext || '').trim(),
    lecture_similarity_threshold: preferredThreshold,
    lecture_similarity_soft_floor: softFloor,
    lecture_scores_available: hasScores,
    lecture_total_hits: normalizedRows.length,
    lecture_usable_hits: usableRows.length,
    lecture_top_score: topScore,
    lecture_retrieved_count: lectureMaterials.length,
    lecture_evidence_sufficient: lectureEvidenceSufficient,
    lecture_sufficiency_reason: sufficiencyReason,
    retrieved_materials: lectureMaterials,
    retrieved_context: buildContext(lectureMaterials),
    used_lecture_rag: lectureMaterials.length > 0,
    used_textbook_rag: false,
    retrieval_route: lectureEvidenceSufficient ? 'lecture_only' : 'needs_secondary_fallback',
  },
}];
"""


AGGREGATE_TEXTBOOK_RETRIEVAL_JS = r"""const lectureState = $('Aggregate Lecture Retrieval').first().json;
const rawItems = $input.all();

function unpackItems(items) {
  const firstJson = items[0]?.json || {};
  let body = null;

  if (firstJson.body && typeof firstJson.body === 'object') {
    body = firstJson.body;
  } else if (typeof firstJson.body === 'string') {
    try {
      body = JSON.parse(firstJson.body);
    } catch (error) {
      body = null;
    }
  }

  if (items.length === 1 && Array.isArray(firstJson.items)) {
    return firstJson.items.map((item) => item || {});
  }

  if (items.length === 1 && Array.isArray(body?.items)) {
    return body.items.map((item) => item || {});
  }

  return items.map((item) => item.json || {});
}

function asNum(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalize(item) {
  const payload = item || {};
  const document = payload.document || {};
  const metadata =
    document.metadata && typeof document.metadata === 'object'
      ? document.metadata
      : (payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {});
  const sourceMetadata =
    payload.source_metadata && typeof payload.source_metadata === 'object'
      ? payload.source_metadata
      : (metadata.source_metadata && typeof metadata.source_metadata === 'object'
          ? metadata.source_metadata
          : {});

  const content = String(
    document.pageContent || payload.pageContent || payload.content || ''
  ).trim();
  const pageNumber = asNum(metadata.page_number ?? sourceMetadata.page_number);
  const topic = payload.topic ?? metadata.topic ?? null;
  const sourceType = metadata.source_type === 'textbook'
    ? 'Textbook'
    : (
        sourceMetadata.homework_number
          ? 'Homework / Question Bank'
          : (sourceMetadata.exam_type ? `${sourceMetadata.exam_type} / Question Bank` : 'Question Bank')
      );

  return {
    source_type: sourceType,
    lecture_id: null,
    lecture_title: null,
    slide_number: null,
    page_number: pageNumber,
    document_title:
      metadata.document_title ??
      sourceMetadata.file ??
      metadata.filename ??
      topic ??
      'Secondary Course Corpus',
    chapter: metadata.chapter ?? sourceMetadata.section ?? null,
    topic,
    question_type: payload.question_type ?? metadata.question_type ?? null,
    source_file: sourceMetadata.file ?? null,
    exam_type: sourceMetadata.exam_type ?? null,
    exam_period: sourceMetadata.exam_period ?? null,
    content,
    excerpt: content,
    similarity: typeof payload.score === 'number' ? payload.score : null,
  };
}

function sortRows(rows) {
  return [...rows].sort((a, b) => (b.similarity ?? -Infinity) - (a.similarity ?? -Infinity));
}

function dedupeRows(rows) {
  const seen = new Set();
  const deduped = [];

  for (const row of rows) {
    const key = [
      row.document_title ?? '',
      row.chapter ?? '',
      row.page_number ?? '',
      row.content,
    ].join('|');

    if (!row.content || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

function buildContext(label, rows) {
  if (!rows.length) return '';
  return rows
    .map((row, index) => {
      const labelParts = [row.document_title || label];
      if (row.topic) labelParts.push(`topic ${row.topic}`);
      if (row.chapter) labelParts.push(String(row.chapter));
      if (row.page_number !== null) labelParts.push(`page ${row.page_number}`);
      if (row.question_type) labelParts.push(String(row.question_type));
      return `[${label} ${index + 1}] ${labelParts.join(', ')}\n${row.content}`;
    })
    .join('\n\n');
}

const lectureMaterials = Array.isArray(lectureState.retrieved_materials)
  ? lectureState.retrieved_materials
  : [];
const secondaryPayloads = unpackItems(rawItems);
const secondaryMaterials = sortRows(
  dedupeRows(secondaryPayloads.map(normalize).filter((row) => row.content))
).slice(0, 4);

const combinedMaterials = [...lectureMaterials, ...secondaryMaterials];
const combinedContextParts = [
  buildContext('Lecture', lectureMaterials),
  buildContext('Secondary', secondaryMaterials),
].filter(Boolean);

return [{
  json: {
    ...lectureState,
    textbook_total_hits: secondaryMaterials.length,
    secondary_source_mode: secondaryMaterials.some((row) => row.source_type === 'Textbook')
      ? 'elec3120_textbook_match_textbook'
      : 'secondary_corpus',
    retrieved_materials: combinedMaterials,
    retrieved_context: combinedContextParts.join('\n\n'),
    used_textbook_rag: secondaryMaterials.length > 0,
    retrieval_route: secondaryMaterials.length > 0
      ? 'lecture_then_secondary'
      : 'lecture_sparse_no_secondary',
  },
}];
"""


PREPARE_AGENT_INPUT_JS = r"""const item = $input.first().json;

const retrievedMaterials = Array.isArray(item.retrieved_materials)
  ? item.retrieved_materials
  : [];
const attachmentContext = String(item.attachment_context || item.finalContext || '').trim();
const retrievedContext = String(item.retrieved_context || '').trim();

const contextSections = [];
if (attachmentContext) {
  contextSections.push(`Uploaded attachment context:\n${attachmentContext}`);
}
if (retrievedContext) {
  contextSections.push(`Course retrieval context:\n${retrievedContext}`);
}

return [{
  json: {
    query: item.query || '',
    sessionId: item.sessionId || '',
    mode: item.mode || 'auto',
    responseStyle: item.responseStyle || 'full_explanation',
    styleInstruction:
      item.styleInstruction ||
      'Teach from the basics with clear structure and grounded examples.',
    intent: item.intent || 'casual',
    confidence: typeof item.confidence === 'number' ? item.confidence : null,
    finalContext: contextSections.join('\n\n').trim(),
    attachment_context: attachmentContext,
    retrieved_context: retrievedContext,
    retrieved_materials: retrievedMaterials,
    sourcesForUser: retrievedMaterials.length > 0
      ? `Deterministic retrieval supplied ${retrievedMaterials.length} grounding passages.`
      : (attachmentContext ? 'Using uploaded attachment context only.' : 'No retrieval context needed.'),
    used_lecture_rag: Boolean(item.used_lecture_rag),
    used_textbook_rag: Boolean(item.used_textbook_rag),
    isSlideChat: Boolean(item.isSlideChat),
    slideContext: item.slideContext || null,
  },
}];
"""


AUTO_AGENT_TEXT_NEW = r"""=User Question:
"{{ $json.query }}"

Grounding context (course retrieval and/or uploaded attachments; may be empty):
{{ $json.finalContext || "" }}

responseStyle: {{ $json.responseStyle || 'full_explanation' }}
mode: {{ $json.mode || 'auto' }}
intent: {{ $json.intent || 'course_question' }}

Style instruction:
{{ $json.styleInstruction || 'Teach from the basics with clear structure.' }}

Use the grounding context as the primary factual basis when it is present. If it is empty, answer conservatively from general networking knowledge.
Teach for an HKUST university student whose English may be a second language. Keep the structure compact.
Then emit a SINGLE JSON object conforming to the StructuredAnswer schema and the responseStyle contract. Output ONLY the JSON object. No prose, no code fences.
"""


AUTO_AGENT_SYSTEM_NEW = r"""=You are the AI tutor for HKUST ELEC3120 (Computer Networks).
Help one student understand one concept. Not a study guide.

## ESL-friendly tutor contract
- Use short sentences.
- Define important terms before using them heavily.
- Define acronyms the first time when needed.
- Avoid idioms, metaphors, and slang.
- Keep one main idea per paragraph or bullet.
- Use one clear example only when it improves understanding.
- Prefer precise, simple wording over dense textbook wording.

## Output contract - obey always
Output a SINGLE JSON object and NOTHING else. No preamble. No trailing prose. No code fences. The entire response is parsed with JSON.parse.

The JSON object conforms exactly to this StructuredAnswer schema:

{
  "response_style": "quick_answer" | "full_explanation",
  "question_type": "comparison" | "concept" | "process" | "calculation" | "factual" | "casual",
  "title": string,
  "summary": string | null,
  "main_explanation": string,
  "table": { "headers": string[], "rows": string[][] } | null,
  "diagram": { "type": "mermaid", "code": string } | null,
  "elec3120_context": string | null,
  "exam_tip": string | null,
  "check_understanding": string | null,
  "calculation_steps": {
    "setup": string,
    "steps": string[],
    "answer": string,
    "common_mistakes": string | null
  } | null
}

JSON rules:
- response_style MUST equal {{ $json.responseStyle || 'full_explanation' }}.
- Unused optional fields MUST be null. Never omit keys and never use empty strings for unused fields.
- Never use markdown headings inside main_explanation. The UI renders sections.
- Keep strings clean UTF-8. Prefer ASCII arrows (->) over decorative arrows.
- Escape double quotes inside strings. Do not include trailing commas.

## Grounding
1. When grounding context is present, use it as the primary factual basis.
2. Do not mention retrieval, search, tools, or "provided context" in the answer.
3. Do not include inline citations in any field value. No [Lecture N, Slide X], no [Textbook, p.Y]. The UI shows Sources separately.
4. If grounding context is empty and the question is casual or off-topic, answer briefly and set question_type to "casual".
5. If grounding context is empty and the question is still course-related, answer conservatively from general networking knowledge and make uncertainty explicit when needed.
6. No emoji, filler openers, or apologies.

## Formatting inside string fields
- Inline math: $...$   Block math: $$...$$
- Backticks are only for code, protocol names, flags, and ports.
- Bold key terms where helpful.
- Prefer concrete progressions such as cwnd 1 -> 2 -> 4 -> 8 per RTT.
- Keep formatting simple. Avoid stacked optional sections unless they clearly help.

## Response style contract
If responseStyle is quick_answer:
- Goal: concise answer, quick recap, or simple conceptual answer.
- title: short and direct.
- summary: null unless a single recap sentence clearly improves skimming.
- main_explanation: normally under 140 words and formatted as 3-5 short bullets or numbered steps. Each bullet should usually be one sentence.
- table: null unless the student asks for a comparison or explicitly asks for a table.
- diagram: null unless the student explicitly asks for a diagram.
- calculation_steps: include only when the student asks for a worked example, step-by-step solution, or calculation.
- check_understanding: null unless the student explicitly asks to be tested.
- exam_tip: null unless the student explicitly asks for exam wording, traps, marking hints, or common mistakes.
- elec3120_context: usually null. Include only if one short course-framing line is genuinely useful.

If responseStyle is full_explanation:
- Goal: teach from basics with more depth and step-by-step guidance.
- summary: required unless the question is casual. Keep it to one sentence.
- main_explanation: teach in this order: big idea -> how it works -> concrete example -> exam trap.
- Keep each part compact. Use short paragraphs or short bullets. Do not add extra sections unless the student asks.
- Use at most one major artifact by default. A major artifact means table or diagram.
- Use a table for comparisons or component breakdowns.
- Use a diagram for processes, message flow, topology, or state change.
- Do not include both table and diagram unless the student explicitly asks for both.
- check_understanding: optional. Prefer it only when no table or diagram is needed, or when the student asks for a self-check.
- calculation_steps: include for calculations or when the student explicitly asks for a worked example.
- elec3120_context: optional and brief.
- exam_tip: optional. Use it only when the student asks for exam phrasing/traps or when one short trap line materially helps.

## Capabilities requested by the student
- If the student asks for a worked example, populate calculation_steps even though worked example is not a response mode.
- If the student asks for a diagram, populate diagram with valid Mermaid.
- If the student asks for exam wording or traps, populate exam_tip.

## Final self-check before emitting
1. Output is a single JSON object parseable by JSON.parse.
2. response_style, question_type, title, summary, main_explanation, table, diagram, elec3120_context, exam_tip, check_understanding, and calculation_steps keys are present.
3. response_style equals {{ $json.responseStyle || 'full_explanation' }}.
4. No inline citations or retrieval meta-narration appear in string fields.
5. quick_answer does not include optional artifacts unless the contract allows them.
6. full_explanation keeps at most one major artifact unless the student explicitly asked for both.
7. Required style contract is satisfied.
"""


EXTRACT_TOOL_RESULTS_NEW = r"""const input = $input.first().json;

let cleanAnswer = String(input.output || input.text || input.answer || '')
  .replace(/<think>[\s\S]*?<\/think>/g, '')
  .trim();

const materials = Array.isArray(input.retrieved_materials) ? input.retrieved_materials : [];

return [{
  json: {
    answer: cleanAnswer,
    retrieved_materials: materials,
  },
}];
"""


NEW_NODES = {
    "Classify Intent": {
        "parameters": {"jsCode": CLASSIFY_INTENT_JS},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [-160, 2960],
        "id": "5e8f305e-5471-4e68-84b6-f11aaafdfd01",
        "name": "Classify Intent",
    },
    "Intent Is Course Question?": {
        "parameters": {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "strict",
                    "version": 2,
                },
                "conditions": [
                    {
                        "leftValue": "={{ $json.intent }}",
                        "rightValue": "course_question",
                        "operator": {
                            "type": "string",
                            "operation": "equals",
                        },
                        "id": "8040f828-c2e6-4b91-a5f0-f8a9f1fcb251",
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [32, 2960],
        "id": "4a5f94dd-f5d1-4ef7-a0df-86e9a1ce62ac",
        "name": "Intent Is Course Question?",
    },
    "Aggregate Lecture Retrieval": {
        "parameters": {"jsCode": AGGREGATE_LECTURE_RETRIEVAL_JS},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [720, 2896],
        "id": "c35bfe32-0790-4d25-bc50-7990850b7c63",
        "name": "Aggregate Lecture Retrieval",
    },
    "Lecture Evidence Sufficient?": {
        "parameters": {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "strict",
                    "version": 2,
                },
                "conditions": [
                    {
                        "leftValue": "={{ $json.lecture_evidence_sufficient }}",
                        "operator": {
                            "type": "boolean",
                            "operation": "true",
                            "singleValue": True,
                        },
                        "rightValue": "",
                        "id": "c8c3068e-93b2-4664-8f7b-e64591e2e2d4",
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [912, 2896],
        "id": "1d20d8ba-bd34-4d50-af0d-11d45481c6d5",
        "name": "Lecture Evidence Sufficient?",
    },
    "Aggregate Textbook Retrieval": {
        "parameters": {"jsCode": AGGREGATE_TEXTBOOK_RETRIEVAL_JS},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1232, 3088],
        "id": "aa98f4c4-50bf-4c22-a7b0-e427ee0e80f6",
        "name": "Aggregate Textbook Retrieval",
    },
    "Prepare Agent Input": {
        "parameters": {"jsCode": PREPARE_AGENT_INPUT_JS},
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1232, 2896],
        "id": "1260b18b-0c4d-4503-9596-ebdd4bb4741d",
        "name": "Prepare Agent Input",
    },
    "Merge Agent Context": {
        "parameters": {
            "mode": "combine",
            "combineBy": "combineByPosition",
            "options": {},
        },
        "type": "n8n-nodes-base.merge",
        "typeVersion": 3.2,
        "position": [336, 3088],
        "id": "f47b0601-2dd2-4ed6-ac7c-7cc4650f3902",
        "name": "Merge Agent Context",
    },
}


def upsert_node(data, new_node):
    for index, node in enumerate(data["nodes"]):
        if node["name"] == new_node["name"]:
            data["nodes"][index] = new_node
            return
    data["nodes"].append(new_node)


def patch_vector_store_nodes(nodes):
    lecture = nodes["Supabase Retrieve Lecture Notes"]
    lecture["parameters"] = {
        "mode": "load",
        "tableName": lecture["parameters"]["tableName"],
        "prompt": "={{ $('Classify Intent').first().json.query }}",
        "topK": "={{ 5 }}",
        "options": {
            "queryName": "match_lecturenotes",
        },
    }

    textbook = nodes["Supabase (Retrieve Textbook)"]
    textbook["parameters"] = {
        "mode": "load",
        "tableName": {
            "__rl": True,
            "value": "elec3120_textbook",
            "mode": "list",
            "cachedResultName": "elec3120_textbook",
        },
        "prompt": "={{ $('Classify Intent').first().json.query }}",
        "topK": "={{ 3 }}",
        "options": {
            "queryName": "match_textbook",
        },
    }
    textbook["type"] = "@n8n/n8n-nodes-langchain.vectorStoreSupabase"
    textbook["typeVersion"] = 1.3
    textbook["credentials"] = {
        "supabaseApi": {"id": "FqXaEHnoK8HR3Mfy", "name": "Supabase account"}
    }


def patch_auto_agent(nodes):
    auto_agent = nodes["Auto Agent"]
    auto_agent["parameters"]["text"] = AUTO_AGENT_TEXT_NEW
    auto_agent["parameters"]["options"]["systemMessage"] = AUTO_AGENT_SYSTEM_NEW


def patch_extract_tool_results(nodes):
    nodes["Extract Tool Results"]["parameters"]["jsCode"] = EXTRACT_TOOL_RESULTS_NEW


def patch_connections(data):
    connections = data["connections"]

    build_final = connections.setdefault("Build Final Context", {})
    build_final["main"] = [[{"node": "Classify Intent", "type": "main", "index": 0}]]

    connections["Classify Intent"] = {
        "main": [[{"node": "Intent Is Course Question?", "type": "main", "index": 0}]]
    }

    connections["Intent Is Course Question?"] = {
        "main": [
            [{"node": "Supabase Retrieve Lecture Notes", "type": "main", "index": 0}],
            [{"node": "Prepare Agent Input", "type": "main", "index": 0}],
        ]
    }

    connections["Supabase Retrieve Lecture Notes"]["main"] = [
        [{"node": "Aggregate Lecture Retrieval", "type": "main", "index": 0}]
    ]
    connections["Supabase Retrieve Lecture Notes"].pop("ai_tool", None)

    connections["Aggregate Lecture Retrieval"] = {
        "main": [[{"node": "Lecture Evidence Sufficient?", "type": "main", "index": 0}]]
    }

    connections["Lecture Evidence Sufficient?"] = {
        "main": [
            [{"node": "Prepare Agent Input", "type": "main", "index": 0}],
            [{"node": "Supabase (Retrieve Textbook)", "type": "main", "index": 0}],
        ]
    }

    connections["Supabase (Retrieve Textbook)"]["main"] = [
        [{"node": "Aggregate Textbook Retrieval", "type": "main", "index": 0}]
    ]
    connections["Supabase (Retrieve Textbook)"].pop("ai_tool", None)

    embedding_connections = connections.get("Embeddings HuggingFace Inference", {}).get("ai_embedding")
    target_edge = {"node": "Supabase (Retrieve Textbook)", "type": "ai_embedding", "index": 0}
    if embedding_connections:
        already_present = any(
            any(edge.get("node") == "Supabase (Retrieve Textbook)" for edge in row)
            for row in embedding_connections
        )
        if not already_present:
            embedding_connections[0].append(target_edge)
    else:
        connections.setdefault("Embeddings HuggingFace Inference", {})["ai_embedding"] = [[target_edge]]

    connections["Aggregate Textbook Retrieval"] = {
        "main": [[{"node": "Prepare Agent Input", "type": "main", "index": 0}]]
    }

    connections["Prepare Agent Input"] = {
        "main": [[
            {"node": "Auto Agent", "type": "main", "index": 0},
            {"node": "Merge Agent Context", "type": "main", "index": 0},
        ]]
    }

    auto_agent_connections = connections.setdefault("Auto Agent", {})
    auto_agent_connections["main"] = [[{"node": "Merge Agent Context", "type": "main", "index": 1}]]

    connections["Merge Agent Context"] = {
        "main": [[{"node": "Extract Tool Results", "type": "main", "index": 0}]]
    }


def main(path: str) -> None:
    workflow_path = Path(path)
    data = json.loads(workflow_path.read_text(encoding="utf-8-sig"))

    required = {
        "Build Final Context",
        "Auto Agent",
        "Extract Tool Results",
        "Supabase Retrieve Lecture Notes",
        "Supabase (Retrieve Textbook)",
    }

    nodes = {node["name"]: node for node in data["nodes"]}
    missing = sorted(required - nodes.keys())
    if missing:
        raise RuntimeError(f"Missing expected nodes: {', '.join(missing)}")

    for node in NEW_NODES.values():
        upsert_node(data, node)

    nodes = {node["name"]: node for node in data["nodes"]}

    patch_vector_store_nodes(nodes)
    patch_auto_agent(nodes)
    patch_extract_tool_results(nodes)
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
