# Mock Exam Phase 1

This is the first implementation step for the new Mock Exam system.

## What We Are Doing

We are creating the user-side database tables for:

- generated exam sessions
- per-question snapshots
- saved answers
- weakness tracking

## Important: Which Supabase Project Gets These Tables?

This project uses **two different Supabase projects**.

1. `externalSupabase`
   Use this for:
   - users
   - auth
   - saved exam attempts
   - grading history
   - weakness tracking

2. `examSupabase`
   Use this for:
   - `question_bank`
   - past papers
   - homework corpus
   - RAG retrieval

For this step, the SQL goes into **`externalSupabase`**, not `examSupabase`.

## The SQL File

Run this file in the SQL editor of the **Application Engine** database:

[`docs/sql/external-supabase/20260330_mock_exam_runtime.sql`](/c:/Users/adamb/OneDrive/Desktop/FYP/elearn-pacer-hkust/docs/sql/external-supabase/20260330_mock_exam_runtime.sql)

## Beginner Instructions

1. Open your Supabase dashboard.
2. Open the project used by `externalSupabase`.
   The current hardcoded app client points to:
   `https://dpedzjzrlzvzqrzajrda.supabase.co`
3. In the left sidebar, click `SQL Editor`.
4. Click `New query`.
5. Open the SQL file above from this repo.
6. Copy the whole file and paste it into the SQL editor.
7. Click `Run`.
8. After it finishes, check that these tables exist:
   - `mock_exam_sessions`
   - `mock_exam_questions`
   - `mock_exam_answers`
   - `user_mock_exam_weaknesses`

## Very Important Warning

Do **not** use `supabase db push` for this step unless you first verify your local CLI is linked to the correct live project.

Right now, [`supabase/config.toml`](/c:/Users/adamb/OneDrive/Desktop/FYP/elearn-pacer-hkust/supabase/config.toml) does **not** match the live `externalSupabase` project used by the app.

So the safe beginner path is:

- use the Supabase dashboard
- run the SQL manually

## What Happens Next

After this SQL is applied, the next step is:

1. update the n8n contract so it returns structured exam JSON
2. save generated exam sessions into these new tables
3. refactor the frontend away from PDF-only flow
