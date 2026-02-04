
# Chat Performance Optimization Plan

## Problem Summary

Your current Chat Mode takes **60-100+ seconds** to respond, while your previous workflow responded in ~30 seconds. The root causes are:

1. **No frontend timeout** - fetch hangs indefinitely
2. **JSON output requirement** - forces the LLM to reason about structure
3. **High maxIterations (100)** - allows excessive tool calls
4. **Missing HNSW indexes** - vector search scans sequentially
5. **High TopK values** - retrieves too many documents

---

## What Will Change

### Summary Table

| Component | Current | After Optimization |
|-----------|---------|-------------------|
| Frontend timeout | None (hangs forever) | 90 seconds with graceful error |
| n8n maxIterations | 100 | 10 |
| n8n TopK (Auto) | Lecture 3, Textbook 2 | Lecture 2, Textbook 1 |
| n8n TopK (DeepThink) | Default (10?) | Lecture 3, Textbook 2 |
| Agent output format | Strict JSON schema | Plain text + post-processing |
| Database indexes | None | HNSW on both vector tables |

---

## Part 1: Frontend Timeout (Code Changes)

### File: `src/components/ChatMode.tsx`

Add an AbortController to the fetch call so it times out after 90 seconds instead of hanging forever.

**Changes:**
- Import `TIMEOUTS` from constants
- Create AbortController before fetch
- Set timeout to abort after 90 seconds
- Handle AbortError separately from network errors
- Show user-friendly timeout message

### File: `src/constants/api.ts`

The `TIMEOUTS.CHAT` constant already exists (120000ms). We'll use 90 seconds (90000ms) for the abort to leave buffer time.

---

## Part 2: n8n Workflow Changes (Manual Steps)

You'll need to make these changes in your n8n workflow editor.

### Step 2.1: Reduce maxIterations

**Node:** Auto Agent

**Current:**
```json
"options": {
  "maxIterations": 100
}
```

**Change to:**
```json
"options": {
  "maxIterations": 10
}
```

**Why:** Prevents the agent from making excessive tool calls. 10 iterations is enough for 2-3 retrieval attempts.

---

### Step 2.2: Reduce TopK Values

**Auto Agent Tools:**

| Node | Current TopK | New TopK |
|------|--------------|----------|
| Supabase Retrieve Lecture Notes | 3 | 2 |
| Supabase (Retrieve Textbook) | 2 | 1 |

**DeepThink Agent Tools:**

| Node | Current TopK | New TopK |
|------|--------------|----------|
| Supabase (Retrieve Lecture Notes)1 | Default (10) | 3 |
| Supabase (Retrieve Textbook)1 | Default (5) | 2 |

---

### Step 2.3: Simplify Agent Output (Remove JSON Requirement)

**Current System Prompt (both agents):**
The system prompt forces JSON output:
```
CRITICAL OUTPUT REQUIREMENT (MANDATORY)
You MUST return a JSON object with EXACTLY these keys:
{
  "answer": string,
  "retrieved_materials": array
}
```

**New System Prompt:**
```
You are LearningPacer, a course-specific virtual teaching assistant for ELEC3120 (Computer Networks) at HKUST.

GENERAL BEHAVIOR
- Be concise, clear, and academically precise.
- Assume the user wants a correct explanation grounded in course material.
- Do NOT hallucinate lecture content.
- Do NOT invent page numbers, chapters, or sources.

ACADEMIC RULES
- Use ELEC3120 lecture slides as the PRIMARY source.
- Use the ELEC3120 textbook ONLY if lecture slides are insufficient.
- Use OCR context ONLY if explicitly provided.
- If no relevant course material is retrieved, explicitly say:
  "No directly relevant course material was retrieved."
  Then provide a short explanation labeled as "General knowledge".

FORMAT RULES
- Plain text only (no markdown headers).
- Short paragraphs.
- Dash (-) bullets only when listing.
- No emojis.
- Use LaTeX for equations.

Do NOT include citations in your answer. The system will handle citations separately.
```

**User Prompt (simplified):**
```
User Question:
"{{$json.query}}"

OCR Context (if any):
{{$json.finalContext}}

Instructions:
1. If OCR context is present and relevant, prioritize it.
2. Otherwise, retrieve from lecture slides first.
3. Use the textbook only if lecture slides are insufficient.
4. Answer the question directly in plain text.
```

---

### Step 2.4: Update Post-Processing Nodes

