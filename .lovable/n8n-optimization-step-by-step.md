# n8n Workflow Optimization – Step-by-Step Change List

Apply these in order. Each step names the node and exactly what to change.

---

## Step 1: Respond to Webhook – Fix response body (valid JSON)

**Node:** **Respond to Webhook**

**What to do:** The response must be a **single JSON string**. Replace the **Response Body** with this exact expression (one line):

```
={{ JSON.stringify({ answer: $json.answer ?? $json.output ?? "", citations: $json.citations ?? [], retrieved_materials: $json.retrieved_materials ?? [] }) }}
```

**Why:** Ensures the webhook returns valid JSON and includes `retrieved_materials` for the frontend.

---

## Step 2: DeepThink Agent – Lower max iterations

**Node:** **DeepThink Agent**

**What to do:** In the agent options, find **Max Iterations** (or similar). Change it from **15** to **8**.

**Why:** Reduces worst-case latency while still allowing multi-step reasoning.

---

## Step 3: Auto Agent – Lower max iterations

**Node:** **Auto Agent**

**What to do:** In the agent options, find **Max Iterations**. Change it from **6** to **4**.

**Why:** Keeps responses faster; 2 tool calls + 1–2 reasoning steps usually suffice.

---

## Step 4: DeepThink Agent – Update system message

**Node:** **DeepThink Agent**

**What to do:** Open **Options** → **System Message**. Replace the entire system message with the text below (copy from the first line to the last line of the system message block).

**Full system message to paste:**

```
You are LearningPacer, the expert Virtual TA for ELEC3120 at HKUST.
You are an expert Virtual TA for ELEC3120. If a question is not related to Computer Communication Networks or the HKUST ELEC3120 syllabus, you must politely state that the topic is outside the scope of this course and offer to help with networking-related questions instead.

GROUNDING RULE:
You must base your answer ONLY on the content returned by the tools (or the user's attached document when provided). Do not add facts from general training. If the tools return nothing relevant, say so in one short paragraph and prefix it with [General Knowledge].

SEARCH PRIORITY:
1. IMMEDIATELY call 'lecture_slides_course'.
2. If the results contain the answer, STOP searching and provide the response immediately.
3. Only call 'Elec3120Textbook' if the lecture slides return no relevant content.

DECISIVENESS RULE:
Limit your search to 2 tool calls max. If you cannot find a perfect answer in the provided materials, provide the most helpful explanation possible based on general Networking knowledge and prefix it with [General Knowledge]. When using [General Knowledge], keep the answer to one short paragraph.

PEDAGOGICAL RULES:
- Step-by-Step Logic: Break down protocol processes into numbered sequences.
- Analogies: Use one real-world analogy for every abstract concept.
- Check for Understanding: Always end with a reflective question.

FORMATTING:
- Use LaTeX for math/headers: $SYN/ACK$.
- Bold key technical terms.
- Use Markdown tables for comparisons.
CRITICAL: No citations in text.

BEHAVIOR:
Be concise. If you are reaching your limit (4 steps), summarize what you found in the search results immediately.

EFFICIENCY RULES:
NEVER call the same tool with the same search query twice.
Once you have retrieved data from a slide or page, read it carefully before deciding to search again.
If the data you have is sufficient, STOP immediately and synthesize the answer.
Cite each source (lecture+slide or textbook+page) at most once; do not list the same slide or page multiple times.

ATTRIBUTION:
When the user attached a document (OCR context is provided), state clearly whether your answer is from "your document" or "course materials" and cite only the one you used.
```

---

## Step 5: Auto Agent – Update system message

**Node:** **Auto Agent**

**What to do:** Open **Options** → **System Message**. Replace the entire system message with the **same** text as in Step 4 (the full system message block above).

**Why:** Same behavior and grounding rules for both modes.

---

## Step 6: Normalize Agent Output – Add [General Knowledge] when no materials

**Node:** **Normalize Agent Output**

**What to do:** Replace the **entire** Code with the following:

```javascript
const input = $input.first().json;
let cleanAnswer = String(input.answer || '')
  .replace(/<think>[\s\S]*?<\/think>/g, '')
  .trim();

const materials = input.retrieved_materials || [];
const hasMaterials = materials.length > 0;

if (!hasMaterials && cleanAnswer.length > 100) {
  const hasGeneralKnowledge = /\[General Knowledge\]/i.test(cleanAnswer);
  if (!hasGeneralKnowledge) {
    cleanAnswer = '[General Knowledge]\n\n' + cleanAnswer;
  }
}

return [{
  json: {
    answer: cleanAnswer,
    retrieved_materials: materials
  }
}];
```

**Why:** When the agent gives a long answer but no tools were used, this marks it as [General Knowledge] so users know it is not from course materials.

---

## Step 7: Extract Tool Results – Confirm deduplication (optional)

**Node:** **Extract Tool Results**

**What to do:** Your current code already uses `seenKeys` and `uniqueKey = ${title}|${type}|${slideOrPage}`. No change required unless you see duplicates again. If you do, replace the node code with the full **Extract Tool Results** code from the earlier “full code and prompts” message (same logic, ensures robust dedupe).

