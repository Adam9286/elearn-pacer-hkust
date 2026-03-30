# Supabase Ownership Map

This project uses **two separate Supabase projects on purpose**.

Do not merge them during the FYP unless there is a very strong reason. Right now the split is useful.

## 1. LearningPacer Backend

- Project role: application database
- Project ref: `dpedzjzrlzvzqrzajrda`
- URL: `https://dpedzjzrlzvzqrzajrda.supabase.co`
- Use this for:
  - auth
  - user profiles / roles
  - chat history
  - course progress
  - lesson mastery
  - feedback
  - quiz attempts
  - future mock exam sessions / answers / weakness tracking

### Active Tables

- `chat_conversations`
- `chat_messages`
- `feedback`
- `lesson_mastery`
- `user_progress`
- `user_roles`
- `quiz_attempts`

### Likely Legacy / Not Referenced In Repo

- `announcements`
- `discussions`
- `discussion_replies`

These should **not** be deleted immediately. Audit first.

## 2. Adam9286 Project

- Project role: knowledge base and exam content database
- Project ref: `oqgotlmztpvchkipslnc`
- URL: `https://oqgotlmztpvchkipslnc.supabase.co`
- Use this for:
  - lecture slide source data
  - generated slide explanations
  - question bank
  - past papers
  - homework corpus
  - mock exam content lineage
  - n8n RAG retrieval

### Active Tables

- `lecture_slides_course`
- `slide_explanations`
- `question_bank`
- `mock_exams`

### Possibly Active But Needs Manual n8n Check

- `n8n_chat_histories`

This table is not referenced in the repo, but it may be used by n8n memory nodes.

### Likely Legacy / Not Referenced In Repo

- `elec3120_textbook`
- `exam_questions_small`

These should **not** be deleted immediately. Audit first.

## Recommendation

Keep the two-project architecture.

Do **not** combine them right now.

Why:

- the application database has private user data and RLS-heavy tables
- the knowledge base database has content-heavy tables and looser retrieval patterns
- your current code and n8n workflows already assume this split
- merging now creates migration risk without solving a product problem

## Cleanup Strategy

Use this rule:

1. `ACTIVE`
   Used by frontend, edge functions, or n8n right now.

2. `VERIFY`
   Not referenced in repo, but might still be used by n8n or manual admin workflows.

3. `LEGACY`
   No repo references, no n8n references, clearly replaced by a newer table.

## Safe Cleanup Order

1. Make an inventory sheet.
   For each table, record:
   - project
   - purpose
   - active / verify / legacy
   - row count
   - last edited date
   - replacement table if any

2. Audit before deleting.
   Check:
   - repo references
   - edge function references
   - n8n workflow references
   - whether the table still has data you care about

3. Archive before delete.
   For legacy tables:
   - export the table first
   - rename it with a `legacy_` prefix or move it to an `archive` schema
   - wait at least a few days before permanent deletion

4. Delete only after a freeze period.
   If nothing breaks, then delete it.

## What I Recommend You Do Next

Do not delete tables today.

First:

1. keep both Supabase projects
2. label every table as `ACTIVE`, `VERIFY`, or `LEGACY`
3. verify `n8n_chat_histories` and `mock_exams` inside n8n
4. verify whether `announcements`, `discussions`, and `discussion_replies` are truly unused
5. only then archive old tables

## Practical Naming Rule

Think of the two projects like this:

- `LearningPacer Backend` = user state
- `Adam9286 Project` = course content

If a table stores something a student **does**, it belongs in `LearningPacer Backend`.

If a table stores something the AI **reads from**, it belongs in `Adam9286 Project`.
