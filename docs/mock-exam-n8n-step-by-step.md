# Mock Exam n8n Upgrade: Step-by-Step Guide

This is the **beginner-friendly implementation guide** for upgrading your current mock exam workflow.

Use this together with:

- [`docs/mock-exam-n8n-upgrade.md`](/c:/Users/adamb/OneDrive/Desktop/FYP/elearn-pacer-hkust/docs/mock-exam-n8n-upgrade.md)

This guide is written against the workflow you pasted.

Update 2026-03-31:

- For the current diagram/PDF reliability fix, use [`docs/mock-exam-n8n-robust-workflow.md`](/c:/Users/adamb/OneDrive/Desktop/FYP/elearn-pacer-hkust/docs/mock-exam-n8n-robust-workflow.md).
- This older guide is still useful for the structured exam split, but it does not reflect the latest hardening decision:
  no Code-node HTTP, no external diagram URLs inside PDF HTML, and structured exam JSON must survive PDF failure.

---

## What We Are Fixing

Your current workflow has 4 immediate problems:

1. It returns only PDF links.
2. It still mixes the answer key into the student PDF.
3. It does not understand `quick_practice` vs `exam_simulation`.
4. It does not validate the generated structured exam before sending it onward.

We are fixing those first.

That means after this upgrade:

- `quick_practice` returns structured JSON directly
- `exam_simulation` returns structured JSON **and** a PDF link
- the student PDF does **not** contain the answer key
- the app can immediately use the structured exam data

---

## Before You Start

1. Duplicate your current workflow in n8n first.
2. Rename the duplicate to something like:
   `FYP V8 - Mock Exam Upgrade`
3. Work only on the duplicate.

Do **not** edit the old workflow directly until the new one works.

---

## Final Workflow Shape

After the upgrade, the relevant part of your workflow should look like this:

```text
Exam Request Webhook
  -> Parse Request
  -> Question Generator
  -> Parse Questions
  -> Validate Structured Exam
  -> Render Diagrams
  -> Is Exam Simulation? (IF)

False branch (quick_practice):
  -> Build Quick Practice Response
  -> Return Link1

True branch (exam_simulation):
  -> Build Student Exam HTML
  -> Convert HTML to PDF
  -> Convert to TXT Binary1
  -> Upload to Google Drive1
  -> Share file1
  -> Build Exam Simulation Response
  -> Return Link1

Side branch from Upload to Google Drive1:
  -> Save Exam Metadata1
```

---

## Step 1: Replace `Parse Request`

Open the node:

- `Parse Request`

Replace the entire JavaScript with this:

```js
const raw = $input.first().json;
const body = typeof raw.body === 'string' ? JSON.parse(raw.body) : (raw.body || raw);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  return [...arr].sort(() => 0.5 - Math.random());
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const mode = body.mode === 'quick_practice' ? 'quick_practice' : 'exam_simulation';
const topic = body.topic || 'Computer Networks';
const difficulty = ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium';
const includeTopics = Array.isArray(body.includeTopics) ? body.includeTopics.filter(Boolean) : [];
const excludeTopics = Array.isArray(body.excludeTopics) ? body.excludeTopics.filter(Boolean) : [];
const studentWeaknesses = Array.isArray(body.studentWeaknesses) ? body.studentWeaknesses : [];
const sessionId =
  typeof body.sessionId === 'string' && body.sessionId.trim()
    ? body.sessionId.trim()
    : `exam-${Date.now()}`;

const requestedNumMCQ = Number.parseInt(body.numMultipleChoice, 10);
const requestedNumOpenEnded = Number.parseInt(body.numOpenEnded, 10);

const numMultipleChoice = Number.isFinite(requestedNumMCQ)
  ? clamp(requestedNumMCQ, 5, 15)
  : 10;

const numOpenEnded = mode === 'quick_practice'
  ? 0
  : (Number.isFinite(requestedNumOpenEnded) ? clamp(requestedNumOpenEnded, 3, 7) : 5);

const difficultyAnchors = {
  easy: 'Homework 1-2 / direct recall and one-step application',
  medium: 'Homework 3-4 / multi-step application',
  hard: 'Midterm Sections E-F / chained reasoning and diagram-heavy analysis'
};

const archetypes = [
  {
    category: 'HTTP / Web Scenario',
    focusTopics: [
      'HTTP/1.0 vs HTTP/1.1',
      'Persistent vs non-persistent HTTP',
      'Web objects and TCP connections',
      'DASH / adaptive bitrate streaming'
    ],
    requiredDiagram: 'none',
    diagramInstructions: 'No diagram needed. Focus on scenario-based reasoning and progressive sub-parts.',
    sourceExamType: 'midterm',
    difficultyAnchor: difficultyAnchors[difficulty]
  },
  {
    category: 'Video Streaming / DASH',
    focusTopics: [
      'Adaptive bitrate streaming',
      'Manifest files and segment switching',
      'Buffer-aware streaming decisions',
      'Rate adaptation logic'
    ],
    requiredDiagram: 'none',
    diagramInstructions: 'No diagram needed. Focus on calculation plus reasoning about player behavior.',
    sourceExamType: 'homework',
    difficultyAnchor: difficultyAnchors[difficulty]
  },
  {
    category: 'TCP Header / Seq-Ack Fill-In',
    focusTopics: [
      'TCP sequence numbers',
      'TCP acknowledgment numbers',
      '3-way handshake and data transfer',
      'Seq/Ack ladder reasoning'
    ],
    requiredDiagram: 'sequenceDiagram',
    diagramInstructions: 'Write valid Mermaid sequenceDiagram code showing a TCP exchange with single-word participant names.',
    sourceExamType: 'midterm',
    difficultyAnchor: difficultyAnchors[difficulty]
  },
  {
    category: 'Network Performance Analysis',
    focusTopics: [
      'Transmission delay',
      'Propagation delay',
      'Throughput vs goodput',
      'Window sizing and bottleneck reasoning',
      'TCP Reno behavior under loss'
    ],
    requiredDiagram: 'graph LR',
    diagramInstructions: 'Write valid Mermaid graph LR code with quoted node labels and quoted edge labels that include link rate and delay.',
    sourceExamType: 'midterm',
    difficultyAnchor: difficultyAnchors[difficulty]
  },
  {
    category: 'Transport Reliability / Sliding Window',
    focusTopics: [
      'Go-Back-N',
      'Selective Repeat',
      'Sender and receiver window state',
      'Timeout and retransmission reasoning'
    ],
    requiredDiagram: 'sequenceDiagram',
    diagramInstructions: 'Write valid Mermaid sequenceDiagram code that helps trace sender and receiver behavior across time.',
    sourceExamType: 'midterm',
    difficultyAnchor: difficultyAnchors[difficulty]
  },
  {
    category: 'Routing / Topology Analysis',
    focusTopics: [
      'Dijkstra shortest path',
      'Distance Vector',
      'Count-to-infinity',
      'Spanning Tree Protocol',
      'NAT translation logic'
    ],
    requiredDiagram: 'graph LR',
    diagramInstructions: 'Write valid Mermaid graph LR code using single-word node IDs and quoted edge labels.',
    sourceExamType: 'homework',
    difficultyAnchor: difficultyAnchors[difficulty]
  }
];

const blueprint = [];

if (mode === 'exam_simulation') {
  const shuffled = shuffle(archetypes);

  for (let i = 0; i < numOpenEnded; i++) {
    const archetype = shuffled[i % shuffled.length];
    const focusTopic = pick(archetype.focusTopics);

    blueprint.push({
      questionNumber: numMultipleChoice + 1 + i,
      category: archetype.category,
      focusTopic,
      requiredDiagram: archetype.requiredDiagram,
      diagramInstructions: archetype.diagramInstructions,
      sourceExamType: archetype.sourceExamType,
      sourcePeriod: difficulty === 'hard' ? 'midterm recent' : 'homework + past paper',
      difficultyAnchor: archetype.difficultyAnchor
    });
  }
}

const networkContexts = [
  'HKUST campus network',
  'student dorm network',
  'video streaming platform',
  'small ISP backbone',
  'cloud-hosted learning platform'
];

const scenarioThemes = [
  'performance debugging',
  'streaming quality adaptation',
  'packet tracing',
  'routing instability investigation',
  'transport reliability troubleshooting'
];

const variation = {
  context: pick(networkContexts),
  theme: pick(scenarioThemes),
  bwRange: [Math.floor(Math.random() * 91) + 10, Math.floor(Math.random() * 901) + 100],
  delayRange: [Math.floor(Math.random() * 19) + 2, Math.floor(Math.random() * 151) + 50],
  blueprint,
  sourcePreferences: mode === 'quick_practice' ? ['homework', 'past_paper_mcq'] : ['midterm', 'homework'],
  selectedTopics: includeTopics,
  studentWeaknesses
};

const searchTerms = [
  topic,
  ...includeTopics,
  ...blueprint.map((item) => item.focusTopic),
  difficultyAnchors[difficulty],
  mode,
  'ELEC3120',
  'past paper remix',
  'question bank'
].filter(Boolean);

const uniqueSearchTerms = [...new Set(searchTerms)];

const search_query = `Represent this sentence for searching relevant passages: ${uniqueSearchTerms.join(' ')}`;

return [
  {
    json: {
      mode,
      topic,
      numMultipleChoice,
      numOpenEnded,
      difficulty,
      includeTopics,
      excludeTopics,
      studentWeaknesses,
      sessionId,
      difficultyAnchor: difficultyAnchors[difficulty],
      sourceStrategy: 'remix_with_lineage',
      outputContractVersion: 'v2',
      search_query,
      variation
    }
  }
];
```

