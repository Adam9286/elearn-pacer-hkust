# n8n Chat Workflow: Sources Click-to-Open (Pass-Through)

Use this doc to update your chatbot workflow so the frontend receives `retrieved_materials` (with `content`) and can show each source as click-to-expand cards.

---

## 1. Build Citations node (required + optional)

**Required:** Pass through `retrieved_materials` so the webhook sends them.  
**Optional:** Build citation strings with "Slide X" for lectures and "Page X" for textbook; omit location when missing (no "Page N/A").

Replace the entire **Build Citations** node code with:

```javascript
const item = $input.first().json;
const materials = item.retrieved_materials || [];
const uniqueSources = new Map();

materials.forEach(m => {
  const key = `${m.document_title}-${m.slide_number ?? ''}-${m.page_number ?? ''}`;
  if (!uniqueSources.has(key)) {
    // Use "Slide X" for lectures, "Page X" for textbook; omit if missing
    const location = m.slide_number != null && m.slide_number !== 'N/A' && !isNaN(Number(m.slide_number))
      ? `Slide ${m.slide_number}`
      : (m.page_number != null && m.page_number !== 'N/A' && !isNaN(Number(m.page_number))
        ? `Page ${m.page_number}`
        : '');
    const citation = location
      ? `- **Source**: ${m.document_title} (${location}) [${m.source_type || 'Course Material'}]`
      : `- **Source**: ${m.document_title} [${m.source_type || 'Course Material'}]`;
    uniqueSources.set(key, citation);
  }
});

const citationList = Array.from(uniqueSources.values());
const finalCitations = citationList.length > 0
  ? citationList
  : ["- No specific lecture slides were retrieved for this general answer."];

return [{
  json: {
    answer: item.answer,
    citations: finalCitations,
    retrieved_materials: materials   // REQUIRED: pass through so frontend receives content
  }
}];
```

---

## 2. Extract Tool Results node (optional)

Emit numeric `slide_number` for lecture tool and `page_number` for textbook; avoid the string `'N/A'` so the frontend does not show "Page N/A".

In your **Extract Tool Results** node, replace the block that builds each `retrieved_materials` item. Keep your existing "double-wrapped" and `content`/`meta` logic; only change how you set `page_number` and `slide_number` and add `source_url` if you have it:

```javascript
// After you have: title, content, meta, toolName (and type = 'Textbook' or 'Lecture Slides')

const rawNum = meta.slide_number ?? meta.page_number ?? meta.page;
const isNumeric = rawNum !== undefined && rawNum !== null && rawNum !== 'N/A' && !isNaN(Number(rawNum));
const num = isNumeric ? Number(rawNum) : null;

const isLecture = toolName.includes('lecture');

const entry = {
  document_title: title,
  source_type: type,
  content: content || '[Text content missing]'
};

if (isLecture) {
  if (num != null) entry.slide_number = num;
  if (meta.lecture_id) entry.lecture_id = meta.lecture_id;
  if (meta.lecture_title) entry.lecture_title = meta.lecture_title;
  if (num != null) entry.page_number = num;  // some frontend fallbacks use page_number
} else {
  if (num != null) entry.page_number = num;
  if (meta.chapter) entry.chapter = meta.chapter;
}

if (meta.source || meta.source_url) entry.source_url = meta.source || meta.source_url;

retrieved_materials.push(entry);
```

Use this in place of your current `retrieved_materials.push({ document_title, page_number, source_type, content })` so you do not set `page_number: 'N/A'` and you expose `slide_number` for lectures.

---

## 3. Normalize Agent Output node

Ensure this node does not drop `retrieved_materials`. It should pass them through, e.g.:

```javascript
const input = $input.first().json;
let cleanAnswer = String(input.answer || '')
  .replace(/<think>[\s\S]*?<\/think>/g, '')
  .trim();

return [{
  json: {
    answer: cleanAnswer,
    retrieved_materials: input.retrieved_materials || []
  }
}];
```

---

## Summary

| Node                 | Change                                                                 |
|----------------------|------------------------------------------------------------------------|
| **Build Citations**   | Add `retrieved_materials: materials` to output; optional: Slide/Page citation strings. |
| **Extract Tool Results** | Optional: numeric `slide_number`/`page_number` only; no `'N/A'`; add lecture_id, lecture_title, chapter, source_url if available. |
| **Normalize Agent Output** | Pass through `retrieved_materials` unchanged.                          |

After updating **Build Citations** (and optionally the others), the frontend Sources section will show each source as a card; clicking expands to show the full retrieved `content`.
