# Duplicate sources: in-depth debug and fix guide

This guide helps you find **why** the same source (same document + slide/page + content) appears multiple times, and how to fix it at **database → embedding/ingest → n8n → frontend**, in that order when possible.

---

## 1. Where duplicates can come from

| Layer | What can cause duplicates |
|-------|----------------------------|
| **Database** | Same chunk stored in multiple rows (e.g. ingest script run twice, or no unique constraint). |
| **Embedding / chunking** | Overlapping chunks (e.g. sliding window) so the same sentence appears in 2+ rows; or multiple chunks per slide with identical content. |
| **n8n** | Agent calls the same tool twice (e.g. "Supabase Retrieve Lecture Notes" with two similar queries); or two tools return the same chunk; or Extract Tool Results doesn’t dedupe strictly. |
| **Frontend** | Already dedupes by (source, slide, content). If you still see dupes, they differ slightly (e.g. whitespace) or the key doesn’t include content. |

Your current setup: **Lecture notes** topK = 2, **Textbook** topK = 3; **Extract Tool Results** dedupes by exact `content` and optionally by (source, slide). So the most likely causes are: (1) duplicate or near-duplicate rows in Supabase, (2) overlapping chunks at ingest, (3) same chunk returned in multiple tool calls and content not exactly equal (e.g. trimming).

---

## 2. Fix at the database (Supabase)

Goal: ensure each logical “chunk” (same document + slide/page + content) exists at most once.

### 2.1 Check if you have duplicate rows

Run in **Supabase → SQL Editor**. Adjust column names to match your tables (`content`, `metadata`, or your actual schema).

**Lecture table (`lecture_slides_course`):**

```sql
-- Count rows that share the same (document, slide, content)
-- Replace content/metadata column names if yours differ (e.g. raw_content, meta)
WITH normalized AS (
  SELECT
    id,
    content,
    trim(content) AS content_trim,
    (metadata->>'document_title')   AS doc_title,
    (metadata->>'lecture_id')       AS lecture_id,
    (metadata->>'slide_number')::int AS slide_num
  FROM lecture_slides_course
)
SELECT
  COALESCE(doc_title, lecture_id) AS source,
  slide_num,
  content_trim,
  COUNT(*) AS cnt
FROM normalized
GROUP BY 1, 2, 3
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
```

**Textbook table (`elec3120_textbook`):**

```sql
WITH normalized AS (
  SELECT
    id,
    content,
    trim(content) AS content_trim,
    (metadata->>'document_title')   AS doc_title,
    (metadata->>'page_number')::int  AS page_num
  FROM elec3120_textbook
)
SELECT
  doc_title AS source,
  page_num,
  LEFT(content_trim, 80) AS content_preview,
  COUNT(*) AS cnt
FROM normalized
GROUP BY 1, 2, 3
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
```

If these return rows, you have DB-level duplicates.

### 2.2 Optional: add a content hash for dedupe

If your tables don’t have a “content hash” column, add one so you can dedupe or add a unique constraint:

```sql
-- Example: add hash column (run once per table)
ALTER TABLE lecture_slides_course
ADD COLUMN IF NOT EXISTS content_hash TEXT;

UPDATE lecture_slides_course
SET content_hash = md5(trim(content))
WHERE content_hash IS NULL;

-- Same for textbook if needed
ALTER TABLE elec3120_textbook
ADD COLUMN IF NOT EXISTS content_hash TEXT;

UPDATE elec3120_textbook
SET content_hash = md5(trim(content))
WHERE content_hash IS NULL;
```

### 2.3 One-time cleanup: keep one row per (source, slide/page, content)

**Option A – delete duplicates, keep one arbitrary row:**

```sql
-- Lecture: keep one row per (doc_title/lecture_id, slide_number, content_hash)
DELETE FROM lecture_slides_course a
USING lecture_slides_course b
WHERE a.id < b.id
  AND COALESCE(a.metadata->>'document_title', a.metadata->>'lecture_id')
    = COALESCE(b.metadata->>'document_title', b.metadata->>'lecture_id')
  AND (a.metadata->>'slide_number') IS NOT DISTINCT FROM (b.metadata->>'slide_number')
  AND md5(trim(a.content)) = md5(trim(b.content));
```

