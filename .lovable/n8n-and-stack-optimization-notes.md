# Workflow + Supabase + Frontend Optimization Notes

## 1. n8n – One fix in your current workflow

### Respond to Webhook: expression typo

Your **Response Body** currently has **two** equals signs:

```
=={{ JSON.stringify({ answer: ...
```

In n8n, the expression must start with **one** `=`. Change it to:

```
={{ JSON.stringify({ answer: $json.answer ?? $json.output ?? "", citations: $json.citations ?? [], retrieved_materials: $json.retrieved_materials ?? [] }) }}
```

So: `=={{` → `={{` (remove the first `=`). Otherwise the webhook may return invalid JSON or the literal string.

---

## 2. Supabase – Optional improvements

Nothing is required for the workflow to run; these improve quality and speed.

| Area | What to do | Why |
|------|------------|-----|
| **Metadata** | Ensure every vector row used for RAG has: `document_title` (or equivalent), `slide_number` (lectures) or `page_number` (textbook), and `content` (or the field you return as chunk text). | Extract Tool Results and the frontend rely on these; missing values cause "Slide undefined", wrong dedupe keys, or empty content. |
| **Similarity threshold** | If your Supabase version or the n8n node supports a **minimum similarity score**, set it (e.g. 0.6–0.7). Filter out chunks below that in the query or in a post-query step. | Reduces irrelevant chunks sent to the agent and improves precision. |
| **Index** | Use the recommended index for the distance operator you use (e.g. `vector_cosine_ops` for cosine). Keep the embedding dimension consistent with your model (e.g. 384 for all-MiniLM-L6-v2). | Faster and more stable retrieval. |
| **Chunking** | Prefer chunks that align with slide boundaries (e.g. one chunk per slide or per logical segment) and store slide/page in metadata. | Cleaner citations and fewer duplicate slides. |

You do **not** need to change table names, webhook URLs, or the frontend just for the current workflow.

---

## 3. Frontend – Optional improvements

Your app already has: webhook + timeout, citation display, deduped sources, error boundary, and handling of `retrieved_materials` and `citations`. Optional tweaks:

| Area | What to do | Why |
|------|------------|-----|
| **[General Knowledge] in answer text** | When the message content starts with `[General Knowledge]`, you could show the same amber **NoCitationNotice** (or a small badge) even if the backend sent a fallback citation string. Right now NoCitationNotice shows when `isNoCitationMessage(message.citations)` and no `retrieved_materials`; if Normalize Agent Output prepends `[General Knowledge]`, that condition is usually already true. | Makes it visually clear when the answer is not from course materials. |
| **Timeouts** | `TIMEOUTS.CHAT` is 120s; fine for DeepThink. For "quick" mode you could use a shorter timeout (e.g. 30–45s) and show a "Try again or use Deep Research" message. | Better UX when the agent is slow. |
| **Loading state** | Keep a single loading indicator until the webhook responds (no change if you already do). | Avoids confusion during long runs. |

No frontend change is **required** for the updated workflow; the existing API shape (`answer`, `citations`, `retrieved_materials`) already matches.

---

## 4. Summary

- **n8n:** Fix Respond to Webhook: use `={{` (one `=`) in the Response Body.
- **Supabase:** Optional – complete metadata, similarity threshold, index, and chunking.
- **Frontend:** Optional – surface [General Knowledge] and/or tune timeouts.

After fixing the webhook expression, you can run the workflow as-is; add Supabase and frontend tweaks when you want to push precision and UX further.