Since the agent will now return plain text, update the "Normalize Agent Output" node:

**New Code:**
```javascript
const raw = $json.output ?? $json.text ?? $json.result ?? '';

// Get the answer text directly (no JSON parsing needed)
let answer = String(raw)
  .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove chain-of-thought
  .replace(/^#{1,6}\s+/gm, '')                // Remove headers
  .replace(/\*\*/g, '')                       // Remove bold
  .replace(/\*/g, '')                         // Remove italic
  .replace(/\n{3,}/g, '\n\n')                 // Normalize newlines
  .trim();

// We'll get retrieved_materials from a separate tool output aggregator
// For now, return empty array - the Build Citations node handles this
return [{
  json: {
    answer,
    retrieved_materials: []
  }
}];
```

**Update "Build Citations" Node:**
Since we removed JSON output, we need to extract materials from the agent's tool calls. For simplicity, you can:

Option A: Return empty arrays (citations won't show)
Option B: Add a "Window Buffer Memory" node to capture tool outputs

For now, use Option A (simpler):
```javascript
const item = $input.first().json;

return [{
  json: {
    answer: item.answer || '',
    citations: [],
    retrieved_materials: []
  }
}];
```

---

## Part 3: Database HNSW Indexes (SQL)

Run this SQL in your exam Supabase project (oqgotlmztpvchkipslnc) via the SQL editor:

```sql
-- Create HNSW index for lecture_slides_course table
-- This dramatically speeds up vector similarity searches
CREATE INDEX IF NOT EXISTS lecture_slides_course_embedding_hnsw_idx 
ON lecture_slides_course 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create HNSW index for Elec3120Textbook table
CREATE INDEX IF NOT EXISTS elec3120_textbook_embedding_hnsw_idx 
ON "Elec3120Textbook" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Analyze tables to update query planner statistics
ANALYZE lecture_slides_course;
ANALYZE "Elec3120Textbook";
```

**What HNSW does:**
- Creates a graph-based index for approximate nearest neighbor search
- Reduces search time from O(n) sequential scan to O(log n)
- `m = 16` controls graph connectivity (higher = more accurate, slower to build)
- `ef_construction = 64` controls build-time accuracy

---

## Part 4: Verify Custom Match Functions

Check if your custom query functions (`match_lecturenotes`, `match_textbook`) are properly optimized. Run this to see current function definitions:

```sql
\df match_lecturenotes
\df match_textbook
```

If they don't use the HNSW index properly, you may want to remove the `queryName` option from n8n and let it use the default pgvector matching.

---

## Implementation Checklist

### Frontend (I will implement)
- [ ] Add AbortController with 90s timeout to ChatMode.tsx
- [ ] Handle timeout errors with user-friendly message
- [ ] Show "Request timed out" toast on failure

### n8n (You implement manually)
- [ ] Set Auto Agent maxIterations to 10
- [ ] Set DeepThink Agent maxIterations to 10
- [ ] Reduce Lecture Notes TopK: 3 → 2 (Auto), Default → 3 (DeepThink)
- [ ] Reduce Textbook TopK: 2 → 1 (Auto), Default → 2 (DeepThink)
- [ ] Simplify system prompts (remove JSON requirement)
- [ ] Update Normalize Agent Output code
- [ ] Update Build Citations code

### Database (Run SQL in Supabase)
- [ ] Create HNSW index on lecture_slides_course
- [ ] Create HNSW index on Elec3120Textbook
- [ ] Run ANALYZE on both tables

---

## Expected Performance Improvement

| Metric | Before | After (Estimated) |
|--------|--------|-------------------|
| Average response time | 60-100s | 15-30s |
| Timeout handling | Hangs forever | Graceful 90s timeout |
| Vector search speed | O(n) scan | O(log n) HNSW |
| Tool iterations | Up to 100 | Max 10 |

---

## Files to Modify

| File | Action |
|------|--------|
| `src/components/ChatMode.tsx` | Add AbortController timeout |
| `src/constants/api.ts` | No changes needed (TIMEOUTS.CHAT exists) |

---

## Trade-offs

1. **Removing JSON output** means we lose structured `retrieved_materials` from the agent. Citations will be empty unless you add a separate tool output collector.

2. **Lower TopK** means less context for the LLM, potentially reducing answer quality for complex questions.

3. **Lower maxIterations** means the agent might not find relevant content if the first attempts fail.

These are acceptable trade-offs for a 3-4x speed improvement.