**Option B – use a CTE to keep the row with smallest `id`:**

```sql
WITH dupes AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(metadata->>'document_title', metadata->>'lecture_id'),
        metadata->>'slide_number',
        md5(trim(content))
      ORDER BY id
    ) AS rn
  FROM lecture_slides_course
)
DELETE FROM lecture_slides_course
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);
```

Repeat the same idea for `elec3120_textbook` (partition by document_title, page_number, content hash).

### 2.4 Prevent future duplicates (unique constraint)

Only do this after cleanup and if your ingest pipeline can handle “on conflict” or skip existing:

```sql
-- Example: unique on (document, slide, content_hash)
-- Requires content_hash and non-null metadata keys; adjust to your schema
ALTER TABLE lecture_slides_course
ADD CONSTRAINT uq_lecture_slide_content
UNIQUE (
  (COALESCE(metadata->>'document_title', metadata->>'lecture_id')),
  (metadata->>'slide_number'),
  content_hash
);
```

If your metadata is JSONB and you prefer not to use a hash column, you can use a **unique index on expression** instead (Postgres allows that). If you hit errors (e.g. nulls), use a partial unique index or ensure those columns are always set during ingest.

**Summary (database):** Run the “count duplicates” queries; if you have dupes, clean once with Option A or B, then optionally add a unique constraint or content_hash and enforce it in your ingest script.

---

## 3. Fix at the embedding / ingest layer

Goal: don’t insert duplicate or heavily overlapping chunks so the same content isn’t stored multiple times.

### 3.1 Chunking strategy

- **Prefer slide-boundary chunking:** one chunk per slide (or per logical segment within a slide). That reduces “same slide, multiple chunks” and makes “one citation per slide” meaningful.
- **Avoid** a sliding window that overlaps heavily (e.g. 500 tokens with 400 overlap), or you’ll get the same sentence in several rows and retrieval will return duplicates.

### 3.2 Dedupe before insert

In whatever script or workflow **embeds and inserts** into `lecture_slides_course` and `elec3120_textbook`:

1. Normalize content: `trim()`, collapse internal whitespace (e.g. replace `\s+` with space).
2. Build a key per chunk: e.g. `document_id + slide_number + normalized_content` (or content hash).
3. Before inserting, check if that key (or hash) already exists; if yes, skip or update.
4. If using a unique constraint (section 2.4), use `ON CONFLICT DO NOTHING` (or `DO UPDATE`) so duplicates are ignored or updated.

### 3.3 Check embedding dimensions

Your n8n workflow uses **BAAI/bge-base-en-v1.5** (768-d). Ensure **every** row in both tables was embedded with this model and that the vector column is `vector(768)`. Mismatched dimensions or models can cause odd retrieval behavior (see `.lovable/n8n-supabase-not-used-troubleshooting.md`).

**Summary (embedding):** Chunk by slide where possible; dedupe by (document, slide/page, content) before insert; match embedding model and dimensions to n8n.

---

## 4. Fix in n8n (your current workflow)

Your **Extract Tool Results** already:

- Dedupes by **exact content** (`seenContent`).
- Optionally dedupes by **source + slide** (`seenSources` when `ONE_CITATION_PER_SLIDE = true`).

Improvements that reduce duplicates further:

### 4.1 Normalize content before dedupe

Content from different tool calls might differ only by whitespace or newlines. Normalize before adding to `seenContent`:

```javascript
// Inside the loop, after you have cleanContent:
function normalizeForDedupe(str) {
  return String(str)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase(); // optional: only if you want "Same Text" and "same text" to count as duplicate
}
// When checking:
const normalizedContent = normalizeForDedupe(cleanContent);
if (seenContent.has(normalizedContent)) continue;
seenContent.add(normalizedContent);
```

Use the **original** `cleanContent` when pushing to `retrieved_materials`, and the **normalized** version only for the duplicate check.

### 4.2 One citation per slide (optional)

You have `ONE_CITATION_PER_SLIDE = false`, so multiple chunks from the same slide are kept. If you want at most one citation per (source, slide), set it to `true`:

```javascript
const ONE_CITATION_PER_SLIDE = true;
```

