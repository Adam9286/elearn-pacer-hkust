# Debug guide: Supabase vector store not used by n8n agent

Follow these steps in order. Each step either fixes the issue or narrows it down.

---

## Part 1: Verify Supabase (data and schema)

### Step 1.1 – Check tables exist and have rows

1. Open **Supabase Dashboard** → **Table Editor**.
2. Confirm both tables exist:
   - `lecture_slides_course`
   - `elec3120_textbook`
3. Open each table and check that there are **multiple rows** (not empty).

**If a table is empty:** Re-run your embedding pipeline so the table has content. The agent can only “use” Supabase if there are rows to retrieve.

---

### Step 1.2 – Check embedding column name and dimensions

The n8n “Vector Store Supabase” node usually expects:

- A column that stores the **vector** (often named `embedding`).
- The column type must be compatible with pgvector (e.g. `vector(768)` for BGE).

1. In Supabase: **SQL Editor** → run:

```sql
-- For lecture_slides_course: list columns and one row
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lecture_slides_course'
ORDER BY ordinal_position;
```

2. Check the result:
   - There should be a **vector** column (e.g. `embedding`). Note its **exact name**.
   - If your table uses a different name (e.g. `content_embedding`), the n8n node might be looking for `embedding` and fail or return nothing.

3. Check vector dimensions (replace `embedding` if your column has another name):

```sql
SELECT array_length(embedding::real[], 1) AS dim
FROM lecture_slides_course
LIMIT 1;
```

- For **BAAI/bge-base-en-v1.5** you must see **768**. If you see 384 or anything else, your data was embedded with a different model; re-embed with BGE and 768-d.

**If the embedding column has a different name:** In n8n, open the Supabase vector store node and see if there is a “Vector column” or similar setting. Set it to your actual column name. If the node has no such option, the node may assume `embedding`; then either rename the column in Supabase to `embedding` or check n8n docs for your node version.

---

### Step 1.3 – Test retrieval directly in Supabase (optional but useful)

This checks that similarity search works with BGE embeddings.

1. In your app or a small script, generate a **768-d** vector for a test query (e.g. “What is TCP?”) using **BAAI/bge-base-en-v1.5**.
2. In Supabase SQL Editor (use the correct column name if not `embedding`):

```sql
-- Replace :query_embedding with your 768-d array
SELECT content, metadata, 1 - (embedding <=> '[0.1, ...]'::vector) AS similarity
FROM lecture_slides_course
ORDER BY embedding <=> '[0.1, ...]'::vector
LIMIT 3;
```

If this returns rows with reasonable similarity, Supabase and embeddings are fine; the issue is likely in n8n (agent not calling the tool or tool name mismatch).

---

## Part 2: Verify n8n (agent and tools)

### Step 2.1 – Run the workflow and confirm the agent runs

1. In n8n, open your workflow.
2. Use **Execute Workflow** (or trigger from the frontend).
3. Send a **simple course question** (e.g. “What is the TCP three-way handshake?”).
4. Watch the run:
   - **Build Final Context** → should output `query`, `finalContext`, `sessionId`, `mode`.
   - **If** or **Auto Agent** / **DeepThink Agent** should run.
   - **Extract Tool Results** should run.

If the run **errors** before the agent, fix that first (e.g. credentials, missing inputs). If the agent runs but you never see a “tool call” in the run, continue below.

---

### Step 2.2 – See whether the agent has tools and what they are named

1. After a run, click the **Auto Agent** (or **DeepThink Agent**) node.
2. Open the **output** / **execution data** for that run.
3. Look for:
   - **Tool calls** or **intermediate steps**: does the agent call any tool?
   - **List of tools** or **available tools**: what are the **exact** names the model sees?

In n8n LangChain, the tool name is often the **node name**, e.g.:

- `Supabase Retrieve Lecture Notes`
- `Supabase (Retrieve Textbook)`

Your system message says **'lecture_slides_course'** and **'Elec3120Textbook'**. If those strings are **not** the actual tool names, the model may never call the right tools (or may “call” a name that doesn’t exist).

**What to do:** Write down the **exact** tool names from the run (e.g. from the list of tools or from the first tool-call step). You’ll use them in Step 2.4.

---

### Step 2.3 – Check if the agent calls a tool at all

In the same execution:

- If you see **intermediate steps** or **tool_calls** with one of the Supabase tools and an **observation** (result), then the agent **is** using Supabase; the problem may be in **Extract Tool Results** (e.g. wrong `toolName` check or parsing). In that case, open **Extract Tool Results** and confirm it looks for `toolName.includes('lecture')` or `toolName.includes('textbook')` and that the observation format matches what you parse.
- If you see **no** tool calls, or only “finish” / final answer, the model is **choosing not to call** the retrieval tools. Most common cause: **tool name mismatch** or the prompt doesn’t force a tool call.

