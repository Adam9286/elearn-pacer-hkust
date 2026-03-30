# AI Project Sync & Memory
**Project:** LearningPacer (ELEC3120)
**Last Updated:** 2026-03-31
**Current Stage:** n8n exam quality sprint complete (Steps 1-5). Remaining: per-question retrieval (Step 6) and verifier agent (Step 7) are future work. Next priority: test the upgraded workflow end-to-end.

---

## Active Goal
- [ ] **n8n Exam Quality Upgrade Sprint** (see detailed plan below)
- [ ] Fix Gemini Vision API call in n8n (Code node -> HTTP Request node swap)

## n8n Exam Quality Upgrade Plan (execute in order)
> **Context:** The workflow already has the correct pipeline structure (Parse Request → Question Generator → Parse Questions → Validate → Render Diagrams → mode split → responses). The upgrade targets are about *quality*, not plumbing.
>
> **Professor's exam standard (benchmark):** 6 sections, 4/6 have diagrams, 4-6 sub-parts per section with progressive difficulty, TCP seq/ack tables, formal header/instructions, clean A4 formatting.

### Step 1: Force minimum diagram density in blueprint ✅ DONE
- **File:** n8n node `Parse Request` (Code node in workflow `FterurcXSRyrQ4Xq`)
- **What:** After shuffling archetypes, sort so diagram-requiring archetypes fill first. Add `minDiagramCount` field = `Math.max(2, Math.ceil(numOpenEnded * 0.6))`. If shuffled blueprint doesn't meet minimum, swap non-diagram items for diagram items.
- **Why:** Professor's exams have diagrams in 4/6 sections. Current shuffle sometimes produces only 1 diagram.

### Step 2: Enforce minimum 4 sub-parts per long-form question ✅ DONE
- **File:** n8n node `Question Generator` system prompt
- **What:** Add explicit instruction: "Each long-form question MUST have at least 4 sub-parts with progressive difficulty: (a) identification/recall, (b) calculation, (c) reasoning/analysis, (d) extension/what-if."
- **Also:** Add to `Validate Structured Exam` node: reject any long-form question with fewer than 4 sub-parts.
- **Why:** Professor's questions have 4-6 sub-parts. LLM often produces 2-3 thin ones.

### Step 3: Make difficulty structurally change the blueprint ✅ DONE
- **File:** n8n node `Parse Request` (Code node)
- **What:** `difficultyStructure` object drives `minSubParts`, `maxSubParts`, `minDiagramRatio`, `preferredSources` per difficulty level. Easy defaults to 2 open-ended, medium to 4, hard to 5. The `difficultyStructure` is passed downstream so both the LLM prompt and validator can enforce it.
- **Also:** Question Generator prompt template now receives `difficultyStructure` fields explicitly.

### Step 4: Add formal exam header + instructions to HTML template ✅ DONE
- **File:** n8n node `Build Student Exam HTML` (Code node)
- **What:** Already had HKUST header, instructions, section breaks. Enhanced with estimated time calculation and better instruction wording.

### Step 5: Add table-format support for TCP seq/ack questions ✅ DONE
- **File:** n8n nodes `Parse Request` + `Question Generator` (system prompt) + `Build Student Exam HTML` (Code node)
- **What:** TCP Header archetype now has `questionFormat: 'table'`. All other archetypes default to `'text'`. Question Generator system prompt includes TABLE-FORMAT rules (columns, rows, blank cells). Build Student Exam HTML has `renderTable()` function and `.q-table` CSS for fill-in-the-blank tables with yellow-highlighted blank cells.

### Step 6 (future): Per-question retrieval instead of bulk search
- **What:** Split Supabase vector retrieval into per-blueprint-item lookups keyed by archetype category + focus topic, instead of one massive concatenated query.
- **Why:** Current bulk query dilutes relevance. Professor's questions are tightly scoped per section.
- **Effort:** ~2 hours, requires architectural change to add a loop before Question Generator.

### Step 7 (future): Verifier agent pass
- **What:** Add a second LLM call after Parse Questions that reviews the generated exam against a quality rubric (arithmetic correctness, distractor plausibility, sub-part progression, diagram validity).
- **Why:** Current Validate node only checks structure, not quality.
- **Effort:** ~1 hour.

