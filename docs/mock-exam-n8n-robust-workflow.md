# Mock Exam n8n Robust Workflow Guide

This is the current source of truth for hardening the mock-exam workflow against diagram and PDF failures.

Use this when you want:

- structured exam JSON to always come back
- PDF generation to be best-effort instead of all-or-nothing
- no unsupported HTTP calls inside Code nodes
- no external image URLs inside the HTML sent to PDFShift

This guide is written to fit your existing workflow shape with the least disruptive changes.

---

## What Changes

The current workflow already does the important part first:

`Parse Request -> Question Generator -> Parse Questions -> Validate Structured Exam`

That part stays.

The revision is about the diagram and PDF section only.

Instead of:

```text
Validate Structured Exam
  -> Render Diagrams
  -> Is Exam Simulation?
```

you should move to:

```text
Validate Structured Exam
  -> Prepare Diagram Jobs
  -> Has Diagram Jobs? (IF)

True:
  -> Render Diagram SVG (HTTP Request)
  -> Render Diagrams

False:
  -> Render Diagrams

Render Diagrams
  -> Is Exam Simulation?

Exam Simulation branch:
  -> Build Student Exam HTML
  -> Convert HTML to PDF  [continue on error]
  -> Has PDF Binary? (IF)

True:
  -> Convert to TXT Binary1
  -> Upload to Google Drive1
  -> Share file1
  -> Build Exam Simulation Response
  -> Return Link1

False:
  -> Build Exam Simulation Response
  -> Return Link1
```

Key idea:

- `Prepare Diagram Jobs` creates one job per diagram
- `Render Diagram SVG` fetches SVG using an `HTTP Request` node
- `Render Diagrams` reassembles the full exam JSON and attaches inline SVG/data URIs
- `Build Exam Simulation Response` must work even when no PDF exists

Real execution note from 2026-03-31:

- In the user's live run, `Render Diagram SVG` returned the raw SVG but did not preserve `questionIndex`
- That caused `Render Diagrams` to lose the mapping back to the correct open-ended question
- The fix below makes `Render Diagrams` recover diagram metadata from `Prepare Diagram Jobs` by item position
- Separate issue: validation must reject any question that says `Refer to the diagram below.` while `diagram` is null

---

## Fastest Hotfix Path

If your workflow already looks like this:

```text
Validate Structured Exam
  -> Prepare Diagram Jobs
  -> Has Diagram Jobs?
    -> true: Render Diagram SVG
    -> false: Render Diagrams
Render Diagram SVG
  -> Render Diagrams
```

then the fastest fix is:

1. Replace `Validate Structured Exam` with the full code below.
2. Replace `Render Diagrams` with the full code below.
3. Leave `Prepare Diagram Jobs` as-is.
4. Leave `Render Diagram SVG` as-is.
5. Run one test exam with `5 MCQ + 3 OE`.

That is enough to fix the exact live bug:

- `Render Diagram SVG` returned raw SVG
- but dropped `questionIndex`
- so `Render Diagrams` could not attach the SVG back to Q8

It also fixes the second bug:

- Q6 said `Refer to the diagram below.`
- but `diagram` was null
- and validation incorrectly passed

If `Validate Structured Exam` now fails with an error like:

- `Expected 5 MCQs but received 8`
- `MCQ 6 is missing question text`
- `MCQ 6 must have at least 4 options`

that means the LLM returned malformed JSON shape and placed long-form questions inside `mcqs`.

In that case, add the `Normalize Exam Shape` node below before validation.

---

## Optional Safety Net: Add `Normalize Exam Shape`

This is recommended.

Put it between:

```text
Parse Questions
  -> Normalize Exam Shape
  -> Validate Structured Exam
```

Why:

- sometimes the LLM returns all 8 questions inside `mcqs`
- questions 6-8 are actually long-form, but they are in the wrong array
- this node automatically moves malformed "MCQ" items into `longForm` before validation

### Step A: Add a new Code node

Name it:

- `Normalize Exam Shape`

Connect:

- `Parse Questions -> Normalize Exam Shape`
- `Normalize Exam Shape -> Validate Structured Exam`

### Step B: Paste this full code

```js
const payload = $input.first().json;

const rawMcqs = Array.isArray(payload.mcqs) ? payload.mcqs : [];
const rawLongForm = Array.isArray(payload.longForm) ? payload.longForm : [];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function looksLikeMcq(question) {
  return (
    question &&
    typeof question === 'object' &&
    isNonEmptyString(question.question) &&
    Array.isArray(question.options) &&
    question.options.length >= 4 &&
    isNonEmptyString(question.correct_answer)
  );
}

function looksLikeLongForm(question) {
  return (
    question &&
    typeof question === 'object' &&
    isNonEmptyString(question.question) &&
    Array.isArray(question.sub_parts) &&
    question.sub_parts.length > 0
  );
}

const mcqs = [];
const longForm = [...rawLongForm];

for (const item of rawMcqs) {
  if (looksLikeMcq(item)) {
    mcqs.push(item);
    continue;
  }

  if (looksLikeLongForm(item)) {
    longForm.push(item);
    continue;
  }

  if (item && typeof item === 'object') {
    const hasLongFormSignals =
      Array.isArray(item.sub_parts) ||
      isNonEmptyString(item.model_answer) ||
      item.diagram !== undefined;

    if (hasLongFormSignals) {
      longForm.push(item);
    } else {
      mcqs.push(item);
    }
  }
}

mcqs.sort((a, b) => (Number(a?.number) || 0) - (Number(b?.number) || 0));
longForm.sort((a, b) => (Number(a?.number) || 0) - (Number(b?.number) || 0));

return [{
  json: {
    ...payload,
    mcqs,
    longForm,
  },
}];
```

What this fixes:

- moves misbucketed long-form questions out of `mcqs`
- keeps valid MCQs in place
- lets `Validate Structured Exam` check the corrected structure instead of failing on a recoverable LLM mistake

### Step C: Update connections

Make sure `Validate Structured Exam` now reads from:

- `Normalize Exam Shape`

not directly from:

- `Parse Questions`

---

## Add `Normalize Long-Form Formatting`

This is the missing long-term fix for the repeated failures:

- `Refer to the diagram below.` appears while `diagram` is empty
- sub-part markers such as `(a)` leak into the `question` field

These are recoverable formatting errors.

They should be normalized before strict validation, not handled only by prompt wording.

Put this node between:

```text
Normalize Exam Shape
  -> Normalize Long-Form Formatting
  -> Validate Structured Exam
```

Also, after the repair loop, route:

```text
Merge Repaired Open-Ended Questions
  -> Normalize Long-Form Formatting
  -> Validate Structured Exam
  -> Open-Ended Consistency Audit
```

That ensures repaired questions do not bypass structural validation.

### Add a new Code node

Name it:

- `Normalize Long-Form Formatting`

### Full Code: `Normalize Long-Form Formatting`

```js
const payload = $input.first().json;
const req = $('Parse Request').first().json;

const longForm = Array.isArray(payload.longForm) ? payload.longForm : [];
const blueprint = Array.isArray(req.variation?.blueprint) ? req.variation.blueprint : [];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function removeEmptyDiagramReference(questionText, diagram, requiredDiagram) {
  if ((requiredDiagram && requiredDiagram !== 'none' && isNonEmptyString(diagram)) || isNonEmptyString(diagram)) {
    return questionText;
  }

  return String(questionText || '')
    .replace(/\s*Refer to the diagram below\.\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function findInlineSubpartMarkerIndex(questionText) {
  const text = String(questionText || '');
  const patterns = [
    /\(\s*[a-zA-Z]\s*\)/m,
    /(?:^|\n)\s*[a-zA-Z][).]\s+/m,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && typeof match.index === 'number') {
      return match.index;
    }
  }

  return -1;
}

function stripInlineSubparts(questionText) {
  const text = String(questionText || '');
  const markerIndex = findInlineSubpartMarkerIndex(text);

  if (markerIndex === -1) {
    return text.trim();
  }

  return text
    .slice(0, markerIndex)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const normalizedLongForm = longForm.map((question, index) => {
  const blueprintItem = blueprint[index] || null;
  const requiredDiagram = blueprintItem?.requiredDiagram || 'none';

  let normalizedQuestionText = String(question.question || '').trim();

  normalizedQuestionText = removeEmptyDiagramReference(
    normalizedQuestionText,
    question.diagram,
    requiredDiagram,
  );

  if (Array.isArray(question.sub_parts) && question.sub_parts.length > 0) {
    normalizedQuestionText = stripInlineSubparts(normalizedQuestionText);
  }

  return {
    ...question,
    question: normalizedQuestionText,
  };
});

return [{
  json: {
    ...payload,
    longForm: normalizedLongForm,
  },
}];
```

### Why this node matters

Without it, the workflow keeps depending on perfect prompt obedience.

That does not scale.

With it:

- recoverable formatting drift is cleaned deterministically
- strict validation can stay strict
- repaired questions go back through the same normalization path
- the workflow becomes more stable without weakening quality gates

### Why this keeps happening

If you only strengthen the prompt, this will still recur occasionally.

These two failures are classic LLM formatting drift:

- the model writes a valid long-form idea, but leaves `Refer to the diagram below.` in the stem after dropping the diagram
- the model writes the question stem and first sub-part together, so `(a)` leaks into `question`

Those are not good final outputs, but they are also not the kind of error that should kill the whole workflow before repair/audit.

The long-term architecture is:

```text
Parse Questions
  -> Normalize Exam Shape
  -> Normalize Long-Form Formatting
  -> Validate Structured Exam
  -> Open-Ended Consistency Audit
```

and after repair:

```text
Merge Repaired Open-Ended Questions
  -> Normalize Long-Form Formatting
  -> Validate Structured Exam
  -> Open-Ended Consistency Audit
```

If you skip either normalization pass, the same failure mode can return even when the repair loop is present.

### Also harden the generator prompt

Deterministic normalization is the durable fix, but you should still reduce frequency at the source.

Add these two lines to the `Question Generator` system prompt and also to `Repair Bad Open-Ended Questions`:

```text
The "question" field must contain only the shared scenario/stem. Never include inline sub-part markers such as (a), (b), a), or b) inside "question".

Only append "Refer to the diagram below." when the diagram field is non-null, non-empty, and required by the blueprint item.
```

This lowers repair frequency, while the normalization node guarantees the workflow does not keep failing on the same formatting drift forever.

---

## Full Replacement: `Validate Structured Exam`

Open the node named:

- `Validate Structured Exam`

Replace the entire code with this:

```js
const payload = $input.first().json;
const req = $('Parse Request').first().json;

const mcqs = Array.isArray(payload.mcqs) ? payload.mcqs : [];
const longForm = Array.isArray(payload.longForm) ? payload.longForm : [];
const blueprint = Array.isArray(req.variation?.blueprint) ? req.variation.blueprint : [];
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
  const blueprintItem = blueprint[index] || null;
  const diagramRequired = blueprintItem?.requiredDiagram && blueprintItem.requiredDiagram !== 'none';
  const mentionsDiagram = /refer to the diagram below\./i.test(question.question || '');
  const hasDiagram = isNonEmptyString(question.diagram);

  if (!isNonEmptyString(question.question)) {
    addIssue(`${label} is missing scenario text.`);
  }

  if (!Array.isArray(question.sub_parts) || question.sub_parts.length === 0) {
    addIssue(`${label} must include at least one sub-part.`);
  }

  if (question.diagram !== null && question.diagram !== undefined && typeof question.diagram !== 'string') {
    addIssue(`${label} diagram must be either null or a string.`);
  }

  if (diagramRequired && !hasDiagram) {
    addIssue(`${label} is missing required diagram content for blueprint type "${blueprintItem.requiredDiagram}".`);
  }

  if (mentionsDiagram && !hasDiagram) {
    addIssue(`${label} says "Refer to the diagram below." but diagram is empty.`);
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
    issueCount: 0,
  },
};

return [{ json: payload }];
```

