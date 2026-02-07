# Why the chatbot hasn't used Supabase (RAG tools)

Two things in your workflow are the most likely reasons the agent never calls the lecture or textbook tools.

---

## 1. Embedding model mismatch (most likely)

Your **Embeddings HuggingFace Inference** node uses:

- **Current:** `BAAI/bge-base-en-v1.5` → produces **768-dimensional** vectors.

If your Supabase tables (`lecture_slides_course`, `elec3120_textbook`) were embedded with a **different** model (e.g. `sentence-transformers/all-MiniLM-L6-v2`, which is **384-dimensional**), then:

- The agent sends a **768-d** query vector to Supabase.
- The table stores **384-d** vectors.
- Dimension mismatch causes similarity search to fail or return no/useless results, so the agent effectively “never gets” RAG content.

**Fix:**

- **Option A (recommended if tables were built with MiniLM):** In the **Embeddings HuggingFace Inference** node, set the model back to:
  ```
  sentence-transformers/all-MiniLM-L6-v2
  ```
  So it matches the embeddings already in Supabase.

- **Option B (if you want to use BGE):** Re-embed **all** documents in Supabase with `BAAI/bge-base-en-v1.5` (768-d), and ensure the table column size is 768. Then keep the current embedding model in n8n.

**How to check:** In Supabase, inspect the vector column (e.g. `embedding`) and its dimensions. It must match the embedding model used in n8n (384 for MiniLM, 768 for bge-base-en-v1.5).

---

## 2. Tool names in the system message don’t match what the agent sees

Your system message says:

- “ALWAYS prioritize information from **'lecture_slides_course'**”
- “Use **'Elec3120Textbook'** only if…”

In n8n, the **tool name** the LLM sees is usually the **node name**, not the table name:

- **Supabase Retrieve Lecture Notes** → tool name is likely something like `"Supabase Retrieve Lecture Notes"` or `"match_lecturenotes"` (if queryName is used as tool name).
- **Supabase (Retrieve Textbook)** → tool name is likely `"Supabase (Retrieve Textbook)"` or similar.

If the model is told to call `'lecture_slides_course'` and `'Elec3120Textbook'` but those exact strings are **not** the tool names, it may never call the right tools.

**Fix:**

1. In n8n, open the **Auto Agent** (or **DeepThink Agent**) and run a test. In the run output, check the **tool list** or the first step where the agent “chooses” a tool. Note the **exact** tool names (e.g. `Supabase Retrieve Lecture Notes`, `Supabase (Retrieve Textbook)`).
2. In the **system message**, replace references to `lecture_slides_course` and `Elec3120Textbook` with those **exact** tool names. For example, if the tools are named “Supabase Retrieve Lecture Notes” and “Supabase (Retrieve Textbook)”, write:
   - “ALWAYS prioritize information from **Supabase Retrieve Lecture Notes**.”
   - “Use **Supabase (Retrieve Textbook)** only if the lecture slides are too brief…”
3. Add one explicit instruction so the model doesn’t skip tools:
   - “You MUST call at least one of the retrieval tools (Supabase Retrieve Lecture Notes or Supabase (Retrieve Textbook)) before answering any course-related question. Do not answer from memory alone.”

Apply this in **both** Auto Agent and DeepThink Agent system messages.

---

## 3. Quick checklist

| Check | Action |
|-------|--------|
| Embedding dimensions | Match Supabase vector size to the n8n embedding model (384 = MiniLM, 768 = bge-base-en-v1.5). Either change n8n back to MiniLM or re-embed with BGE. |
| Tool names | Use the **exact** tool names from the agent run in your system message, and add “MUST call at least one retrieval tool.” |
| Supabase credentials | Confirm the Supabase node uses the right credential and that the tables exist and have rows. |
| Table names | Your textbook table is `elec3120_textbook`; the system message says “Elec3120Textbook”. Table name is for n8n config; tool name for the LLM is the node name. |

After fixing the embedding match and the tool names, run a simple course question again; the agent should start calling the Supabase tools and you should see sources in the UI.