### Completed in this sprint (2026-03-31)
- [x] Unique PDF filenames: `Convert to TXT Binary1` now uses `ELEC3120_{difficulty}_{shortId}_{timestamp}.pdf`
- [x] Step 1: Diagram density — archetypes sorted diagram-first, minimum enforced via `minDiagramRatio`
- [x] Step 2: Sub-part depth — system prompt enforces 4+ sub-parts with progressive difficulty, validator rejects questions with fewer than `minSubParts`
- [x] Step 3: Structural difficulty — `difficultyStructure` object drives sub-part counts, diagram ratios, open-ended defaults per difficulty level
- [x] Step 4: Professional HTML — estimated time, cleaner instructions
- [x] Step 5: Table-format — TCP seq/ack archetype generates `tableData`, HTML renderer produces fill-in tables

## Recently Completed
- n8n Exam Quality Sprint (2026-03-31): Steps 1-5 all applied to workflow `FterurcXSRyrQ4Xq`. Validation passed (no errors in modified nodes). Old legacy pipeline (`Parse Exam Request` → `Exam Generator Agent` → etc.) is now disconnected/unreachable — the `Exam Request Webhook` routes directly to the new `Parse Request` pipeline.
- Chat Mode: Mermaid diagram toolbar (copy, fullscreen, download SVG, source toggle, error fallback)
- Chat Mode: Adaptive 7-type response format in AI Agent system prompt
- Chat Mode: Citation system with 4 matching strategies + deduplication
- Chat Mode: File attachment upload with SHA-256 duplicate detection
- Simulators: All 18 wrapped in SimulationShell (mission briefing) + SimulationCanvas
- Simulators: Button hierarchy standardized (cyan primary, outline secondary, ghost destructive)
- Harness: `CLAUDE.md`, PostToolUse tsc hook, MCP servers (Supabase + n8n)
- n8n: Route File Type Switch node added (images -> Gemini Vision, PDFs -> Mistral OCR)
- n8n: AI Agent system prompt updated with image analysis + adaptive format instructions
- n8n: Removed 5 disconnected unused LLM nodes, connected Chat Memory
- Mock Exam: Architecture direction chosen -> Approach B (Quick Practice + Exam Simulation split)
- Mock Exam: Question sourcing strategy chosen -> Remix engine based on past paper / homework lineage
- Mock Exam: Navigation model chosen -> Hybrid UX (Quick Practice linear, Exam Simulation free navigation)
- Mock Exam: `examSupabase` inspected through the existing anon client; confirmed accessible `question_bank` and `mock_exams` tables
- Mock Exam: `question_bank` already stores source lineage metadata (`file`, `section`, `exam_type`, `exam_period`) suitable for modular future ingestion
- Mock Exam: Step 1 runtime SQL added for `mock_exam_sessions`, `mock_exam_questions`, `mock_exam_answers`, and `user_mock_exam_weaknesses`
- Mock Exam: Beginner guide added at `docs/mock-exam-phase1.md`
- Mock Exam: Added typed request/response contract in `src/types/mockExam.ts`
- Mock Exam: Added workflow normalization service in `src/services/mockExamApi.ts`
- Mock Exam: `src/components/MockExamMode.tsx` now supports both legacy PDF responses and future structured exam JSON
- Mock Exam: Generated exam sessions now auto-save into `externalSupabase` runtime tables when the user is authenticated
- Mock Exam: `supabase/functions/generate-exam/index.ts` no longer assumes PDF-only responses; it now normalizes structured exam JSON plus optional PDF artifacts
- Mock Exam: n8n workflow upgrade spec added at `docs/mock-exam-n8n-upgrade.md`
- Mock Exam: Beginner copy-paste n8n implementation guide added at `docs/mock-exam-n8n-step-by-step.md`
- Mock Exam: Frontend and edge-function PDF parsers now support nested `pdf` objects in upgraded n8n responses
- Mock Exam: n8n docs corrected to use `question_bank.source_metadata.*` lineage fields instead of assuming top-level lineage columns
- Local n8n: frontend `.env` switched back to `http://localhost:5678` and `docker-compose.yml` now explicitly sets `N8N_EDITOR_BASE_URL` and `WEBHOOK_URL` to localhost
- Local n8n: active personal compose at `C:\Users\adamb\compose.yaml` patched from `n8n.learningpacer.org` to localhost and `adamb-n8n-1` recreated with local webhook/editor URLs
- Supabase: Ownership map added at `docs/supabase-ownership.md`
- Supabase: Frontend clients now use environment-driven config instead of hardcoded project URLs/keys
- Supabase: `.env` external project URL typo fixed locally and `VITE_SUPABASE_PUBLISHABLE_KEY` alias added
- Supabase: Removed remaining hardcoded app project URL from account deletion flow
- Build: Production build passes after latest mock exam persistence changes