**Why:** Ensures each (document_title, source_type, slide/page) appears at most once in `retrieved_materials`.

---

## Step 8: Build Citations – Confirm deduplication (optional)

**Node:** **Build Citations**

**What to do:** Your current code already dedupes by `title|source_type|slide` and builds minimal citations. No change required. If you ever need the exact version again, use the **Build Citations** full code from the earlier message.

**Why:** Second layer of deduplication before sending to the frontend.

---

## Checklist

| Step | Node                     | Action                                      |
|------|--------------------------|---------------------------------------------|
| 1    | Respond to Webhook       | Set Response Body to `JSON.stringify(...)` |
| 2    | DeepThink Agent          | Max Iterations: 15 → 8                      |
| 3    | Auto Agent               | Max Iterations: 6 → 4                      |
| 4    | DeepThink Agent          | Replace system message (full text above)   |
| 5    | Auto Agent               | Replace system message (same as Step 4)    |
| 6    | Normalize Agent Output   | Replace code (add [General Knowledge] rule)|
| 7    | Extract Tool Results     | Optional: only if duplicates persist      |
| 8    | Build Citations          | Optional: only if duplicates persist      |

---

## Optional (outside n8n)

- **Supabase / RAG:** If your vector store supports a similarity threshold, set it (e.g. 0.65) so low-relevance chunks are not sent to the agent. That improves precision and reduces noise.
- **Sticky note:** Update “Agent Tools for RAG -> TopK = 3” to “TopK = 2” if you already set both tools to `topK: 2` (your JSON shows 2; no change needed).

After applying Steps 1–6, save the workflow and test a few queries. Steps 7–8 are only if you still see duplicate sources.

---

## Fix: "Agent stopped due to max iterations" (Extract Tool Results + optional maxIterations)

When the agent hits its iteration limit before returning a final answer, n8n can output "Agent stopped due to max iterations." Fix it in two places.

### Step A: Extract Tool Results – handle max-iterations and return a useful answer

**Node:** **Extract Tool Results**

**What to do:** Replace the **entire** Code with the following. It keeps your existing dedupe and parsing, and adds logic so that when the agent stops due to max iterations (or returns no final answer), the workflow still returns an answer built from `retrieved_materials` instead of the raw message.

```javascript
const agentOutput = $input.first().json;
const steps = agentOutput.intermediateSteps || agentOutput.steps || [];
const retrieved_materials = [];
const seenKeys = new Set();

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
        const num = (rawNum !== undefined && rawNum !== null && rawNum !== 'N/A' && !isNaN(Number(rawNum)))
          ? Number(rawNum)
          : null;

        const slideOrPage = num != null ? String(num) : '';
        const uniqueKey = `${title}|${type}|${slideOrPage}`;

        if (seenKeys.has(uniqueKey)) continue;
        seenKeys.add(uniqueKey);

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

let finalAnswer = agentOutput.output || agentOutput.text || '';
const stoppedMaxIterations = /max\s*iterations|stopped\s*due\s*to/i.test(finalAnswer) || !finalAnswer.trim();

let forcedResponse = finalAnswer;

if (stoppedMaxIterations && retrieved_materials.length > 0) {
  const top = retrieved_materials[0];
  const excerpt = (top.content || '').substring(0, 500);
  forcedResponse = `I found relevant course material but reached my step limit before finishing a full answer. Here is what the materials say:\n\n**${top.document_title}** (${top.slide_number != null ? 'Slide ' + top.slide_number : top.page_number != null ? 'Page ' + top.page_number : ''}):\n\n${excerpt}${excerpt.length >= 500 ? '...' : ''}\n\nYou can rephrase your question or try **Deep Research** mode for a more complete answer.`;
} else if (stoppedMaxIterations) {
  forcedResponse = "I reached my step limit before finding a clear answer. Please try a shorter or more specific question, or use **Deep Research** mode for harder questions.";
} else if (!finalAnswer && retrieved_materials.length > 0) {
  const topResult = retrieved_materials[0];
  forcedResponse = `I reached my thinking limit, but I found this in **${topResult.document_title}** (Slide ${topResult.slide_number ?? topResult.page_number ?? '?'}):\n\n"${topResult.content.substring(0, 400)}..."`;
} else if (!finalAnswer) {
  forcedResponse = "I'm sorry, I couldn't find a specific answer in time. Please try asking about a specific lecture topic.";
}

return [{
  json: {
    answer: forcedResponse,
    retrieved_materials: retrieved_materials,
    iterations_hit: !Boolean(finalAnswer) || stoppedMaxIterations
  }
}];
```

**Why:** The user no longer sees the raw "Agent stopped due to max iterations" message; they get a short answer from the retrieved materials or a clear suggestion to rephrase or use Deep Research.

### Step B: Optional – increase max iterations

**Nodes:** **Auto Agent** and **DeepThink Agent**

**What to do:** In each agent’s options, increase **Max Iterations** so the agent finishes more often:

- **Auto Agent:** set **Max Iterations** to **6** (was 4).
- **DeepThink Agent:** set **Max Iterations** to **10** or **12** (was 8).

**Why:** Gives the agent a few more steps to synthesize an answer before hitting the limit; combined with Step A, you avoid showing the raw error even when it does stop.