What this changes:

- adds `mode`
- adds `sessionId`
- makes `quick_practice` return zero long-form questions
- upgrades the blueprint to professor-style question families
- preserves future support for weakness targeting

---

## Step 2: Replace `Question Generator` Prompt Text

Open the node:

- `Question Generator`

Set `Prompt Type` to `Define`.

Replace the main **Text** field with this:

```txt
=Generate a mock exam using the exact parameters below. Do NOT substitute your own defaults.

=== EXAM CONFIGURATION ===
Mode: {{ $json.mode }}
Topic: {{ $json.topic }}
Difficulty: {{ $json.difficulty }}
Difficulty Anchor: {{ $json.difficultyAnchor }}
Number of MCQs: {{ $json.numMultipleChoice }}
Number of Open-Ended: {{ $json.numOpenEnded }}
Included Topics: {{ JSON.stringify($json.includeTopics) }}
Student Weaknesses: {{ JSON.stringify($json.studentWeaknesses) }}

=== BLUEPRINT / VARIATION ===
{{ JSON.stringify($json.variation, null, 2) }}

=== SEARCH QUERY ===
{{ $json.search_query }}

=== OUTPUT CONTRACT ===
Return ONE raw JSON object only. No markdown fences. No commentary.

{
  "mcqs": [],
  "longForm": [],
  "metadata": {
    "mode": "{{ $json.mode }}",
    "topic": "{{ $json.topic }}",
    "difficulty": "{{ $json.difficulty }}",
    "difficultyAnchor": "{{ $json.difficultyAnchor }}",
    "generationStrategy": "remix_with_lineage",
    "variation": {},
    "sourceSummary": []
  }
}
```

---

## Step 3: Replace `Question Generator` System Prompt

In the same node, replace the **System Message** with this:

```txt
You are the LearningPacer Mock Exam Engine for ELEC3120 (Computer Networks) at HKUST.

You are generating questions for a course whose professor uses:
- progressive multi-part scenarios
- diagram-heavy reasoning
- transport/network performance calculations
- seq/ack tracing
- routing and protocol analysis

Your job is NOT to invent a generic exam.
Your job is to produce a high-fidelity remix of the professor's style using the retrieved question bank.

OUTPUT RULE:
- Return exactly ONE raw JSON object.
- No markdown fences.
- No explanatory text outside JSON.

RETRIEVAL RULES:
1. You MUST use the Supabase question bank retrieval tool.
2. Prefix any retrieval query with exactly:
   "Represent this sentence for searching relevant passages: "
3. The question bank stores lineage inside `source_metadata`, for example:
   - `source_metadata.file`
   - `source_metadata.section`
   - `source_metadata.exam_type`
   - `source_metadata.exam_period`
4. Use that lineage to keep question structure faithful to real past papers and homework.

MODE RULES:
1. If mode = "quick_practice":
   - Return exactly the requested number of MCQs.
   - Return zero open-ended questions unless the request explicitly asks for them.
   - Keep questions fast, focused, and drill-oriented.
   - Prefer homework-style and past-paper MCQ-style items.

2. If mode = "exam_simulation":
   - Return exactly the requested number of MCQs.
   - Return exactly the requested number of long-form questions.
   - Long-form questions must feel like professor-style scenario sections.
   - Multi-part progression is required.
   - Prefer midterm/homework lineage that resembles real exam sections.

MCQ RULES:
- Every MCQ must be based on retrieved material.
- Stay faithful to terminology and tested concepts in the question bank.
- Only make controlled remix changes:
  - different numbers
  - slightly reworded story
  - reordered options
  - equivalent distractor swap
- Do NOT drift to unrelated concepts.
- Distribute correct answers reasonably across A-E.

LONG-FORM RULES:
- Use the provided blueprint strictly.
- For each blueprint item:
  - match the category
  - match the focus topic
  - match the required diagram type
  - match the difficulty anchor
- The "question" field must contain only the scenario/background.
- Do NOT place sub-parts inside the "question" field.
- Put sub-parts only inside "sub_parts".
- Put Mermaid code only inside "diagram".
- If a diagram is included, end the question text with:
  "Refer to the diagram below."

PDF / STUDENT SAFETY RULE:
- Keep full solutions in JSON only.
- Do NOT phrase the question as if the student should already know the answer.

DIAGRAM RULES:
- Mermaid must be valid.
- Node IDs must be alphanumeric with no spaces.
- Graph labels must use quotes in brackets.
- Edge labels must use quoted pipes.

Examples:
graph LR
HostA["Host A"] -->|"10 Mbps 5 ms"| R1["Router 1"]
R1 -->|"50 Mbps 20 ms"| ServerX["Server"]

sequenceDiagram
participant Client
participant Server
Client->>Server: SYN, Seq=100
Server->>Client: SYN-ACK, Seq=400, Ack=101
Client->>Server: ACK, Ack=401

ACCURACY RULES:
- Double-check arithmetic.
- Double-check bits vs Bytes and ms vs seconds.
- Ensure total marks make sense.
- Ensure correct_answer letter matches the provided options.
- Ensure model_answer is consistent with sub_parts.

REQUIRED JSON FORMAT:

{
  "mcqs": [
    {
      "number": 1,
      "question": "text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "text",
      "marks": 2
    }
  ],
  "longForm": [
    {
      "number": 11,
      "question": "scenario only",
      "sub_parts": [
        { "label": "a", "text": "text", "marks": 4 },
        { "label": "b", "text": "text", "marks": 4 }
      ],
      "diagram": "graph LR ... OR sequenceDiagram ... OR null",
      "model_answer": "step-by-step solution",
      "marks": 8
    }
  ],
  "metadata": {
    "mode": "quick_practice or exam_simulation",
    "topic": "Computer Networks",
    "difficulty": "easy or medium or hard",
    "difficultyAnchor": "text",
    "generationStrategy": "remix_with_lineage",
    "variation": {},
    "sourceSummary": [
      {
        "file": "source file if known",
        "section": "section if known",
        "exam_type": "midterm/homework/etc if known",
        "exam_period": "period if known",
        "usage": "what this source influenced"
      }
    ]
  }
}
```

---

