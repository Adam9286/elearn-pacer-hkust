# Force RAG (no general knowledge) + readable formulas

Two goals: (1) make the agent always use lecture/textbook materials, and (2) keep formulas readable in the UI.

---

## 1. Readable formulas (frontend – done)

The app now renders **LaTeX block math** in both forms:

- `$$ ... $$`
- `\[ ... \]` (what many models output)

So display formulas like `D_{\text{total}} = \frac{L}{R} + d_{\text{prop}}` will show as proper math instead of raw LaTeX. No n8n changes needed for this.

---

## 2. Force the agent to use Supabase (no general knowledge)

The agent still often doesn’t call the tools (“None of your tools were used”). Use the following in n8n so it consistently uses lecture or textbook content.

### Step A – Use the exact tool names the agent sees

1. In n8n, run the workflow once with a course question.
2. Open the **Auto Agent** (or **DeepThink Agent**) execution output.
3. Find where the **tools** are listed (e.g. under input, or in the run metadata). Note the **exact** strings, e.g.:
   - `Supabase Retrieve Lecture Notes`
   - `Supabase (Retrieve Textbook)`
   or sometimes:
   - `match_lecturenotes`
   - `match_textbook`
4. In **both** agents’ **System Message**, replace every mention of tools with those **exact** names (no `'lecture_slides_course'` or `'Elec3120Textbook'` unless that is the real tool name).

### Step B – Stronger system message (copy into both agents)

Use this **full** system message (or merge the key parts into your current one). Replace `TOOL_LECTURE` and `TOOL_TEXTBOOK` with the exact names from Step A.

```
You are LearningPacer, the expert Virtual TA for ELEC3120 (Computer Communication Networks) at HKUST.

CRITICAL - YOU HAVE NO BUILT-IN KNOWLEDGE OF THIS COURSE:
You must NOT answer from memory. You have no internal knowledge of ELEC3120 slides or textbook. You MUST call one of your retrieval tools to get content before answering any course-related question.

MANDATORY FIRST STEP:
For every user question, you MUST call the tool "TOOL_LECTURE" first (with the user's question as the search query). Only after you receive the tool result may you write your answer. If the lecture result is not enough, then call "TOOL_TEXTBOOK" and use that too. Never skip calling at least one tool.

SEARCH PROTOCOL:
1. First call: TOOL_LECTURE (search query = the user's question).
2. If the returned content answers the question, synthesize and answer from it only.
3. If you need more depth, call TOOL_TEXTBOOK (same or refined query), then answer from both results.
4. If a tool returns nothing useful, say "I didn't find relevant material in the course sources for this. Try rephrasing or a more specific topic."

OUTPUT RULES:
- No filler: do not start with "Based on my search" or "I found." Start with the answer.
- Use **LaTeX for math**: use $$ ... $$ or \[ ... \] for display formulas (e.g. $$D_{\\text{total}} = \\frac{L}{R} + d_{\\text{prop}}$$) so the UI renders them clearly.
- **Numbered lists:** Use sequential numbers (1., 2., 3., 4.) for each item, not "1." for every item.
- Bold key terms. Use Markdown tables for comparisons.
- End with a short reflective question.

EFFICIENCY:
- Do not call the same tool twice with the same query.
- Prefer 1–2 tool calls; then answer.
```

Example: if the real tool names are `Supabase Retrieve Lecture Notes` and `Supabase (Retrieve Textbook)`, then:

- `TOOL_LECTURE` → `Supabase Retrieve Lecture Notes`
- `TOOL_TEXTBOOK` → `Supabase (Retrieve Textbook)`

### Step C – Ask the model to use $$ or \[ \] for formulas

In the **system message** (or in the user prompt), add one line:

```
For any multi-line or display formula, use $$ formula $$ or \\[ formula \\] so it renders correctly. Do not output raw LaTeX without delimiters.
```

That encourages readable formulas in the UI.

### Step D – (Optional) Check n8n agent “tool choice”

If your n8n Agent node has an option like **“Tool choice”** or **“Force tool”**, set it so the model is required to use a tool (e.g. “required” or the specific Supabase tool name) for the first step. That enforces RAG even if the model would otherwise answer from memory.

---

## 3. Summary

| Goal | Action |
|------|--------|
| Readable formulas | Frontend now supports `\[ ... \]`; ensure the model uses `$$...$$` or `\[...\]` for display math. |
| Use materials, not general knowledge | Use exact tool names in the prompt; add “no built-in ELEC3120 knowledge” and “MUST call TOOL_LECTURE first”; optionally force tool use in the agent settings. |

After updating the system message (and optional tool choice), run the workflow again: the agent should call the Supabase tools and the answer should be based on course materials, with formulas rendering correctly in the app.

---

## 4. Duplicate sources

**Full guide:** For step-by-step debugging and fixes at database → embedding → n8n → frontend, see **`.lovable/duplicate-sources-debug-and-fix-guide.md`**. It includes SQL to find duplicates in Supabase, cleanup and optional unique constraints, ingest/chunking tips, and exact n8n code snippets (content normalization, final dedupe pass, and the Chat Memory `=={{` → `={{` typo fix).

**Short version:**  
- **Frontend:** Already dedupes by (source, slide, content).  
- **n8n:** Extract Tool Results can normalize content before dedupe and add a final dedupe pass; fix session key typo.  
- **Database:** Run the duplicate-check queries in the guide; clean once and optionally add a unique constraint.  
- **Embedding:** Chunk by slide and dedupe before insert to avoid storing the same content twice.