What this fixes:

- rejects any blueprint-required diagram that is missing
- rejects any question text that says `Refer to the diagram below.` when `diagram` is null
- still keeps your existing structural checks

---

## Full Replacement: `Render Diagrams`

Open the node named:

- `Render Diagrams`

Replace the entire code with this:

```js
const auditRuns = $('Open-Ended Consistency Audit').all();
const exam = auditRuns.length
  ? auditRuns[auditRuns.length - 1].json
  : $('Validate Structured Exam').first().json;
const incomingItems = $input.all();

function decodeSvgFromItem(item) {
  if (item.json?.noDiagramJobs) return null;
  if (typeof item.json === 'string') return item.json;
  if (typeof item.json?.body === 'string') return item.json.body;
  if (typeof item.json?.data === 'string') return item.json.data;
  if (typeof item.json?.svg === 'string') return item.json.svg;
  if (typeof item.json?.response === 'string') return item.json.response;

  if (item.binary?.data?.data) {
    return Buffer.from(item.binary.data.data, 'base64').toString('utf-8');
  }

  return null;
}

function normalizeSvg(svg) {
  if (typeof svg !== 'string') return null;
  const trimmed = svg
    .trim()
    .replace(/<\?xml[\s\S]*?\?>/i, '')
    .trim();

  if (!trimmed.startsWith('<svg')) return null;

  return trimmed
    .replace(/<style[^>]*>\s*@import[\s\S]*?<\/style>/gi, '')
    .replace(/@import\s+url\([^)]+\);?/gi, '')
    .trim();
}

const preparedJobs = $('Prepare Diagram Jobs')
  .all()
  .map((item) => item.json || {})
  .filter((job) => typeof job.questionIndex === 'number');

const diagramAssetMap = new Map();

for (let incomingIndex = 0; incomingIndex < incomingItems.length; incomingIndex++) {
  const item = incomingItems[incomingIndex];
  const preparedJob = preparedJobs[incomingIndex];
  const index =
    typeof item.json?.questionIndex === 'number'
      ? item.json.questionIndex
      : preparedJob?.questionIndex;

  if (typeof index !== 'number') continue;

  const svg = normalizeSvg(decodeSvgFromItem(item));
  if (!svg) {
    diagramAssetMap.set(index, {
      diagramSvg: null,
      diagramDataUri: null,
      diagramFallbackText: item.json?.diagramFallbackText || preparedJob?.diagramFallbackText || null,
    });
    continue;
  }

  diagramAssetMap.set(index, {
    diagramSvg: svg,
    diagramDataUri: `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`,
    diagramFallbackText: item.json?.diagramFallbackText || preparedJob?.diagramFallbackText || null,
  });
}

const longForm = (Array.isArray(exam.longForm) ? exam.longForm : []).map((question, index) => {
  const asset = diagramAssetMap.get(index);

  return {
    ...question,
    diagramSvg: asset?.diagramSvg || null,
    diagramDataUri: asset?.diagramDataUri || null,
    diagramFallbackText: asset?.diagramFallbackText || question.diagramFallbackText || null,
  };
});

return [{
  json: {
    ...exam,
    longForm,
  },
}];
```

If you have already added the repair loop, this change is required.

Otherwise `Render Diagrams` can accidentally render the older pre-repair exam object instead of the repaired one.

What this fixes:

- reattaches SVG even when `Render Diagram SVG` strips `questionIndex`
- falls back to text summary when the renderer returns 503 or any non-SVG response
- keeps working when there are zero diagram jobs
- strips the external `@import` style line from Mermaid SVG before embedding

---

## Architecture Rules

1. Structured exam JSON is the source of truth.
2. PDF is a secondary artifact.
3. Code nodes do not perform HTTP.
4. Student HTML must contain only inline diagram assets.
5. Mermaid is acceptable for deterministic network diagrams.
6. TCP seq/ack fill-ins should stay table-based, not image-based.
7. Image-generation models are not the primary path for grading-critical diagrams.

---

## Renderer Choice

Use a generic node name: `Render Diagram SVG`.

That keeps the backend swappable.

### Option A: Fastest to implement now

Use `mermaid.ink` through an `HTTP Request` node.

Pros:

- no extra service to deploy
- works with your current Mermaid-producing questions

Cons:

- still depends on an external renderer during workflow execution

### Option B: Best long-term target

Call your own renderer service, for example a tiny Node service backed by `@mermaid-js/mermaid-cli`.

Pros:

- fully under your control
- no third-party rendering dependency
- easier to debug and rate-limit

Cons:

- extra service to deploy

This guide uses Option A for the implementation steps, but the node contract is designed so you can swap to Option B later without changing the downstream HTML/PDF logic.

---

## Step 0: Duplicate the Workflow

1. Duplicate your current workflow in n8n.
2. Rename it to something obvious, for example:
   `FYP V8 - Mock Exam Robust Diagram PDF`
3. Make all edits on the duplicate only.

---

## Step 1: Add `Prepare Diagram Jobs`

Add a new Code node between `Validate Structured Exam` and `Render Diagrams`.

Name it:

- `Prepare Diagram Jobs`

Connect:

- `Validate Structured Exam -> Prepare Diagram Jobs`

Use this code:

```js
const exam = $input.first().json;
const longForm = Array.isArray(exam.longForm) ? exam.longForm : [];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function cleanMermaid(code) {
  if (!isNonEmptyString(code)) return '';

  let cleaned = code.trim();
  cleaned = cleaned.replace(/^```(?:mermaid)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '<br/>');

  const match = cleaned.match(/(graph\s+(?:LR|RL|TB|TD|BT)|flowchart\s+(?:LR|RL|TB|TD|BT)|sequenceDiagram|classDiagram|stateDiagram)/);
  if (match) {
    cleaned = cleaned.substring(match.index);
  } else {
    return '';
  }

  const lines = cleaned
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return '';

  if (lines[0].startsWith('graph') || lines[0].startsWith('flowchart')) {
    for (let i = 1; i < lines.length; i++) {
      lines[i] = lines[i]
        .replace(/\[([^"\]]+)\]/g, (full, label) => `[\"${label.trim()}\"]`)
        .replace(/\|([^"|]+)\|/g, (full, label) => `|\"${label.trim()}\"|`)
        .replace(/([A-Za-z])-(\d)/g, '$1$2');
    }
  }

  if (lines[0] === 'sequenceDiagram') {
    for (let i = 1; i < lines.length; i++) {
      lines[i] = lines[i].replace(/participant\s+([A-Za-z]+)\s+([A-Za-z]+)/g, 'participant $1_$2');
    }
  }

  return lines.join('\n').trim();
}

function buildFallbackTextDiagram(question) {
  const diagram = typeof question.diagram === 'string' ? question.diagram.trim() : '';
  if (!diagram) return null;

  const edges = [];
  const nodes = [];

  for (const line of diagram.split('\n')) {
    const edgeMatch = line.match(/([A-Za-z0-9_]+).*?[-=]+>.*?([A-Za-z0-9_]+)/);
    if (edgeMatch) {
      edges.push(`${edgeMatch[1]} -> ${edgeMatch[2]}`);
    }

    const nodeMatch = line.match(/([A-Za-z0-9_]+)\["?([^"\]]+)"?\]/);
    if (nodeMatch && !nodes.find((node) => node.id === nodeMatch[1])) {
      nodes.push({ id: nodeMatch[1], label: nodeMatch[2] });
    }
  }

  if (!nodes.length && !edges.length) return null;

  let text = 'Diagram summary:\n';
  if (nodes.length) text += `Nodes: ${nodes.map((node) => node.label || node.id).join(', ')}\n`;
  if (edges.length) text += `Connections: ${edges.join('; ')}`;
  return text.trim();
}

function buildMermaidInkSvgUrl(mermaidCode) {
  const encoded = Buffer.from(mermaidCode, 'utf-8').toString('base64url');
  return `https://mermaid.ink/svg/${encoded}?theme=neutral&bgColor=!white`;
}

const jobs = [];

longForm.forEach((question, index) => {
  if (!isNonEmptyString(question.diagram)) return;

  const cleaned = cleanMermaid(question.diagram);
  if (!cleaned) return;

  jobs.push({
    json: {
      questionIndex: index,
      questionNumber: question.number,
      diagramSource: cleaned,
      diagramFallbackText: buildFallbackTextDiagram(question),
      diagramRenderUrl: buildMermaidInkSvgUrl(cleaned),
    },
  });
});

if (!jobs.length) {
  return [{ json: { noDiagramJobs: true } }];
}

return jobs;
```

What this node does:

- cleans Mermaid
- builds fallback text
- creates one item per diagram
- does not fetch anything itself

---

## Step 2: Add `Has Diagram Jobs?`

Add an IF node after `Prepare Diagram Jobs`.

Name it:

- `Has Diagram Jobs?`

Condition:

- left value: `={{ $json.noDiagramJobs }}`
- operator: `is false`

Connect:

- `Prepare Diagram Jobs -> Has Diagram Jobs?`

Branch meaning:

- `true` branch = there are diagram jobs to render
- `false` branch = there are no diagram jobs

---

## Step 2.5: Patch `Validate Structured Exam`

Your current validator is too weak for diagram integrity.

In a real run on 2026-03-31:

- Question 6 said `Refer to the diagram below.`
- but `diagram` was `null`
- and validation still passed

Patch `Validate Structured Exam` so it rejects:

1. any question whose blueprint requires a diagram but has no `diagram`
2. any question whose text says `Refer to the diagram below.` but has no `diagram`

Inside the `longForm.forEach(...)` block, add these checks:

```js
  const blueprint = Array.isArray(req.variation?.blueprint) ? req.variation.blueprint : [];
```

Add that once near the top of the node, after:

```js
const longForm = Array.isArray(payload.longForm) ? payload.longForm : [];
```

Then inside the `longForm.forEach((question, index) => { ... })` block, add:

```js
  const blueprintItem = blueprint[index] || null;
  const diagramRequired = blueprintItem?.requiredDiagram && blueprintItem.requiredDiagram !== 'none';
  const mentionsDiagram = /refer to the diagram below\./i.test(question.question || '');
  const hasDiagram = isNonEmptyString(question.diagram);

  if (diagramRequired && !hasDiagram) {
    addIssue(`${label} is missing required diagram content for blueprint type "${blueprintItem.requiredDiagram}".`);
  }

  if (mentionsDiagram && !hasDiagram) {
    addIssue(`${label} says "Refer to the diagram below." but diagram is empty.`);
  }
```

This catches the exact Question 6 failure mode from the live run.

---

## Step 3: Add `Render Diagram SVG`

Add a new `HTTP Request` node on the `true` branch.

Name it:

- `Render Diagram SVG`

### If you use `mermaid.ink` now

Configure:

- Method: `GET`
- URL: `={{ $json.diagramRenderUrl }}`
- Response format: text/string if your n8n version supports it
- Timeout: `15000`
- Put output in field: `data`
- Turn on `Never Error`
- In `Settings`, enable retry:
  - max attempts: `3`
  - wait between attempts: `1500 ms`

Connect:

- `Has Diagram Jobs?` true -> `Render Diagram SVG`

Important:

- Do not assume this node will preserve `questionIndex` or `diagramFallbackText`
- In the user's live run, this node returned only raw SVG text
- That is why the `Render Diagrams` patch below re-joins metadata from `Prepare Diagram Jobs`
- In another live run, `mermaid.ink` returned `503 Service Temporarily Unavailable`
- This node must therefore be best-effort and allow fallback rendering instead of stopping the workflow

### If your HTTP Request node only returns a file

That is still fine.

`Render Diagrams` below includes a decoder that can read either:

- text response
- JSON response
- binary file response

### If you later swap to your own renderer service

Keep the same node name and only change this node:

- Method: `POST`
- URL: your renderer endpoint
- Body: `{ "diagram": "...", "format": "svg" }`

Downstream nodes stay the same.

---

## Step 4: Replace `Render Diagrams`

Keep the existing node name:

- `Render Diagrams`

But replace its code completely.

Connect both branches into it:

- `Has Diagram Jobs?` false -> `Render Diagrams`
- `Render Diagram SVG` -> `Render Diagrams`

Use this code:

```js
const exam = $('Validate Structured Exam').first().json;
const incomingItems = $input.all();

function decodeSvgFromItem(item) {
  if (item.json?.noDiagramJobs) return null;
  if (typeof item.json === 'string') return item.json;
  if (typeof item.json?.body === 'string') return item.json.body;
  if (typeof item.json?.data === 'string') return item.json.data;
  if (typeof item.json?.svg === 'string') return item.json.svg;
  if (typeof item.json?.response === 'string') return item.json.response;

  if (item.binary?.data?.data) {
    return Buffer.from(item.binary.data.data, 'base64').toString('utf-8');
  }

  return null;
}

function normalizeSvg(svg) {
  if (typeof svg !== 'string') return null;
  const trimmed = svg.trim().replace(/<\?xml[\s\S]*?\?>/i, '').trim();
  if (!trimmed.startsWith('<svg')) return null;

  return trimmed
    .replace(/<style[^>]*>\s*@import[\s\S]*?<\/style>/gi, '')
    .replace(/@import\s+url\([^)]+\);?/gi, '')
    .trim();
}

const preparedJobs = $('Prepare Diagram Jobs')
  .all()
  .map((item) => item.json || {})
  .filter((job) => typeof job.questionIndex === 'number');

const diagramAssetMap = new Map();

for (let incomingIndex = 0; incomingIndex < incomingItems.length; incomingIndex++) {
  const item = incomingItems[incomingIndex];
  const preparedJob = preparedJobs[incomingIndex];
  const index =
    typeof item.json?.questionIndex === 'number'
      ? item.json.questionIndex
      : preparedJob?.questionIndex;

  if (typeof index !== 'number') continue;

  const svg = normalizeSvg(decodeSvgFromItem(item));
  if (!svg) continue;

  diagramAssetMap.set(index, {
    diagramSvg: svg,
    diagramDataUri: `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`,
    diagramFallbackText: item.json?.diagramFallbackText || preparedJob?.diagramFallbackText || null,
  });
}

const longForm = (Array.isArray(exam.longForm) ? exam.longForm : []).map((question, index) => {
  const asset = diagramAssetMap.get(index);

  return {
    ...question,
    diagramSvg: asset?.diagramSvg || null,
    diagramDataUri: asset?.diagramDataUri || null,
    diagramFallbackText: asset?.diagramFallbackText || question.diagramFallbackText || null,
  };
});

return [{
  json: {
    ...exam,
    longForm,
  },
}];
```

What this node does:

- rebuilds the full exam payload
- attaches inline SVG
- keeps a `diagramDataUri` fallback
- recovers diagram metadata even when `Render Diagram SVG` strips `questionIndex`
- stays compatible with downstream nodes that already read from `Render Diagrams`

---

## Step 5: Patch `Build Student Exam HTML`

Do not leave raw LLM text unescaped in HTML.

Open:

- `Build Student Exam HTML`

### Add this helper near the top

```js
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### Update question, option, and sub-part rendering

Every place where you currently interpolate question text directly:

- `${q.question}`
- `${o}`
- `${sp.text}`
- table cell values

wrap them with `escapeHtml(...)`.

Examples:

```js
<p>${escapeHtml(q.question)}</p>
```

```js
${(q.options || []).map((o) => `<div class="opt">${escapeHtml(o)}</div>`).join('')}
```

```js
<span class="sub-t">${escapeHtml(sp.text)}</span>
```

### Replace the diagram HTML block

Use inline SVG first:

```js
const fallbackHtml = q.diagramFallbackText
  ? `<div class="diagram-fallback" style="padding:12px;border:1px dashed #999;background:#f9f9f9;font-family:monospace;font-size:9pt;white-space:pre-wrap;margin:10px 0;">${escapeHtml(q.diagramFallbackText)}</div>`
  : '<div style="padding:8px;color:#999;font-style:italic;">[No diagram available for this question]</div>';

const diagram = q.diagramSvg
  ? `<div class="diagram-container">
       <div class="diagram-svg">${q.diagramSvg}</div>
       <div class="diagram-caption">Figure for Question ${q.number}</div>
     </div>`
  : (q.diagramDataUri
      ? `<div class="diagram-container">
           <img src="${q.diagramDataUri}" alt="Diagram for Question ${q.number}" />
           <div class="diagram-caption">Figure for Question ${q.number}</div>
         </div>`
      : (q.diagramFallbackText ? fallbackHtml : ''));
```

### Add this CSS

```css
.diagram-container svg { max-width: 100%; height: auto; }
.diagram-container img { max-width: 90%; height: auto; }
```

### Add a PDF readiness guard inside the HTML

Put this near the end of the HTML body:

```html
<script>
  window.__pdfReady = false;
  Promise.resolve(document.fonts ? document.fonts.ready : true)
    .catch(() => {})
    .finally(() => {
      window.__pdfReady = true;
    });

  function isPdfShiftReady() {
    return !!window.__pdfReady;
  }
</script>
```

This is better than guessing with a large fixed delay.

---

## Step 6: Patch `Convert HTML to PDF`

Open:

- `Convert HTML to PDF`

### Change the request body

Replace the current body with:

```js
={{ JSON.stringify({
  source: $json.html,
  format: "A4",
  use_print: true,
  wait_for: "isPdfShiftReady"
}) }}
```

### Change error handling

Set the node to:

- `Continue (using error output)`

Why:

- PDF generation failure should not destroy the structured exam response

---

## Step 7: Add `Has PDF Binary?`

Add an IF node after `Convert HTML to PDF`.

Name it:

- `Has PDF Binary?`

Condition:

- left value: `={{ !!$binary?.data }}`
- operator: `is true`

Connect:

- `Convert HTML to PDF -> Has PDF Binary?`

Branch meaning:

- `true` branch = PDF exists, continue to upload
- `false` branch = PDF failed, return exam JSON anyway

---

## Step 8: Keep the Success Path

Keep the existing success path on the `true` branch:

```text
Has PDF Binary? true
  -> Convert to TXT Binary1
  -> Upload to Google Drive1
  -> Share file1
  -> Build Exam Simulation Response
  -> Return Link1
```

Keep:

- `Save Exam Metadata1` only on the upload success path

That means:

- do not save PDF metadata when no PDF exists

---

## Step 9: Make `Build Exam Simulation Response` Resilient

Open:

- `Build Exam Simulation Response`

Replace the whole node code with:

```js
const exam = $('Render Diagrams').first().json;
const req = $('Parse Request').first().json;

let upload = null;
let share = null;
let pdfError = null;

try {
  upload = $('Upload to Google Drive1').first().json;
} catch {}

try {
  share = $('Share file1').first().json;
} catch {}

try {
  const pdfNode = $('Convert HTML to PDF').first();
  pdfError =
    pdfNode?.json?.error?.message ||
    pdfNode?.json?.error ||
    pdfNode?.json?.message ||
    null;
} catch {}

let fileId = upload?.id || null;
let link = upload?.webViewLink || share?.webViewLink || null;
let downloadLink = upload?.webContentLink || share?.webContentLink || null;

if (!fileId && link) {
  const match = link.match(/\/d\/([^/]+)/);
  if (match) fileId = match[1];
}

if (fileId && (!link || !link.startsWith('http'))) {
  link = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

if (fileId && (!downloadLink || !downloadLink.startsWith('http'))) {
  downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
}

const pdf = fileId || link || downloadLink
  ? { fileId, link, downloadLink }
  : null;

const warnings = [];
if (!pdf && pdfError) {
  warnings.push(`PDF generation failed: ${pdfError}`);
}

return [{
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
        sessionId: req.sessionId,
      },
    },
    pdf,
    warnings,
  },
}];
```

Important connection change:

- connect the `Has PDF Binary?` false branch directly to `Build Exam Simulation Response`
- keep the `Has PDF Binary?` true branch on the upload path
- connect `Share file1` to `Build Exam Simulation Response`

That way:

- the node waits for upload/share when PDF exists
- the node also works when PDF failed

---

## Step 10: Leave `Build Quick Practice Response` Alone

You usually do not need to change `Build Quick Practice Response`.

It can keep reading from:

- `Render Diagrams`

That is good because the revised `Render Diagrams` node still outputs the full exam JSON.

---

## Step 11: Test in This Order

Do not jump straight to a 15-question hard exam.

Test in this order:

1. `quick_practice`, 5 MCQ, no open-ended
2. `exam_simulation`, 5 MCQ, 3 open-ended, medium
3. `exam_simulation`, 10 MCQ, 5 open-ended, hard

For each run, verify:

1. Response JSON always includes `success`, `sessionId`, `mode`, and `exam`
2. `quick_practice` returns immediately with `pdf: null`
3. `exam_simulation` still returns `exam` even if `pdf` is null
4. Student HTML contains no `https://mermaid.ink/` image URLs
5. PDF shows diagrams when they render
6. Diagram failures fall back to text instead of killing the run

---

## Step 11.5: Add `Open-Ended Consistency Audit`

The current validator is still mostly structural.

That is not enough for long-term robustness.

Real failures found in generated exams included:

- a question that said `Assume stop-and-wait` while the sequence diagram showed pipelined sends
- a queue-buildup / overflow question whose stated link rates made buildup impossible
- required diagrams that were plain text instead of valid Mermaid

Add a new Code node after:

- `Validate Structured Exam`

and before:

- `Prepare Diagram Jobs`

Name it:

- `Open-Ended Consistency Audit`

### New connection order

Change:

- `Validate Structured Exam -> Prepare Diagram Jobs`

to:

- `Validate Structured Exam -> Open-Ended Consistency Audit -> Has Critical Open-Ended Issues?`
- false branch: `Prepare Diagram Jobs`
- true branch: `Build Review Required Response`

### Purpose

This node does not replace structural validation.

It adds:

- protocol-consistency checks
- arithmetic / rate-feasibility checks
- diagram-renderability checks

Critical issues should block student-facing PDF export.

### Full Code: `Open-Ended Consistency Audit`

```js
const payload = $input.first().json;
const req = $('Parse Request').first().json;

const longForm = Array.isArray(payload.longForm) ? payload.longForm : [];
const blueprint = Array.isArray(req.variation?.blueprint) ? req.variation.blueprint : [];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function extractPrompt(question) {
  return [question.question, ...(Array.isArray(question.sub_parts) ? question.sub_parts.map((part) => part.text) : [])].join(' ');
}

function looksLikeMermaidDiagram(diagram) {
  if (!isNonEmptyString(diagram)) return false;

  const normalized = diagram
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return /^(graph\s+(?:LR|RL|TB|TD|BT)|flowchart\s+(?:LR|RL|TB|TD|BT)|sequenceDiagram|classDiagram|stateDiagram)/.test(normalized);
}

function normalizeBandwidthToMbps(value, unit) {
  const normalizedUnit = String(unit || '').toLowerCase();

  if (normalizedUnit === 'gbps') return value * 1000;
  if (normalizedUnit === 'kbps') return value / 1000;
  return value;
}

function extractLinkBandwidthMbps(prompt, linkNumber) {
  const regex = new RegExp(`Link\\s*${linkNumber}[\\s\\S]{0,160}?(\\d+(?:\\.\\d+)?)\\s*(Kbps|Mbps|Gbps)`, 'i');
  const match = String(prompt || '').match(regex);
  if (!match) return null;
  return normalizeBandwidthToMbps(Number(match[1]), match[2]);
}

function hasStopAndWaitContradiction(question) {
  const prompt = extractPrompt(question);
  const diagram = question.diagram || '';

  if (!/stop-and-wait|stop and wait/i.test(prompt)) return false;
  if (!/^sequenceDiagram\b/.test(String(diagram).trim())) return false;

  const lines = String(diagram)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let outstandingDataMessages = 0;

  for (const line of lines) {
    const match = line.match(/^[A-Za-z0-9_]+[-=.]+>?[A-Za-z0-9_]+:\s*(.+)$/);
    if (!match) continue;

    const message = match[1].trim().toLowerCase();

    if (/\back\b/.test(message) && !/\bdata\b/.test(message)) {
      outstandingDataMessages = 0;
      continue;
    }

    if (/\bdata\b|\bseg(?:ment)?\b|\bpkt\b|\bpacket\b|\bpayload\b/.test(message) && !/\back\b/.test(message)) {
      outstandingDataMessages += 1;
      if (outstandingDataMessages > 1) {
        return true;
      }
    }
  }

  return false;
}

function hasImpossibleQueueBuildup(question) {
  const prompt = extractPrompt(question);

  if (!/queue buildup|queue build-up|queue build up|queue overflow|router overflow|buffer overflow|rate of queue buildup/i.test(prompt)) {
    return false;
  }

  const link1Mbps = extractLinkBandwidthMbps(prompt, 1);
  const link2Mbps = extractLinkBandwidthMbps(prompt, 2);

  if (link1Mbps == null || link2Mbps == null) {
    return false;
  }

  return link2Mbps > link1Mbps;
}

const issues = [];

longForm.forEach((question, index) => {
  const blueprintItem = blueprint[index] || null;
  const requiredDiagram = blueprintItem?.requiredDiagram || 'none';
  const prompt = extractPrompt(question);
  const diagram = question.diagram || '';
  const label = `Question ${question.number || index + 1}`;

  if (requiredDiagram !== 'none' && !looksLikeMermaidDiagram(diagram)) {
    issues.push({
      severity: 'critical',
      code: 'non_renderable_required_diagram',
      questionNumber: question.number || index + 1,
      message: `${label} requires a diagram, but the diagram is plain text or invalid Mermaid.`,
    });
  }

  if (hasStopAndWaitContradiction(question)) {
    issues.push({
      severity: 'critical',
      code: 'stop_and_wait_contradiction',
      questionNumber: question.number || index + 1,
      message: `${label} says stop-and-wait, but the sequence diagram shows multiple data sends before an ACK.`,
    });
  }

  if (hasImpossibleQueueBuildup(question)) {
    issues.push({
      severity: 'critical',
      code: 'impossible_queue_buildup',
      questionNumber: question.number || index + 1,
      message: `${label} asks about queue buildup or overflow, but the stated link rates make buildup impossible.`,
    });
  }
});

payload.metadata = {
  ...(payload.metadata || {}),
  qualityAudit: {
    checkedAt: new Date().toISOString(),
    issueCount: issues.length,
    criticalIssueCount: issues.filter((issue) => issue.severity === 'critical').length,
    issues,
  },
};

return [{ json: payload }];
```

### Add IF Node: `Has Critical Open-Ended Issues?`

Add an IF node after:

- `Open-Ended Consistency Audit`

Configure:

- left value: `={{ $json.metadata?.qualityAudit?.criticalIssueCount || 0 }}`
- operator: `larger`
- right value: `0`

Meaning:

- true = do not export this exam as a final student PDF yet
- false = continue to `Prepare Diagram Jobs`

### Add Code Node: `Build Review Required Response`

This node is for the true branch.

It returns the structured exam plus the audit findings, but no PDF.

```js
const exam = $input.first().json;
const req = $('Parse Request').first().json;

return [{
  json: {
    success: false,
    requiresReview: true,
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
        sessionId: req.sessionId,
      },
    },
    pdf: null,
    warnings: (exam.metadata?.qualityAudit?.issues || []).map((issue) => issue.message),
  },
}];
```

Connect:

- true branch -> `Build Review Required Response -> Return Link1`

### Why this is the right first implementation

It does **not** try to solve every bad question automatically.

It does:

- catch professor-visible quality failures early
- stop bad student PDFs from being exported
- preserve the structured exam for manual review or future repair loops

That is the correct scalable direction.

## Step 11.6: Add `Repair Bad Open-Ended Questions`

Once `Open-Ended Consistency Audit` is working, the next scalable step is:

- repair only the flagged open-ended questions
- merge them back into the exam
- rerun the audit once

Do **not** regenerate the entire exam for one bad question.

### New connection order

Replace the current true branch:

- `Has Critical Open-Ended Issues? -> Build Review Required Response`

with:

- `Has Critical Open-Ended Issues?`
  - false -> `Prepare Diagram Jobs`
  - true -> `Has Repair Attempt Remaining?`
- `Has Repair Attempt Remaining?`
  - true -> `Prepare Open-Ended Repair Payload -> Repair Bad Open-Ended Questions -> Parse Repaired Open-Ended Questions -> Merge Repaired Open-Ended Questions -> Open-Ended Consistency Audit`
  - false -> `Build Review Required Response`

### Design rule

Allow only:

- `1` automatic repair pass

If the repaired question still fails the audit:

- stop
- return `requiresReview: true`

That prevents infinite loops and keeps behavior predictable.

### Add IF Node: `Has Repair Attempt Remaining?`

Configure:

- left value: `={{ $json.metadata?.repairAttemptCount || 0 }}`
- operator: `smaller`
- right value: `1`

Meaning:

- true = one repair pass is still allowed
- false = already repaired once, send to review

### Add Code Node: `Prepare Open-Ended Repair Payload`

Purpose:

- extract only the flagged long-form questions
- pass the original question, blueprint item, and audit messages into a repair prompt

```js
const exam = $input.first().json;
const req = $('Parse Request').first().json;

const longForm = Array.isArray(exam.longForm) ? exam.longForm : [];
const blueprint = Array.isArray(req.variation?.blueprint) ? req.variation.blueprint : [];
const issues = Array.isArray(exam.metadata?.qualityAudit?.issues) ? exam.metadata.qualityAudit.issues : [];

const flaggedQuestionNumbers = [...new Set(
  issues
    .filter((issue) => issue?.severity === 'critical')
    .map((issue) => Number(issue.questionNumber))
    .filter((value) => Number.isFinite(value))
)];

const flaggedQuestions = longForm
  .filter((question) => flaggedQuestionNumbers.includes(Number(question.number)))
  .map((question) => {
    const blueprintItem = blueprint.find((item) => Number(item.questionNumber) === Number(question.number)) || null;
    const questionIssues = issues
      .filter((issue) => Number(issue.questionNumber) === Number(question.number))
      .map((issue) => issue.message);

    return {
      questionNumber: question.number,
      originalQuestion: question,
      blueprintItem,
      issues: questionIssues,
    };
  });

return [{
  json: {
    exam,
    repairAttemptCount: Number(exam.metadata?.repairAttemptCount || 0),
    flaggedQuestions,
  },
}];
```

### Add AI Node: `Repair Bad Open-Ended Questions`

Use the same model family you already trust for mock-exam generation.

If you are using a shared OpenRouter model node such as `Claude 4.6 Sonnet`, connect that same language-model node to both:

- `Question Generator`
- `Repair Bad Open-Ended Questions`

Do not leave the repair node without an AI language-model connection.

Input prompt:

```text
You are repairing only the flagged long-form questions in a structured ELEC3120 mock exam.

Return ONE raw JSON array only. No markdown. No commentary.

You will receive:
- the original long-form question object
- the blueprint item it must satisfy
- the critical issues found by the audit

Repair the question so that:
- it keeps the same question number
- it stays faithful to the blueprint category, focus topic, difficulty anchor, and required diagram type
- it resolves every listed audit issue
- it does not reveal answers in the student-facing question or diagram
- if a diagram is required, the diagram must be valid Mermaid
- if stop-and-wait is assumed, the sequence diagram must show ACK-gated transmission
- if queue buildup/overflow is asked, the stated rates must make buildup possible unless the wording explicitly asks the student to conclude that no buildup occurs

Return this exact shape:

[
  {
    "number": 8,
    "question": "scenario only",
    "sub_parts": [
      { "label": "a", "text": "text", "marks": 4 }
    ],
    "diagram": "graph LR ... OR sequenceDiagram ... OR null",
    "model_answer": "step-by-step solution",
    "marks": 12
  }
]
```

Recommended body input:

```text
Exam metadata:
{{ JSON.stringify($json.exam.metadata, null, 2) }}

Flagged questions to repair:
{{ JSON.stringify($json.flaggedQuestions, null, 2) }}
```

### Add Code Node: `Parse Repaired Open-Ended Questions`

```js
const raw = $input.first().json;
let output = raw.output || raw.text || raw.response || raw.content || raw.body || '';

if (typeof output === 'object') {
  output = JSON.stringify(output);
}

output = output.replace(/```json/gi, '').replace(/```/g, '').trim();

const firstOpen = output.indexOf('[');
const lastClose = output.lastIndexOf(']');

if (firstOpen === -1 || lastClose === -1) {
  throw new Error(`Repair node did not return a JSON array. Preview: ${String(output).substring(0, 200)}`);
}

output = output.substring(firstOpen, lastClose + 1);

let repairedQuestions;

try {
  repairedQuestions = JSON.parse(output);
} catch (error) {
  throw new Error(`Failed to parse repaired questions JSON: ${error.message}`);
}

if (!Array.isArray(repairedQuestions)) {
  throw new Error('Repaired questions payload is not an array.');
}

return [{ json: { repairedQuestions } }];
```

### Add Code Node: `Merge Repaired Open-Ended Questions`

```js
const exam = $('Prepare Open-Ended Repair Payload').first().json.exam;
const parsed = $input.first().json;

const repairedQuestions = Array.isArray(parsed.repairedQuestions) ? parsed.repairedQuestions : [];
const repairedByNumber = new Map(
  repairedQuestions
    .filter((question) => question && Number.isFinite(Number(question.number)))
    .map((question) => [Number(question.number), question])
);

const longForm = (Array.isArray(exam.longForm) ? exam.longForm : []).map((question) => {
  const repaired = repairedByNumber.get(Number(question.number));
  return repaired ? repaired : question;
});

return [{
  json: {
    ...exam,
    longForm,
    metadata: {
      ...(exam.metadata || {}),
      repairAttemptCount: Number(exam.metadata?.repairAttemptCount || 0) + 1,
      lastRepairAt: new Date().toISOString(),
    },
  },
}];
```

### Why this is the right next step

It gives you:

- bounded self-healing
- question-level repair instead of full-regeneration waste
- a scalable path toward faculty-quality review flows

### After this

Once repair loop is stable, the next priorities are:

1. remove plain-text fallback from final student PDF for required-diagram questions
2. replace `mermaid.ink` with a self-hosted renderer
3. add professor actions such as `Regenerate This Question` and `Regenerate Diagram Only`

---

## What Not to Do

- Do not put `fetch()` into a Code node
- Do not send raw external diagram URLs into PDFShift HTML
- Do not make the entire webhook fail just because PDFShift failed
- Do not use Nano Banana as the primary generator for seq/ack, routing, or protocol-flow diagrams

---

## Optional Phase 2: Stronger Diagram Contract

Once the above is stable, the next real upgrade is:

- make the LLM output `diagramSpec` JSON instead of raw Mermaid text
- convert `diagramSpec` -> Mermaid or SVG deterministically in n8n or a renderer service

That is more work, but it reduces:

- Mermaid syntax drift
- regex cleanup hacks
- layout instability across prompts

Do **not** block the current hardening pass on this phase.

The immediate goal is:

- reliable structured exam output
- reliable best-effort PDF
- no unsupported Code-node HTTP