## Step 4: Add a New Code Node Called `Validate Structured Exam`

Create a new **Code** node between:

- `Parse Questions`
- `Render Diagrams`

Use this exact code:

```js
const payload = $input.first().json;
const req = $('Parse Request').first().json;

const mcqs = Array.isArray(payload.mcqs) ? payload.mcqs : [];
const longForm = Array.isArray(payload.longForm) ? payload.longForm : [];
const issues = [];

function addIssue(message) {
  issues.push(message);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function expectedOptionCount(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  return options.length;
}

if (mcqs.length !== req.numMultipleChoice) {
  addIssue(`Expected ${req.numMultipleChoice} MCQs but received ${mcqs.length}.`);
}

if (longForm.length !== req.numOpenEnded) {
  addIssue(`Expected ${req.numOpenEnded} open-ended questions but received ${longForm.length}.`);
}

mcqs.forEach((question, index) => {
  const label = `MCQ ${index + 1}`;
  if (!isNonEmptyString(question.question)) {
    addIssue(`${label} is missing question text.`);
  }

  if (!Array.isArray(question.options) || question.options.length < 4) {
    addIssue(`${label} must have at least 4 options.`);
  }

  if (!isNonEmptyString(question.correct_answer)) {
    addIssue(`${label} is missing correct_answer.`);
  } else {
    const letter = question.correct_answer.trim().toUpperCase();
    const optionIndex = letter.charCodeAt(0) - 65;
    if (optionIndex < 0 || optionIndex >= expectedOptionCount(question)) {
      addIssue(`${label} has a correct_answer that does not match its options.`);
    }
  }

  if (typeof question.marks !== 'number' || question.marks <= 0) {
    addIssue(`${label} must have a positive numeric marks value.`);
  }
});

longForm.forEach((question, index) => {
  const label = `Long-form ${index + 1}`;
  if (!isNonEmptyString(question.question)) {
    addIssue(`${label} is missing scenario text.`);
  }

  if (!Array.isArray(question.sub_parts) || question.sub_parts.length === 0) {
    addIssue(`${label} must include at least one sub-part.`);
  }

  if (question.diagram !== null && question.diagram !== undefined && typeof question.diagram !== 'string') {
    addIssue(`${label} diagram must be either null or a string.`);
  }

  if (!isNonEmptyString(question.model_answer)) {
    addIssue(`${label} is missing model_answer.`);
  }

  const totalSubPartMarks = Array.isArray(question.sub_parts)
    ? question.sub_parts.reduce((sum, part) => sum + (Number(part.marks) || 0), 0)
    : 0;

  if (typeof question.marks !== 'number' || question.marks <= 0) {
    addIssue(`${label} must have a positive numeric marks value.`);
  } else if (totalSubPartMarks !== question.marks) {
    addIssue(`${label} total sub-part marks (${totalSubPartMarks}) do not equal question marks (${question.marks}).`);
  }
});

if (issues.length > 0) {
  throw new Error(`Structured exam validation failed:\n- ${issues.join('\n- ')}`);
}

payload.metadata = {
  ...(payload.metadata || {}),
  mode: req.mode,
  topic: req.topic,
  difficulty: req.difficulty,
  difficultyAnchor: req.difficultyAnchor,
  variation: req.variation,
  includeTopics: req.includeTopics,
  validation: {
    passed: true,
    checkedAt: new Date().toISOString(),
    issueCount: 0
  }
};

return [{ json: payload }];
```

What this does:

- stops the workflow if the exam JSON is obviously broken
- checks counts, options, answer letters, marks, and sub-part totals
- keeps validation metadata inside the final response

---

## Step 5: Keep `Render Diagrams`

You can keep your current `Render Diagrams` node.

No changes are required right now.

---

## Step 6: Add an IF Node Called `Is Exam Simulation?`

Create a new **IF** node after:

- `Render Diagrams`

Name it:

- `Is Exam Simulation?`

Condition:

- `Value 1`:
  `={{ $('Parse Request').first().json.mode }}`
- `Operation`:
  `is equal to`
