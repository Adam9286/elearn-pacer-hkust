# Duplicate sources: step-by-step fix (full code)

Use this after you’ve confirmed the database has no duplicates (duplicate-check queries returned no rows). All changes are in n8n only.

---

## Step 1: Fix Chat Memory session key

**Node:** **Chat Memory** (PostgresChat)

**What’s wrong:** The session key has a typo `=={{` so the expression isn’t evaluated.

**What to do:**

1. Open the **Chat Memory** node.
2. Find **Session Key** (or **Custom Session Key**).
3. Replace the current value with this **exact** expression (one `=` at the start):

```text
={{ $json.sessionId || $items('Prepare AI Context')[0].json.sessionId || 'sid_fallback' }}
```

4. Remove any trailing newline or extra `=` so it’s exactly as above.
5. Save the node.

**No code block to paste** – this is a single expression in the node’s field.

---

## Step 2: Replace Extract Tool Results (full code)

**Node:** **Extract Tool Results** (Code node)

**What to do:**

1. Open the **Extract Tool Results** node.
2. Select **all** existing code and delete it.
3. Paste the **entire** code below into the node’s code editor.
4. Save the node.

**Full code (copy everything below this line):**

```javascript
const agentOutput = $input.first().json;
const steps = agentOutput.intermediateSteps || agentOutput.steps || [];
const retrieved_materials = [];

// Dedupe: normalize content so "same text" from different tool calls counts as one
function normalizeForDedupe(str) {
  return String(str || '')
    .trim()
    .replace(/\s+/g, ' ');
}

const seenContent = new Set();
const seenSources = new Set();

// One citation per (source, slide) – keeps at most one chunk per slide
const ONE_CITATION_PER_SLIDE = true;

function asNum(x) {
  if (x === undefined || x === null || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

for (const step of steps) {
  const toolName = (step.action?.tool || step.action?.name || '').toLowerCase();
  if (!toolName.includes('lecture') && !toolName.includes('textbook')) continue;

  try {
    const raw = typeof step.observation === 'string' ? JSON.parse(step.observation) : step.observation;
    const results = Array.isArray(raw) ? raw : [raw];

    for (const r of results) {
      if (!r) continue;

      let content = r.pageContent ?? r.content ?? r.text ?? '';
      let metaFromInner = null;

      if (typeof content === 'string' && content.trim().startsWith('{')) {
        try {
          const inner = JSON.parse(content);
          content = inner.pageContent || inner.text || inner.content || content;
          if (inner.metadata) metaFromInner = inner.metadata;
        } catch (_) {}
      }

      const cleanContent = String(content).trim();
      if (cleanContent.length < 20) continue;

      const normalizedContent = normalizeForDedupe(cleanContent);
      if (seenContent.has(normalizedContent)) continue;
      seenContent.add(normalizedContent);

      const meta0 = metaFromInner || r.metadata || {};
      const meta = meta0.metadata || meta0 || {};

      const source_type = toolName.includes('textbook') ? 'Textbook' : 'Lecture Slides';
      const lecture_id = meta.lecture_id ?? null;
      const lecture_title = meta.lecture_title ?? null;
      const slide_number = asNum(meta.slide_number);
      const page_number = asNum(meta.page_number);

      const sourceKey = `${lecture_id || lecture_title || ''}|${slide_number ?? page_number ?? ''}`;
      if (ONE_CITATION_PER_SLIDE && seenSources.has(sourceKey)) continue;
      if (ONE_CITATION_PER_SLIDE) seenSources.add(sourceKey);

      const document_title = meta.document_title ?? lecture_title ?? meta.filename ?? null;

      retrieved_materials.push({
        source_type,
        lecture_id,
        lecture_title,
        slide_number,
        page_number,
        document_title,
        content: cleanContent,
        excerpt: cleanContent,
      });
    }
  } catch (e) {
    console.log('Extract skip:', e.message);
  }
}

// Final dedupe pass: same (document, slide/page, normalized content) => keep one
const seenKey = new Set();
const deduped = retrieved_materials.filter((m) => {
  const key = [
    m.document_title ?? m.lecture_title ?? '',
    m.slide_number ?? '',
    m.page_number ?? '',
    normalizeForDedupe(m.content || ''),
  ].join('|');
  if (seenKey.has(key)) return false;
  seenKey.add(key);
  return true;
});

const answer = agentOutput.output || agentOutput.text || '';
const cleanAnswer = String(answer).trim();

return [
  {
    json: {
      answer: cleanAnswer,
      retrieved_materials: deduped,
    },
  },
];
```

**What this code does:**

- **Normalizes content** before dedupe (trim + collapse spaces) so small differences don’t create duplicate entries.
- **One citation per slide:** `ONE_CITATION_PER_SLIDE = true` so you get at most one chunk per (source, slide).
- **Final dedupe:** After the loop, filters `retrieved_materials` by (document_title, slide_number, page_number, normalized content) and returns that list.
- **Output shape:** Same as before: `answer` and `retrieved_materials`. Frontend and **Normalize Agent Output** don’t need changes.

---

## Step 3: No changes to other nodes

- **Normalize Agent Output** – Leave as-is. It already takes `answer` and `retrieved_materials` from Extract Tool Results and passes them through.
- **Respond to Webhook** – Leave as-is. It already returns `answer` and `retrieved_materials` (and `citations: []`). No change needed for duplicate fix.

---

## Step 4: Test

1. Save the workflow in n8n.
2. Run it with a course question that usually triggers multiple sources (e.g. “Explain total delay” or “What is TCP flow control?”).
3. Check the **Extract Tool Results** output: `retrieved_materials` should have no duplicate (source, slide, content).
4. Check the app: the Sources section should show each source once (frontend also dedupes by source + slide + content as a safeguard).

---

## Summary

| Step | Node                 | Action |
|------|----------------------|--------|
| 1    | Chat Memory          | Set **Session Key** to the expression from Step 1 (single `=`, no `==`). |
| 2    | Extract Tool Results | Replace entire code with the full script from Step 2. |
| 3    | Others               | No changes. |
| 4    | –                    | Save workflow and test with a course question. |

If duplicates still appear, they may differ slightly (e.g. different metadata). You can then relax `ONE_CITATION_PER_SLIDE` to `false` in Extract Tool Results to allow multiple chunks per slide but keep content + final dedupe, or add more normalization (e.g. ignore case) in `normalizeForDedupe`.
