# Mock Exam n8n Upgrade Spec

This document describes the exact upgrades needed for the current mock-exam workflow.

## Current Reality

The app-side mock exam contract is already ready for:

- structured exam JSON
- PDF artifacts
- Quick Practice vs Exam Simulation mode
- saving generated sessions into `externalSupabase`

Your current n8n workflow is **not fixed yet**.

It still has these limitations:

1. It returns only Google Drive PDF links from `Post Links1 -> Return Link1`.
2. It uses only 3 long-form archetypes:
   - calculation
   - topology
   - protocol
3. It does not calibrate difficulty against real past-paper anchors.
4. It does not use student weakness/profile context.
5. It does not run a verifier pass after generation.
6. It still bakes the answer key into the student PDF.

## Target Architecture

Use **Approach B**:

- `quick_practice`
- `exam_simulation`

Both should share:

- `question_bank` retrieval
- past-paper/homework lineage
- sub-topic taxonomy
- future weakness/profile inputs

## Required Response Contract

The webhook should return a single JSON object like this:

```json
{
  "success": true,
  "sessionId": "exam-1712345678901",
  "mode": "quick_practice",
  "exam": {
    "mcqs": [],
    "longForm": [],
    "metadata": {
      "topic": "Computer Networks",
      "difficulty": "medium",
      "variation": {},
      "sourceSummary": [],
      "generationStrategy": "remix",
      "difficultyAnchor": "midterm_section_e"
    }
  },
  "pdf": {
    "fileId": "google-drive-file-id",
    "link": "https://drive.google.com/file/d/...",
    "downloadLink": "https://drive.google.com/uc?export=download&id=..."
  }
}
```

Rules:

- `exam` must be present whenever questions were generated.
- `pdf` can be `null` for `quick_practice`.
- `pdf` can be present for `exam_simulation`.
- Do not return only a bare link payload anymore.

## Workflow Split

Add a mode router immediately after `Parse Request`.

### Quick Practice path

Purpose:

- fast response
- structured JSON first
- no PDF dependency

Behavior:

- prefer MCQs and short, tightly-scoped remixed questions
- return `exam.mcqs`
- `exam.longForm` may be empty or very small
- skip Google Drive and PDFShift entirely
- respond directly with structured JSON

### Exam Simulation path

Purpose:

- professor-style timed exam generation
- richer multi-part questions
- optional PDF export

Behavior:

- return structured JSON
- optionally generate and upload student PDF
- student PDF must exclude answer key
- answer key should be stored in JSON only, or in a separate instructor artifact if needed

## Blueprint Upgrade

Replace the current 3-archetype blueprint with a professor-style blueprint that can express at least:

1. Warmup MCQ
2. HTTP / Web scenario analysis
3. Video streaming / DASH scenario
4. TCP header / seq-ack fill-in
5. Network performance analysis
6. Transport model / Go-Back-N / Selective Repeat timing

Recommended request-time structure:

- `mode`
- `topic`
- `difficulty`
- `includeTopics`
- `excludeTopics`
- `studentWeaknesses` (optional, future-ready)
- `sessionId`

Recommended blueprint metadata per long-form question:

- `questionNumber`
- `category`
- `focusTopic`
- `sourceExamType`
- `sourcePeriod`
- `difficultyAnchor`
- `requiredDiagram`
- `diagramInstructions`

## Retrieval Upgrade

The workflow already retrieves from `question_bank`.

Improve it by explicitly using the lineage fields inside `source_metadata`:

- `source_metadata.file`
- `source_metadata.section`
- `source_metadata.exam_type`
- `source_metadata.exam_period`

Use retrieval for:

- structure matching
- concept matching
- difficulty anchors
- source labeling

Do not rely on only generic semantic similarity.

## Validation Pass

Add a second AI or rule-based validation step after `Parse Questions`.

Minimum checks:

1. JSON structure is valid.
2. Number of MCQs and long-form questions matches the request.
3. Mermaid syntax is valid enough to render.
4. MCQ answer letters match available options.
5. Marks sum correctly.
6. Long-form model answers are consistent with the sub-parts.
7. Arithmetic/unit checks are performed for calculation questions.

If validation fails:

- retry generation once with explicit correction instructions
- otherwise return an error object instead of low-quality output

## PDF Changes

Current problem:

- `Build Exam HTML` includes the answer key in the same PDF.

Required fix:

- student exam PDF must include only questions and blank answer space
- answer key stays in JSON
- optional: create a separate instructor solution PDF later

## Node-Level Change List

Starting from your current workflow:

1. `Parse Request`
   - add `mode`
   - add topic filters from `includeTopics`
   - add future-ready `studentWeaknesses`
   - produce upgraded blueprint metadata

2. New `Mode Switch`
   - route to `Quick Practice`
   - route to `Exam Simulation`

3. `Question Generator`
   - upgrade prompts to use lineage-aware remixing
   - require source-aware metadata in output

4. New `Question Verifier`
   - validate structure, arithmetic, answers, and Mermaid quality

5. `Parse Questions`
   - preserve verification metadata

6. `Render Diagrams`
   - keep, but treat rendering as optional enrichment

7. `Build Exam HTML`
   - remove answer-key section from student PDF

8. `Convert HTML to PDF` / Drive upload
   - run only on `exam_simulation`

9. `Post Links1`
   - replace with a structured response builder

10. `Return Link1`
   - replace final output with full structured payload plus optional `pdf`

## Suggested Output Builder

Create a final code node that returns:

```js
return [{
  json: {
    success: true,
    sessionId: $('Parse Request').first().json.sessionId,
    mode: $('Parse Request').first().json.mode,
    exam: {
      mcqs: $('Render Diagrams').first().json.mcqs,
      longForm: $('Render Diagrams').first().json.longForm,
      metadata: $('Render Diagrams').first().json.metadata
    },
    pdf: hasPdf ? {
      fileId,
      link,
      downloadLink
    } : null
  }
}];
```

## Recommended Order of Work

1. Fix response contract first.
2. Split quick practice vs exam simulation.
3. Remove answer key from student PDF.
4. Add verifier pass.
5. Expand blueprint archetypes.
6. Add difficulty anchors.
7. Add student weakness inputs later.

This order keeps the app and workflow moving together instead of blocking on the full state-of-the-art version.
