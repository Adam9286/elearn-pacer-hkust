# n8n: Sources = Lecture Number + Name (collapsed); Full details on open

The frontend now shows **collapsed** sources as only "lecture number, then the name" (e.g. `15-LAN_Routing`). When the user **clicks** a source, it expands to show **lecture name, page number, source type, and content** in a clear layout.

Apply these changes in your n8n workflow so the webhook returns the right data and the list stays minimal.

---

## 1. Respond to Webhook — include `retrieved_materials`

**Node:** **Respond to Webhook**

The frontend needs `retrieved_materials` in the response to show content when a source is opened. Right now the node only returns `answer` and `citations`.

**Change:** Set **Response Body** to:

```json
={{ JSON.stringify({
  answer: $json.answer ?? $json.output ?? "",
  citations: $json.citations ?? [],
  retrieved_materials: $json.retrieved_materials ?? []
}) }}
```

So the webhook returns `answer`, `citations`, and `retrieved_materials`.

---

## 2. Extract Tool Results — correct fields for list + expanded view

**Node:** **Extract Tool Results**

This node builds `retrieved_materials`. Each item must have:

- **document_title** — lecture id style, e.g. `15-LAN_Routing` (so the collapsed list shows "lecture number, then the name").
- **slide_number** — **numeric only** for lectures (no `'N/A'`).
- **page_number** — **numeric only** for textbook (no `'N/A'`).
- **source_type** — `"Lecture Slides"` or `"Textbook"`.
- **content** — full retrieved text for the expanded view.

Replace the **entire** "Extract Tool Results" Code node with:

```javascript
const agentOutput = $input.first().json;
const steps = agentOutput.intermediateSteps || agentOutput.steps || [];
const retrieved_materials = [];

for (const step of steps) {
  const toolName = (step.action?.tool || step.action?.name || '').toLowerCase();
  
  if (toolName.includes('lecture') || toolName.includes('textbook')) {
    try {
      const rawOutput = typeof step.observation === 'string' ? JSON.parse(step.observation) : step.observation;
      const results = Array.isArray(rawOutput) ? rawOutput : [rawOutput];

      for (const res of results) {
        if (!res) continue;

        let content = '';
        let meta = res.metadata || {};

        if (typeof res.text === 'string' && res.text.trim().startsWith('{')) {
          try {
            const inner = JSON.parse(res.text);
            content = inner.pageContent || inner.text || '';
            meta = { ...meta, ...(inner.metadata || {}) };
          } catch (e) {
            content = res.text;
          }
        } else {
          content = res.pageContent || res.content || res.text || '';
        }

        const title = meta.lecture_title || meta.source || meta.filename || meta.document_title || 'ELEC3120 Material';
        const type = toolName.includes('textbook') ? 'Textbook' : 'Lecture Slides';

        const rawNum = meta.slide_number ?? meta.page_number ?? meta.page;
        const isNumeric = rawNum !== undefined && rawNum !== null && rawNum !== 'N/A' && !isNaN(Number(rawNum));
        const num = isNumeric ? Number(rawNum) : null;

        const entry = {
          document_title: title,
          source_type: type,
          content: content || '[Text content missing]'
        };

        if (type === 'Lecture Slides') {
          if (num != null) entry.slide_number = num;
          if (meta.lecture_id) entry.lecture_id = meta.lecture_id;
          if (meta.lecture_title) entry.lecture_title = meta.lecture_title;
        } else {
          if (num != null) entry.page_number = num;
          if (meta.chapter) entry.chapter = meta.chapter;
        }

        if (meta.source || meta.source_url) entry.source_url = meta.source || meta.source_url;

        retrieved_materials.push(entry);
      }
    } catch (e) {
      console.log('Partial data parse skip:', e.message);
    }
  }
}

const finalAnswer = agentOutput.output || agentOutput.text;
let forcedResponse = finalAnswer;

if (!finalAnswer && retrieved_materials.length > 0) {
  const topResult = retrieved_materials[0];
  forcedResponse = `I reached my thinking limit, but I found this in **${topResult.document_title}** (Slide ${topResult.slide_number ?? topResult.page_number ?? '?'}):\n\n"${topResult.content.substring(0, 400)}..."`;
} else if (!finalAnswer) {
  forcedResponse = "I'm sorry, I couldn't find a specific answer in time. Please try asking about a specific lecture topic.";
}

return [{
  json: {
    answer: forcedResponse,
    retrieved_materials: retrieved_materials,
    iterations_hit: !Boolean(finalAnswer)
  }
}];
```

This keeps your existing parsing and "double-wrapped" handling, and ensures:

- **document_title** is used as the collapsed label (lecture number + name).
- **slide_number** / **page_number** are numeric only (no `'N/A'`).
- **content** is set so the expanded view can show it.

---

## 3. Build Citations — minimal list strings + pass through `retrieved_materials`

**Node:** **Build Citations**

The Sources list should show only "lecture number, then the name". So citation strings are minimal (one per material = `document_title`). You must still pass through `retrieved_materials` for the expanded view.

Replace the **entire** "Build Citations" Code node with:

```javascript
const item = $input.first().json;
const materials = item.retrieved_materials || [];

const citations = materials.map(m => m.document_title || 'Course Material');

const finalCitations = citations.length > 0
  ? citations
  : ["- No specific lecture slides were retrieved for this general answer."];

return [{
  json: {
    answer: item.answer,
    citations: finalCitations,
    retrieved_materials: materials
  }
}];
```

Result:

- **citations** — array of short labels (e.g. `15-LAN_Routing`, `11-BGP`) for the list.
- **retrieved_materials** — unchanged, so the frontend can show name, page/slide, source type, and content when a source is opened.

---

## Summary

| Node | What to change |
|------|----------------|
| **Respond to Webhook** | Response Body: add `retrieved_materials: $json.retrieved_materials ?? []` so the frontend receives full material data. |
| **Extract Tool Results** | Use the full code above: `document_title`, numeric `slide_number`/`page_number`, `source_type`, `content`; no `'N/A'`. |
| **Build Citations** | Use the full code above: `citations` = array of `document_title` only; pass through `retrieved_materials`. |

After this, the Sources list shows only "lecture number, then the name", and opening a source shows lecture name, page/slide number, source type, and content in a clear layout.