- `Value 2`:
  `exam_simulation`

This means:

- **true** branch = make PDF
- **false** branch = quick practice response only

---

## Step 7: Replace `Build Exam HTML`

Rename this node to:

- `Build Student Exam HTML`

Replace its entire code with this:

```js
const { mcqs, longForm, metadata } = $input.first().json;

const totalMarks =
  mcqs.reduce((sum, q) => sum + (q.marks || 2), 0) +
  longForm.reduce((sum, q) => sum + (q.marks || 0), 0);

const now = new Date();
const dateStr = now.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const diff = metadata?.difficulty || 'medium';
const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);

let mcqHtml = '';
for (const q of mcqs) {
  mcqHtml += `
    <div class="question">
      <div class="q-head">
        <span class="q-num">Question ${q.number}</span>
        <span class="marks">[${q.marks || 2} marks]</span>
      </div>
      <p>${q.question}</p>
      <div class="options">
        ${(q.options || []).map((o) => `<div class="opt">${o}</div>`).join('')}
      </div>
    </div>`;
}

let longFormHtml = '';
for (const q of longForm) {
  const diagram = q.diagramUrl
    ? `<div class="diagram-container">
         <img src="${q.diagramUrl}" alt="Diagram for Question ${q.number}" onerror="this.style.display='none'; this.nextElementSibling.innerHTML='[Diagram unavailable. Use the text prompt instead.]'" />
         <div class="diagram-caption">Figure for Question ${q.number}</div>
       </div>`
    : '';

  const parts = (q.sub_parts || []).map((sp) => `
    <div class="sub">
      <span class="sub-l">(${sp.label})</span>
      <span class="sub-t">${sp.text}</span>
      <span class="marks">[${sp.marks} marks]</span>
    </div>
  `).join('');

  longFormHtml += `
    <div class="question">
      <div class="q-head">
        <span class="q-num">Question ${q.number}</span>
        <span class="marks">[${q.marks || 0} marks]</span>
      </div>
      <p>${q.question}</p>
      ${diagram}
      ${parts}
      <div class="ans-space"></div>
    </div>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ELEC3120 Practice Exam</title>
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; }
    .cover { text-align: center; padding: 50px 20px; page-break-after: always; }
    .cover .uni { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .cover .dept { font-size: 11pt; color: #444; margin: 4px 0 35px; }
    .cover .code { font-size: 24pt; font-weight: bold; margin-bottom: 4px; }
    .cover .name { font-size: 16pt; margin-bottom: 30px; }
    .cover .etype { font-size: 14pt; font-weight: bold; border: 2px solid #333; display: inline-block; padding: 8px 35px; margin: 15px 0 30px; letter-spacing: 1px; }
    .info { margin: 0 auto; font-size: 11pt; text-align: left; max-width: 360px; }
    .info tr td { padding: 4px 12px; }
    .info tr td:first-child { font-weight: bold; text-align: right; }
    .sec-title { font-size: 13pt; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 4px; margin: 30px 0 18px; }
    .page-break { page-break-before: always; }
    .question { margin-bottom: 24px; page-break-inside: avoid; }
    .q-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
    .q-num { font-weight: bold; }
    .marks { font-size: 10pt; color: #555; font-style: italic; }
    .options { margin: 6px 0 0 22px; }
    .opt { margin: 2px 0; }
    .sub { margin: 6px 0 6px 22px; display: flex; gap: 8px; align-items: baseline; }
    .sub-l { font-weight: bold; min-width: 28px; }
    .sub-t { flex: 1; }
    .diagram-container { text-align: center; margin: 15px 0; padding: 10px; border: 1px solid #eee; background: #fafafa; }
    .diagram-container img { max-width: 90%; height: auto; }
    .diagram-caption { margin-top: 8px; font-size: 9pt; color: #666; font-style: italic; }
    .ans-space { height: 80px; border-bottom: 1px dashed #bbb; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="uni">Hong Kong University of Science and Technology</div>
    <div class="dept">Department of Electronic and Computer Engineering</div>
    <div class="code">ELEC3120</div>
    <div class="name">Computer Networks</div>
    <div class="etype">PRACTICE EXAMINATION</div>
    <table class="info">
      <tr><td>Date:</td><td>${dateStr}</td></tr>
      <tr><td>Difficulty:</td><td>${diffLabel}</td></tr>
      <tr><td>Total Questions:</td><td>${mcqs.length + longForm.length}</td></tr>
      <tr><td>Total Marks:</td><td>${totalMarks}</td></tr>
      <tr><td>Mode:</td><td>${metadata?.mode || 'exam_simulation'}</td></tr>
    </table>
    <div style="margin-top: 40px; text-align: left; max-width: 460px; margin-left: auto; margin-right: auto;">
      <h3>Instructions:</h3>
      <ol>
        <li>Answer ALL questions.</li>
        <li>Show all working clearly for calculation and open-ended questions.</li>
        <li>Marks are awarded for both method and final answer.</li>
        <li>This student PDF intentionally excludes the answer key.</li>
      </ol>
    </div>
  </div>

  <div class="sec-title">SECTION A - Multiple Choice Questions (${mcqs.length} questions)</div>
  ${mcqHtml}

  <div class="sec-title page-break">SECTION B - Open-Ended Questions (${longForm.length} questions)</div>
  ${longFormHtml}
</body>
</html>`;

return [{ json: { html, metadata } }];
```

Important:

- This is now a **student PDF only**
- There is **no answer key** inside the PDF anymore

---

## Step 8: Add `Build Quick Practice Response`

Create a new **Code** node on the **false** branch of `Is Exam Simulation?`.

Name it:

- `Build Quick Practice Response`

Use this code:

```js
const exam = $('Render Diagrams').first().json;
const req = $('Parse Request').first().json;

return [
  {
    json: {
      success: true,
      sessionId: req.sessionId,
      mode: req.mode,
      exam: {
        mcqs: exam.mcqs || [],
        longForm: exam.longForm || [],
        metadata: {
          ...(exam.metadata || {}),
          mode: req.mode,
          topic: req.topic,
          difficulty: req.difficulty,
          difficultyAnchor: req.difficultyAnchor,
          sessionId: req.sessionId
        }
      },
      pdf: null
    }
  }
];
```

Connect it to:

- `Return Link1`

---

## Step 9: Replace `Post Links1`

Rename this node to:

- `Build Exam Simulation Response`

Replace its code with this:

```js
const exam = $('Render Diagrams').first().json;
const req = $('Parse Request').first().json;
const upload = $('Upload to Google Drive1').first().json;

let fileId = upload?.id || null;
let link = upload?.webViewLink || null;
let downloadLink = upload?.webContentLink || null;

if (!fileId && link) {
  const match = link.match(/\/d\/([^/]+)/);
  if (match) {
    fileId = match[1];
  }
}

if (fileId && (!link || !link.startsWith('http'))) {
  link = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

if (fileId && (!downloadLink || !downloadLink.startsWith('http'))) {
  downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
}

return [
  {
    json: {
      success: true,
      sessionId: req.sessionId,
      mode: req.mode,
      exam: {
        mcqs: exam.mcqs || [],
        longForm: exam.longForm || [],
        metadata: {
          ...(exam.metadata || {}),
          mode: req.mode,
          topic: req.topic,
          difficulty: req.difficulty,
          difficultyAnchor: req.difficultyAnchor,
          sessionId: req.sessionId
        }
      },
      pdf: {
        fileId,
        link,
        downloadLink
      }
    }
  }
];
```

Connect this node to:

- `Return Link1`

---

## Step 10: Adjust Connections

Make your connections look like this:

### Core path

- `Exam Request Webhook` -> `Parse Request`
- `Parse Request` -> `Question Generator`
- `Question Generator` -> `Parse Questions`
- `Parse Questions` -> `Validate Structured Exam`
- `Validate Structured Exam` -> `Render Diagrams`
- `Render Diagrams` -> `Is Exam Simulation?`

### Quick practice path

- `Is Exam Simulation?` false -> `Build Quick Practice Response`
- `Build Quick Practice Response` -> `Return Link1`

### Exam simulation path

- `Is Exam Simulation?` true -> `Build Student Exam HTML`
- `Build Student Exam HTML` -> `Convert HTML to PDF`
- `Convert HTML to PDF` -> `Convert to TXT Binary1`
- `Convert to TXT Binary1` -> `Upload to Google Drive1`
- `Upload to Google Drive1` -> `Share file1`
- `Share file1` -> `Build Exam Simulation Response`
- `Build Exam Simulation Response` -> `Return Link1`

### Side metadata branch

- `Upload to Google Drive1` -> `Save Exam Metadata1`

Important:

- `Save Exam Metadata1` is now a side branch.
- The response does **not** need to wait for metadata storage to finish.
- The response waits only until the file is shared publicly.

---

## Step 11: Keep or Delete Old Nodes

After this upgrade:

- keep:
  - `Render Diagrams`
  - `Convert HTML to PDF`
  - `Convert to TXT Binary1`
  - `Upload to Google Drive1`
  - `Share file1`
  - `Save Exam Metadata1`
  - `Return Link1`

- rename/update:
  - `Build Exam HTML` -> `Build Student Exam HTML`
  - `Post Links1` -> `Build Exam Simulation Response`

- add:
  - `Validate Structured Exam`
  - `Is Exam Simulation?`
  - `Build Quick Practice Response`

---

## Step 12: Test It

Use these sample request bodies.

### Quick Practice test

```json
{
  "mode": "quick_practice",
  "topic": "Computer Networks",
  "numMultipleChoice": 5,
  "numOpenEnded": 3,
  "difficulty": "medium",
  "includeTopics": ["Lecture 1: Introduction", "Lecture 2: Transport Layer"],
  "excludeTopics": [],
  "sessionId": "exam-test-quick-001"
}
```

Expected result:

- `success: true`
- `mode: "quick_practice"`
- `exam.mcqs` has 5 items
- `exam.longForm` has 0 items
- `pdf` is `null`

### Exam Simulation test

```json
{
  "mode": "exam_simulation",
  "topic": "Computer Networks",
  "numMultipleChoice": 10,
  "numOpenEnded": 5,
  "difficulty": "hard",
  "includeTopics": ["Lecture 1: Introduction", "Lecture 2: Transport Layer", "Lecture 3: Network Layer"],
  "excludeTopics": [],
  "sessionId": "exam-test-sim-001"
}
```

Expected result:

- `success: true`
- `mode: "exam_simulation"`
- `exam.mcqs` has 10 items
- `exam.longForm` has 5 items
- `pdf.link` is present
- student PDF has no answer key section

---

## Step 13: Optional Next Upgrade - AI Verifier

Once the basic upgrade works, add a second AI pass after `Validate Structured Exam`.

Do this only after the basic path is stable.

Suggested node name:

- `Question Verifier`

Suggested system prompt:

```txt
You are a strict exam quality verifier for ELEC3120.

You will receive an already-structured mock exam JSON.
Your task is to correct subtle quality problems while preserving the JSON format.

Check for:
- arithmetic mistakes
- wrong answer letters
- mismatched marks
- Mermaid syntax problems
- inconsistent model answers
- weak professor-style fidelity

Rules:
- Return corrected JSON only.
- Do not add commentary.
- Preserve the same top-level schema.
- Do not reduce the number of questions.
```

This is useful, but not the first thing to build.

---

## Recommended Order

Do these in order:

1. Replace `Parse Request`
2. Replace `Question Generator` prompts
3. Add `Validate Structured Exam`
4. Add `Is Exam Simulation?`
5. Replace `Build Student Exam HTML`
6. Add `Build Quick Practice Response`
7. Replace `Build Exam Simulation Response`
8. Fix the connections
9. Test quick practice
10. Test exam simulation

If you follow that exact order, the upgrade is manageable.