---

### Step 2.4 – Fix the system message: use exact tool names and require a tool call

1. Take the **exact** tool names from Step 2.2 (e.g. `Supabase Retrieve Lecture Notes`, `Supabase (Retrieve Textbook)`).
2. Open **Auto Agent** and **DeepThink Agent**.
3. In **Options** → **System Message**, do two things:

**A) Use those exact names** wherever you refer to the retrieval tools. For example, replace:

- “information from 'lecture_slides_course'” → “information from **Supabase Retrieve Lecture Notes**”
- “Use 'Elec3120Textbook'” → “Use **Supabase (Retrieve Textbook)**”

**B) Add one mandatory instruction** at the end of the system message (adapt tool names if different):

```
MANDATORY: For every user question about the course, you MUST call at least one of these tools first: "Supabase Retrieve Lecture Notes" or "Supabase (Retrieve Textbook)". Do not answer from memory alone. Call the lecture tool first, then answer from the returned content.
```

4. Save both agents and run the workflow again with the same test question. Check the agent output: you should see a tool call to one of the Supabase tools and then an answer.

---

### Step 2.5 – If the agent still doesn’t call tools: simplify the prompt

Sometimes the model still refuses to call tools. Try this:

1. In the **user prompt** (the “text” that goes into the agent, e.g. from “Build Final Context”), make the instruction explicit once:

   - “Step 1: Call the tool **Supabase Retrieve Lecture Notes** with this question: {{ $json.query }}. Step 2: Using only the tool result, write your answer.”

2. Run again. If the model now calls the tool, the issue was prompt/instruction; you can then relax the wording gradually while keeping the “MUST call at least one tool” rule.

---

### Step 2.6 – If the tool is called but Extract Tool Results is empty

1. Click **Extract Tool Results** and look at its **input** from the agent node.
2. Open the **agent output** and find the **tool step**: copy the exact structure of `intermediateSteps` or `steps` (e.g. `action.tool`, `action.name`, `observation`).
3. In **Extract Tool Results** you have:
   - `toolName = (step.action?.tool || step.action?.name || '').toLowerCase()`
   - and you only push to `retrieved_materials` when `toolName.includes('lecture') || toolName.includes('textbook')`.

So:

- If the actual tool name is e.g. `Supabase Retrieve Lecture Notes`, then `toolName` becomes `"supabase retrieve lecture notes"`, and `toolName.includes('lecture')` is true. Good.
- If the tool name in the run is something else (e.g. `match_lecturenotes`), then `toolName.includes('lecture')` is still true. If it were `match_lecturenotes` only, that’s fine; if it were something without “lecture” or “textbook”, you’d need to add that name to the condition.
- Then check **observation**: is it a JSON string? An array of `{ text, metadata }`? Your code parses `step.observation` and then looks at `res.text` or `res.pageContent` and `res.metadata`. Make sure the observation shape from the Supabase node matches (e.g. document chunks with `content` or `text` and metadata). If the shape is different, adapt the parsing (e.g. use `res.content` or the field your Supabase node actually returns).

---

## Part 3: Checklist summary

| Step | Where | What to check |
|------|--------|----------------|
| 1.1 | Supabase | Tables `lecture_slides_course` and `elec3120_textbook` exist and have rows. |
| 1.2 | Supabase | Embedding column exists (e.g. `embedding`), type is vector(768) for BGE. |
| 1.3 | Supabase | Optional: manual similarity search with a 768-d vector returns results. |
| 2.1 | n8n | Workflow runs without error and the Agent node executes. |
| 2.2 | n8n | From run output, note the **exact** tool names the agent sees. |
| 2.3 | n8n | In the run, confirm whether the agent ever calls a Supabase tool. |
| 2.4 | n8n | System message uses **exact** tool names and includes “MUST call at least one tool”. |
| 2.5 | n8n | If still no call: add an explicit “Step 1: Call … Step 2: Answer” in the user message. |
| 2.6 | n8n | If tool is called but `retrieved_materials` is empty: match Extract Tool Results parsing to the real `intermediateSteps` / `observation` shape. |

---

## Optional: BGE query prefix (HuggingFace)

BGE docs sometimes recommend prefixing the **query** with:

`Represent this sentence for searching relevant passages: `

n8n may pass the user query as-is. If after all steps above retrieval still feels weak, you could add a Code node before the agent that prepends this to `query` and then pass that to the agent; the Supabase tool would then receive the prefixed query. Only try this after the agent is actually calling the Supabase tools and you’ve confirmed Supabase returns rows (Steps 1.1–1.3 and 2.2–2.4).

After you complete Part 1 and Part 2, the agent should be using the Supabase vector store. If it still doesn’t, the next place to look is the exact payload shape of the Supabase node’s tool result and the parsing in Extract Tool Results (Step 2.6).