That way, even if the agent gets two chunks from “Lecture 5, Slide 3”, only the first one is added.

### 4.3 Final dedupe pass before output

After the loop over `steps`, dedupe `retrieved_materials` again by (document_title, slide_number, page_number, content) so that any remaining duplicates (e.g. from different step shapes or tool names) are collapsed:

```javascript
// After the for (const step of steps) loop, before building the return value:
const seenKey = new Set();
const deduped = retrieved_materials.filter((m) => {
  const key = [
    m.document_title ?? m.lecture_title ?? '',
    m.slide_number ?? '',
    m.page_number ?? '',
    (m.content || '').trim().replace(/\s+/g, ' ')
  ].join('|');
  if (seenKey.has(key)) return false;
  seenKey.add(key);
  return true;
});
// Then use deduped instead of retrieved_materials in the return
```

### 4.4 Fix Chat Memory session key typo

In your **Chat Memory** node you have:

```json
"sessionKey": "=={{ $json.sessionId || $items('Prepare AI Context')[0].json.sessionId || 'sid_fallback' }}\n"
```

The `=={{` should be `={{` (one `=`). Otherwise the session key is literally the string starting with `=`, and memory may not work as intended. In the n8n UI, set:

- **Session Key:** `={{ $json.sessionId || $items('Prepare AI Context')[0].json.sessionId || 'sid_fallback' }}`

### 4.5 Respond to Webhook – optional citations from retrieved_materials

You currently return `citations: []`. If you want the frontend to receive both `retrieved_materials` and a list of citation strings (e.g. for display), you can build `citations` from `retrieved_materials` in **Normalize Agent Output** or in a small Code node before **Respond to Webhook**, e.g. one string per material like `"Lecture X (Slide Y)"`. The frontend already dedupes by (source, slide, content); this is optional for UX only.

**Summary (n8n):** Normalize content when checking `seenContent`; set `ONE_CITATION_PER_SLIDE = true` if you want at most one per slide; add a final dedupe pass on `retrieved_materials`; fix the session key `=={{` → `={{`.

---

## 5. Frontend (already in place)

The app dedupes in **CitationSection** by (source, slide/page, content) via `getCitationDedupeKey()`. So:

- Any two items with the **exact same** source, slide (or page), and content will show as one.
- If duplicates still appear, they differ either in content (e.g. extra space) or in how source/slide are derived. Improving normalization in n8n (section 4.1 and 4.3) keeps the payload clean so the frontend key matches.

No code change required on the frontend for “exact same source, slide, content”; optional improvement is to normalize the key (e.g. trim content, collapse spaces) in `getCitationDedupeKey` if you want to merge near-identical content.

---

## 6. Order of operations (recommended)

1. **Database:** Run the duplicate-check queries (section 2.1). If duplicates exist, clean once (2.3) and optionally add constraint/hash (2.2, 2.4).
2. **Embedding/ingest:** Ensure chunking is slide-aligned and dedupe before insert (section 3). Re-run ingest only if you changed chunking or added constraints.
3. **n8n:** Apply content normalization and final dedupe in Extract Tool Results (4.1, 4.3); set `ONE_CITATION_PER_SLIDE = true` if you want one per slide; fix session key (4.4).
4. **Frontend:** Already handles exact duplicates; no change unless you add key normalization.

This order addresses the root cause (DB and ingest) first, then tightens the pipeline (n8n), with the frontend as a final safeguard.

---

## 7. Quick reference – your current nodes

| Node | Table / setting | Note |
|------|------------------|------|
| Supabase Retrieve Lecture Notes | `lecture_slides_course`, topK 2, queryName `match_lecturenotes` | Primary source |
| Supabase (Retrieve Textbook) | `elec3120_textbook`, topK 3, queryName `match_textbook` | Secondary |
| Extract Tool Results | `seenContent` (exact content), `seenSources` (optional per slide) | Add normalize + final dedupe |
| Chat Memory | `sessionKey`: fix `=={{` → `={{` | Typo |
| Respond to Webhook | `answer`, `retrieved_materials`, `citations: []` | Optional: build citations from materials |

If you share your exact table schemas (column names for `content`, `metadata`), the SQL in section 2 can be adjusted to match.