## In Progress
- Mock Exam: Full redesign -> structured JSON questions, in-app taking, AI grading, weakness tracking
- Gemini Vision: Routing works but API call fails (httpRequestWithAuthentication not available in Code nodes)

## Planned (Not Started)
- Mock Exam Phase 2: In-app exam taking + PDF download (no answer key)
- Mock Exam Phase 3: AI grading (in-app + handwritten upload via Gemini Vision)
- Mock Exam Phase 4: Weakness profile tracking (question-type + sub-topic granularity)
- Chat Mode: Streaming responses, retry logic, quick-action follow-ups
- Chat Mode: YouTube transcript analysis

## Core Architecture Rules
1. Dark theme default, adaptive light mode (`dark:` prefixes).
2. UI styling: Tailwind CSS + shadcn/ui. Simulator-specific: slate palette. General: zinc palette.
3. Component structure: Boxed, clean, progressive disclosure for first-time learners.
4. Dual Supabase is intentional:
   `externalSupabase` / `LearningPacer Backend` / `dpedzjzrlzvzqrzajrda` = auth, chat history, progress, feedback, user state, mock exam runtime.
   `examSupabase` / `Adam9286 Project` / `oqgotlmztpvchkipslnc` = slides, slide explanations, question bank, past papers, homework corpus, RAG content, mock exam lineage.
5. n8n orchestration: All AI calls go through n8n webhooks, not direct API calls from frontend.
6. TypeScript strict mode OFF (intentional). Path alias `@/*` -> `./src/*`.

## Handoff Notes (Read Before Coding)
- **Simulations tab**: UI locked in. Do not alter simulator layouts unless explicitly instructed.
- **Chat Mode**: Feature-complete for FYP. Remaining work is polish (streaming, retry).
- **Mock Exam decisions locked in**: Use Approach B. `Quick Practice` should be fast, JSON-first, and linear. `Exam Simulation` should be richer, timed, free-navigation, and still support PDF export.
- **Question generation strategy**: Use remix-based generation from past papers / homework already stored in `question_bank`, with lineage metadata so future uploads stay modular and scalable.
- **Current mock exam reality**: The app side is ahead of the generator. `src/components/MockExamMode.tsx` can already detect legacy PDF responses vs structured exam JSON, and generated sessions now save into `externalSupabase` when authenticated.
- **Edge function status**: `supabase/functions/generate-exam/index.ts` has been upgraded to normalize structured exam JSON plus optional PDF artifacts, but the frontend is still calling n8n directly today.
- **Current n8n blocker**: The workflow still ends at `Post Links1 -> Return Link1`, so production behavior is still effectively PDF-first until the workflow is upgraded.
- **n8n exam pipeline status (2026-03-31)**:
  The new pipeline (`Parse Request` → `Question Generator` → `Parse Questions` → `Validate Structured Exam` → `Render Diagrams` → `Is Exam Simulation?` → mode-specific response nodes) is fully wired and functional.
  `Parse Request` has 6 archetypes (HTTP, Video Streaming, TCP Header, Network Perf, Transport/Sliding Window, Routing/Topology) with blueprint system, difficulty anchors, remix seeds, and variation context.
  `Question Generator` system prompt enforces remix-with-lineage, professor-style multi-part, diagram rules, and structured JSON output.
  `Validate Structured Exam` checks MCQ/longForm field presence, option counts, correct_answer validity, marks, and sub-part presence.
  `Build Student Exam HTML` generates a styled A4 exam PDF with NO answer key.
  `Build Quick Practice Response` returns JSON only (no PDF).
  `Build Exam Simulation Response` returns JSON + PDF links.
  `Convert to TXT Binary1` now uses unique filenames: `ELEC3120_{difficulty}_{shortId}_{timestamp}.pdf`.
  **Quality gaps fixed in sprint (2026-03-31):** diagram density enforcement, sub-part depth (4+ with progressive difficulty), structural difficulty (easy/medium/hard drive blueprint shape), professional HTML (estimated time, instructions), TCP table-format support.
  **Remaining future work:** Per-question retrieval (Step 6), Verifier agent pass (Step 7). See "n8n Exam Quality Upgrade Plan" section above.
- **n8n upgrade spec**: See `docs/mock-exam-n8n-upgrade.md` before editing the workflow. It lists the target response contract, required mode split, node-level changes, and rollout order.
- **n8n implementation guide**: Use `docs/mock-exam-n8n-step-by-step.md` for the exact beginner sequence, full code-node replacements, exact prompts, and connection changes.
- **Step 1 files**: SQL is in `docs/sql/external-supabase/20260330_mock_exam_runtime.sql`. Beginner instructions are in `docs/mock-exam-phase1.md`.
- **Supabase ownership map**: See `docs/supabase-ownership.md` for the two-project split, active tables, likely legacy tables, and cleanup policy.
- **Supabase config status**: Frontend Supabase clients now read from env via `src/lib/supabaseConfig.ts`. The local `.env` typo for the external project URL has been corrected.
- **Mock exam runtime DB status**: Re-check on 2026-03-31 found that `mock_exam_sessions` and `mock_exam_questions` are not currently exposed/readable in the live `externalSupabase` app database. App-side persistence code is ready, but the SQL still needs to exist in the real project before those saves will succeed.
- **Current examSupabase table state after user cleanup**: `lecture_slides_course`, `mock_exams`, `n8n_chat_histories`, `question_bank`, `slide_explanations`, plus legacy/verify tables `elec3120_textbook` and `exam_questions_small`.
- **Confirmed exam DB shape**: `question_bank` currently has 66 rows with columns `id`, `question_number`, `lecture_id`, `question_type`, `topic`, `content`, `options`, `correct_answer`, `diagram_description`, `diagram_logic`, `sub_questions`, `source_metadata`, `embedding`. The lineage fields live inside `source_metadata` (`file`, `section`, `exam_type`, `exam_period`), not as top-level columns. `mock_exams` currently stores PDF/Drive metadata only with columns `id`, `topic`, `difficulty`, `num_mcqs`, `num_openended`, `total_questions`, `file_id`, `drive_link`, `download_link`, `created_at`, `generated_by`.
- **Current audit summary**:
  `LearningPacer Backend` active in repo: `chat_conversations`, `chat_messages`, `feedback`, `lesson_mastery`, `user_progress`, `user_roles`, `quiz_attempts`.
  `LearningPacer Backend` likely legacy: `announcements`, `discussions`, `discussion_replies`.
  `Adam9286 Project` active in repo/workflow: `lecture_slides_course`, `slide_explanations`, `question_bank`, `mock_exams`.
  `Adam9286 Project` verify before touching: `n8n_chat_histories`.
  `Adam9286 Project` likely legacy: `elec3120_textbook`, `exam_questions_small`.
- **Config caveat**: `supabase/config.toml` is still not linked to the live `externalSupabase` project, so future schema changes should still be applied carefully in the correct project.
- **n8n workflow**: ID `FterurcXSRyrQ4Xq`, name "FYP V8", 116 nodes. MCP connected at localhost:5678.
- **Local n8n note**: The repo now points local frontend traffic to `http://localhost:5678`. If OAuth screens still show `n8n.learningpacer.org`, the running n8n process/container was started with old env values and must be restarted/recreated with localhost settings.
- **Local n8n status**: The active local container env now reports `N8N_HOST=localhost`, `N8N_PROTOCOL=http`, `N8N_EDITOR_BASE_URL=http://localhost:5678`, and `WEBHOOK_URL=http://localhost:5678/`. Any remaining Google Drive upload failure is now at the OAuth credential layer, not the container/domain layer.
- **Past papers**: Stored in Supabase (`examSupabase`). Midterm + HW1-4 available as RAG context for question generation.
- **AI_SYNC protocol**: Both Claude and Codex must read this file before making changes, then update it after.
