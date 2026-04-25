# AI Project Sync & Memory
**Project:** LearningPacer (ELEC3120)
**Last Updated:** 2026-04-25
**Current Stage:** Chat Phase 3 Mermaid reliability is now frozen behind a bounded smoke gate. Phase 2 deterministic retrieval and Phase 3 Mermaid hardening are both in a stable, bounded state, and the chat fallback path is restored to true textbook retrieval through `elec3120_textbook`. Next major chat work should be exception-driven only. Exam branch notes below still apply.

---

## Active Goal
- [x] **Chat Phase 2 hardening** (bounded gate passed; freeze unless real production misses appear)
- [x] **Chat Phase 3 Mermaid reliability** (bounded Mermaid gate passed; freeze unless real production misses appear)
- [x] **Simulator UI declutter/refactor** (global shell/sidebar, shared toolbar, anti-nesting pass, docs sync)
- [ ] **n8n Exam Quality Upgrade Sprint** (see detailed plan below)
- [x] **Mock Exam diagram/PDF reliability hardening** (inline assets, HTTP Request renderer, structured exam always returned) ✅ DONE
- [ ] Fix Gemini Vision API call in n8n (Code node -> HTTP Request node swap)

## Chat Phase 2 Deterministic Retrieval (2026-04-25)
- Live workflow: `MznVBhIC4sbFquyy` at `https://n8n.learningpacer.org/workflow/MznVBhIC4sbFquyy`.
- Chat flow is deterministic now: `Parse Incoming -> Classify Intent -> lecture retrieval -> optional secondary fallback -> grounded Auto Agent`.
- Lecture sufficiency keeps `0.75` as the preferred bar, then allows a soft floor (`0.70`) when there are enough usable lecture chunks. This is the intended anti-tuning-loop guardrail.
- Confirmed on 2026-04-25: `elec3120_textbook` is retrievable through the n8n Supabase Vector Store node using `queryName = match_textbook`.
- Chat fallback is now restored to the actual textbook vector table:
  - table: `elec3120_textbook`
  - node: `Supabase (Retrieve Textbook)`
  - query function: `match_textbook`
  - topK: `3`
- The temporary `Chat Secondary Retrieval Service` webhook exists but is no longer on the active chat path.
- `used_textbook_rag` is now literal again: it means textbook fallback was used.
- Regression gate: run `python scripts/evaluate_chat_retrieval.py`. This is the fixed go/no-go check for Chat Phase 2; do not resume ad hoc threshold tuning once it passes.
- Gate update on 2026-04-25: textbook fallback is now explicitly covered by the fixed probe `Explain HTTP cookies.` and should return `used_textbook_rag = true`.
- Current expert recommendation: once the gate passes, move on. Only extend classifier keywords or retrieval rules in response to real missed user queries, not speculative edge cases.

## Chat Phase 3 Mermaid Reliability (2026-04-25)
- Live workflow: `MznVBhIC4sbFquyy` still powers chat mode; Phase 3 was layered onto the Phase 2 deterministic path rather than introducing another agent.
- Deployment script: `scripts/apply_phase3_workflow_patch.py`. It applies Phase 2 first, then adds the Mermaid-specific hardening.
- Auto Agent system prompt now includes a dedicated Mermaid reliability section plus concrete few-shot examples for:
  - TCP state machine (`stateDiagram-v2`)
  - HTTP request / response (`sequenceDiagram`)
  - Sliding-window intuition (`flowchart LR`)
- New n8n node: `Validate Mermaid Diagram`, inserted between `Polish Answer Structure` and `Normalize Agent Output`.
- Validator behavior:
  - strips accidental ```mermaid fences
  - accepts only structurally plausible Mermaid for supported families
  - nulls `answer.diagram` when the Mermaid shape is malformed instead of passing broken code to the frontend
  - stamps `trace.error_stage = "diagram_validation"` only when diagram removal was necessary and no earlier error stage already exists
- Frontend chat rendering now uses `src/components/chat/SafeMermaidDiagram.tsx`, a reusable error boundary + suspense wrapper around `MermaidDiagram`.
- Chat-mode impact:
  - structured answers with bad `diagram.code` degrade to no diagram instead of a broken render
  - markdown fenced ```mermaid blocks degrade to source code if the renderer throws at runtime or lazy import fails
- Existing toolbar work was already present before this pass: copy source, source toggle, fullscreen, and SVG download. Phase 3 focused on reliability, not more controls.
- Operating rule: do not add a second repair agent for Mermaid by default. A second agent adds another probabilistic branch, more latency, and harder-to-debug failures. Prefer bounded validation plus null fallback unless real production evidence justifies a narrowly scoped repair loop.
- Regression gate: run `python scripts/evaluate_chat_mermaid.py`. This is the fixed go/no-go check for Chat Phase 3.
- Gate status on 2026-04-25: PASS.
  - Diagram-request prompts returned valid Mermaid with `trace.error_stage = null`
  - A concise non-diagram prompt did not force a diagram
  - Local validator fixtures passed for valid and invalid Mermaid shapes
- Current expert recommendation: freeze chat work here. Only revisit Mermaid prompting or validation if real production traces show repeat failures or obvious diagram quality misses.

## Simulator UI Refactor (2026-04-08)
- **Scope:** UI-only refactor. No simulator state machines, calculations, Supabase/database calls, n8n workflow triggers, or LLM integrations were changed.
- **Global shell/sidebar:** `src/components/SimulationsMode.tsx` now uses flatter simulator navigation with subtle inactive text (`text-gray-400`), active text (`text-white`), and a simple active left-border highlight. The old "Recommended First Steps" sidebar block was removed to recover vertical space.
- **Shared toolbar:** Added `src/components/simulations/SimulatorToolbar.tsx` and `src/components/simulations/SimulatorToolbar.styles.ts`. Simulator-level scenario/action/status controls now render through the shared toolbar shell while each simulator keeps its own local state and handlers.
- **Toolbar design rule:** Keep simulator top controls flat. Preferred shell is `bg-gray-800/40` with a subtle `border-b border-white/10`; avoid heavy shadows, raised cards, and nested control cards.
- **Anti-nesting pass:** `src/components/simulations/SimulationCanvas.tsx` was flattened from a bordered/shadowed card into a quieter rounded canvas with `bg-gray-950/25`, flow-based status labeling, and spacing-first layout.
- **Targeted simulator canvas cleanup:** `EncapsulationSimulator.tsx`, `SlidingWindowSimulator.tsx`, `ArpSimulator.tsx`, and `SubnettingCalculator.tsx` had most border-heavy card treatments removed. The new pattern favors whitespace (`gap`, `px`, `py`), typographic labels (`text-xs/text-sm`, `font-semibold`, `tracking-*`, muted gray), and subtle `ring-*` accents.
- **Event log rule:** Simulator event logs should use a unified terminal treatment where possible: `bg-gray-950`, monospace text, subdued gray labels, and minimal chrome. ARP and Sliding Window have been converted to this pattern.
- **Verification:** `npm run build` passed after the refactor. Targeted lint on the Step 3 files still reports only the pre-existing non-UI `prefer-const` issue in `src/components/simulations/SubnettingCalculator.tsx:109`; it was intentionally left untouched.
- **Hub/focused-view redesign update:** `SimulationsMode.tsx` is now a two-view switcher. `activeSimulatorId === null` renders the new `SimulationHub`; selecting a simulator renders the focused `SimulationShell`.
- **New components:** `SimulationHub.tsx` provides the discovery landing page with hero banner, difficulty filter, module cards, and expanded simulator lists. `ConceptGuide.tsx` provides the vertical desktop stepper and mobile step indicator data source.
- **SimulationHub expansion behavior:** Module cards default expanded and use independent expansion state, so multiple modules can stay expanded/collapsed at the same time instead of behaving like a single-open accordion.
- **Step config:** `simulatorStepConfig.ts` defines `ConceptStep`, `SimulatorStepProps`, and `conceptStepsById` for all 17 simulators.
- **Focused shell:** `SimulationShell.tsx` now owns the exit header, left Concept Guide sidebar, workspace label, scrollable simulator workspace, and mobile step indicator.
- **Step sync status:** `TcpHandshakeSimulator`, `EncapsulationSimulator`, `DnsResolutionSimulator`, `DijkstraSimulator`, `GbnSrSimulator`, and `SlidingWindowSimulator` sync their internal step/phase outward via `onStepChange`. The remaining 11 simulators accept `SimulatorStepProps` as stubs so the parent wiring is consistent.
- **Verification update:** After the hub/focused-view redesign, `npx tsc --noEmit`, targeted simulation ESLint, and `npm run build` pass. Full `npm run lint` still fails on unrelated repo-wide legacy lint issues outside the simulation redesign scope.

## Mock Exam Model Routing (2026-04-01)
- Mock-exam generation and repair in workflow `FterurcXSRyrQ4Xq` now use `Claude 4.6 Sonnet` again for the active exam branch.
- Reason: live failed execution `299` on 2026-03-31 terminated at `Basic LLM Chain` while using `DeepSeek Chat Model`, so DeepSeek was not just a cheaper equivalent for this workflow path.
- To let MCP save workflow edits cleanly, disconnected legacy nodes were removed from the workflow: `DeepSeek Chat Model`, `Chat Memory`, `Google Gemini Chat Model`, and `Google Gemini Chat Model1`.
- Recommendation going forward: keep Claude on the exam-generation critical path until the flow is stable end-to-end; treat DeepSeek only as a later cost-optimization pass after prompt/context reduction.

## Mock Exam Mermaid Handoff Fix (2026-04-01)
- `Render Diagrams` in workflow `FterurcXSRyrQ4Xq` now writes the cleaned Mermaid from `Prepare Diagram Jobs.diagramSource` back into `exam.longForm[].diagram`.
- This was the missing handoff fix for local draft printing: the frontend renders Mermaid from `question.diagram`, not from `diagramSvg`.
- Result: even if `mermaid.ink` is flaky, the structured exam JSON now carries sanitized Mermaid that the frontend can render locally.
- Live webhook smoke test on 2026-04-01 (`exam_simulation`, `5 MCQ + 3 OE`, session `codex-smoke-2`) returned clean Mermaid strings for the diagram questions plus `diagramSvg` / `diagramDataUri` for the remote path.

## Structured Draft Editing (2026-03-31)
- Exam simulations now support app-side draft editing instead of direct binary PDF editing.
- Users can open `Edit Draft` from the latest exam card or from a saved exam-simulation entry.
- Draft edits persist back into `mock_exam_sessions` via `updateSavedMockExamDraft(...)`, clear stale PDF links, and rebuild `mock_exam_questions`.
- Local `Print Draft` renders Mermaid diagrams client-side and opens a fresh browser print flow for the edited draft.
- Structured draft questions now also support optional `images[]` arrays with `url`, `alt`, `caption`, and `widthPercent`, editable in the draft dialog and rendered in local print output.
- Built-in warnings/autofixes cover the specific live bugs found during review:
  - remove `Refer to the diagram below.` when no diagram exists
  - redact visible `Seq=` / `Ack=` values in TCP fill-in diagrams
  - convert directed arrows to undirected links when the question text says the topology is symmetric
- Built-in draft warnings now also flag:
  - stop-and-wait contradictions where a sequence diagram sends multiple data segments before an ACK
  - queue-buildup / overflow prompts whose stated link rates make buildup impossible
  - plain-text / invalid Mermaid diagrams that will likely render as unprofessional fallback text
  - question stems that still contain inline sub-part markers instead of keeping them only in `sub_parts`

## Mock Exam Diagram/PDF Reliability Decision (2026-03-31)
- **Correction:** The exported mock-exam workflow reviewed on 2026-03-31 still uses external `mermaid.ink` URLs inside the student HTML and still sends PDFShift a blind `delay: 3000`. Do **not** assume the previously claimed base64-inline PDF fix is live until the workflow JSON is re-exported and verified.
- **Do not use HTTP inside Code nodes:** Official n8n docs say Code nodes shouldn't make HTTP requests. Any diagram fetching/rendering must use `HTTP Request` nodes or a separate renderer service.
- **Source of truth:** Structured exam JSON is the primary artifact. The PDF is a secondary artifact. If PDF generation/upload fails, the workflow should still return the structured exam with `pdf: null` and an optional warning.
- **Rendering rule:** Student HTML sent to PDFShift must contain only inline assets for diagrams (`<svg>...</svg>` or data URIs). No external image URLs inside the HTML.
- **Preferred diagram approach:** Use Mermaid for sequence/protocol/topology diagrams and plain HTML tables for TCP seq/ack fill-ins. Do not use Nano Banana or other image-generation models for grading-critical network exam diagrams.
- **Preferred workflow shape:** Question generation -> structured validation -> diagram render jobs via `HTTP Request` -> attach inline SVG/data URIs -> best-effort PDF branch. Keep the renderer backend swappable so `mermaid.ink` can be replaced later by a self-hosted renderer without redesigning the workflow.
- **Implementation guide:** Use `docs/mock-exam-n8n-robust-workflow.md` for the concrete node-by-node revision plan.
- **Runtime bug confirmed from real execution (2026-03-31):**
  - Q6 and Q7 had no diagrams because their blueprint items correctly used `requiredDiagram: "none"`.
  - Q8 should have rendered a diagram and did not.
  - `Prepare Diagram Jobs` created the Q8 job correctly.
  - `Render Diagram SVG` returned valid raw SVG, but the item no longer carried `questionIndex`.
  - `Render Diagrams` therefore failed to reattach `diagramSvg` / `diagramDataUri` to Q8.
  - Separate generator/validation bug: Q6 text said `Refer to the diagram below.` while `diagram` was `null`.
  - Required fix: patch `Render Diagrams` to recover metadata from `Prepare Diagram Jobs` by item position, and patch `Validate Structured Exam` to reject missing required diagrams and false diagram references.
  - Additional runtime issue found while applying the validator: the LLM can sometimes place long-form questions inside `mcqs`, causing errors like `Expected 5 MCQs but received 8`. Recommended safety net: add a `Normalize Exam Shape` Code node between `Parse Questions` and `Validate Structured Exam` to move malformed long-form items into `longForm` before validation.
  - Additional runtime issue found after that: `Render Diagram SVG` can receive `503 Service Temporarily Unavailable` from `mermaid.ink`. Required fix: configure the HTTP Request node as best-effort (`Never Error` + retry), and let `Render Diagrams` attach `diagramFallbackText` when SVG rendering fails.

## Long-Term Mock Exam Hardening Roadmap (2026-03-31)
- **Principle:** Treat mock-exam quality as a layered system problem, not a prompt-tuning problem. Generation, validation, diagram rendering, export policy, and corpus strategy all need explicit hardening.
- **Phase 1: Domain-consistency audit**
  - Add deterministic checks for protocol correctness and numerical sanity, not just JSON shape.
  - Critical checks now confirmed from live outputs:
    - stop-and-wait questions cannot show multiple different data sends before an ACK
    - queue-buildup / overflow questions must use link rates that make buildup possible, unless the intended conclusion is explicitly "no queue forms"
    - question wording and diagram semantics must agree on protocol behavior, directionality, and link meaning
  - App-side draft QA began on 2026-03-31 with new warnings for stop-and-wait contradictions, impossible queue-buildup setups, and plain-text/non-renderable diagrams.
- **Phase 1.5: Structural normalization before validation**
  - Add a dedicated `Normalize Long-Form Formatting` node before `Validate Structured Exam`.
  - This node should deterministically remove false diagram references and strip leaked inline sub-part markers from the `question` field.
  - The same normalization must run again after any repaired questions are merged back in, before re-validation.
  - This is specifically required because live runs keep recurring on two recoverable errors:
    - `Refer to the diagram below.` left in the stem while `diagram` is empty
    - inline `(a)` / `a)` markers leaking into the `question` field instead of staying only in `sub_parts`
  - These should not be treated as prompt-only problems. They are expected normalization cases in a scalable generation pipeline.
- **Phase 2: Final-export gating**
  - Student-facing final PDFs must not contain raw text fallback "diagrams" for questions whose blueprint requires a real diagram.
  - Text fallback remains acceptable only in draft/review/debug flows.
  - Final export should block or force manual review when required diagrams fail render or when unresolved critical warnings remain.
- **Phase 3: Renderer hardening**
  - `mermaid.ink` is acceptable for prototyping but not robust enough for production exam generation.
  - Long-term target: self-hosted Mermaid rendering service (Node + Mermaid + Puppeteer or Mermaid CLI wrapper) with fixed fonts/theme/retries.
  - No paid Mermaid subscription is required; this is a reliability/infrastructure decision.
- **Phase 4: Diagram quality by archetype**
  - Do not rely on generic Mermaid alone for all exam visuals.
  - Preferred mapping:
    - routing/topology/path questions -> polished graph templates
    - TCP seq/ack fill-ins -> tables or standardized ladder templates with blanks
    - throughput/bottleneck questions -> standardized path diagrams
  - Goal: final PDFs should look like actual university exam papers, not diagnostic output.
- **Phase 5: Repair loop**
  - Add a post-generation `Open-Ended Consistency Audit` node in n8n.
  - If only some long-form questions fail, regenerate or repair only those items instead of restarting the whole exam.
  - This is the preferred scalable design over endlessly tightening one monolithic prompt.
- **Phase 6: Content scalability / anti-repetition**
  - More past papers will help, but retrieval scale alone is not enough.
  - Long-term content strategy should combine:
    - more source material (past papers, homework, tutorials, quizzes, sample tests)
    - structured professor-authored originals
    - parameterized original question templates
    - similarity controls to prevent near-duplicate generations
  - Goal: preserve past-paper style for student practice while also supporting original exam authoring for faculty use.
- **Phase 7: Professor authoring workflow**
  - Keep the structured draft, not the binary PDF, as the source of truth.
  - Planned capabilities:
    - regenerate this question
    - regenerate diagram only
    - upload/replace question images
    - approve/reject final export
  - This keeps the system reviewable, editable, and scalable for real academic use.

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
- [x] Mermaid robustness: `Render Diagrams` v2 with 3-tier fallback (clean → minimal structure → text description), line-by-line graph LR fixing, no more "[Diagram unavailable]"
- [x] Frontend: Removed outdated "workflow gaps" warning and "current workflow reality" alert from MockExamMode.tsx, replaced with accurate feature cards (professor-style questions, difficulty-driven structure, diagrams & tables, exam PDF)
- [x] LLM models: Chatbot uses GPT-4o, Mock Exam uses Claude 3.5 Sonnet (both via OpenRouter)
- [x] PDF hardening fully reworked: diagram fetching moved to `HTTP Request` node (`Render Diagram SVG`), inline SVG/data URIs embedded in HTML, PDFShift uses `wait_for: "isPdfShiftReady"` instead of blind delay
- [x] Best-effort PDF: `Convert HTML to PDF` has `onError: continueRegularOutput`, `Has PDF Binary?` IF node routes failures to response node directly, structured exam JSON always returned even when PDF fails
- [x] Difficulty no longer overrides user-selected question counts — only affects structure (sub-parts, diagrams, depth)
- [x] Robust diagram pipeline: `Prepare Diagram Jobs` → `Has Diagram Jobs?` → `Render Diagram SVG` (HTTP Request) → `Render Diagrams` (reassembly with inline SVG + base64 data URIs)
- [x] Best-effort PDF pipeline: `Convert HTML to PDF` (continueRegularOutput) → `Has PDF Binary?` → true: upload path / false: direct to response
- [x] `Build Exam Simulation Response` is resilient: try/catch for Drive upload + PDF nodes, returns `pdf: null` with warnings on failure
- [x] `Build Student Exam HTML` uses `escapeHtml()`, `renderTable()`, inline SVG rendering, `isPdfShiftReady` JS function, no external image URLs

## Recently Completed
- Simulators: UI declutter/refactor completed (2026-04-08). Sidebar is flatter, the "Recommended First Steps" block is removed, simulator controls share `SimulatorToolbar`, and the primary simulation canvases now favor whitespace, typography labels, subtle rings, and terminal-style logs over nested bordered cards.
- Simulators: `SimulatorToolbar.tsx` and `SimulatorToolbar.styles.ts` are the shared source for top simulator control strips. Keep simulator state/handlers local, but render scenario dropdowns, play/step/reset controls, status pills, and related top controls through the shared toolbar pattern.
- Simulators: Hub/focused-view redesign completed (2026-04-08). The simulations tab now opens to `SimulationHub`; focused simulator sessions render in `SimulationShell` with `ConceptGuide` and optional parent step sync via `SimulatorStepProps`.
- n8n Mock Exam: Workflow `FterurcXSRyrQ4Xq` active exam branch now uses `Claude 4.6 Sonnet` for both `Basic LLM Chain` and `Repair Bad Open-Ended Questions`; disconnected legacy model/memory nodes were removed so MCP edits can save again
- Mock Exam: App-side draft QA now flags stop-and-wait sequence contradictions, impossible queue-buildup / overflow setups, and plain-text / invalid Mermaid diagrams that would likely print as unprofessional fallback text
- Mock Exam: Added a unified per-user "Saved Mock Exams" library in `MockExamMode.tsx` that lists both `quick_practice` and `exam_simulation` sessions, with clear UI separation between reopening an existing exam and generating a new one
- Mock Exam: Existing session storage is now surfaced as a product feature rather than a hidden backend detail; saved quick-practice sessions can be reopened/reviewed, and saved exam simulations can be reopened from their stored PDF links
- Mock Exam: `MockExamMode.tsx` studio UX simplified for beginners; `Saved Mock Exams` and `Generate New Mock Exam` now default closed, the old "latest exam ready" card is removed, `Open Exam` is the primary saved-exam CTA, and the newest/current history item gets a glow highlight instead
- Mock Exam: Quick Practice open-ended selector is now disabled/greyed out when `quick_practice` mode is selected; request payload sends `0` open-ended questions in that mode while preserving the exam-simulation selection
- Mock Exam: Quick Practice now uses free navigation + confirm-to-submit instead of forced linear next-only answering, so students can change a tentative choice before confirming and jump between questions safely
- Mock Exam: Completed Quick Practice attempts now persist final answers/result summaries back into `mock_exam_answers` + `mock_exam_sessions`, and the UI can load saved attempts for later review from in-app history
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
- Mock Exam: Navigation model updated -> Quick Practice now uses free navigation with confirm-to-submit; Exam Simulation remains PDF-first until the in-app simulation runner exists
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
- **Simulations tab**: Current UI direction is anti-containeritis and two-view learning. Preserve `SimulationHub` as the discovery view, `SimulationShell` as the focused simulator workspace, `ConceptGuide` as the scaffolded learning sidebar, the shared `SimulatorToolbar`, spacing-first simulator canvas layout, typography-based section labels, subtle `ring-*` accents, and terminal-style event logs unless explicitly instructed otherwise.
- **Chat Mode**: Feature-complete for FYP. Remaining work is polish (streaming, retry).
- **Mock Exam decisions locked in**: Use Approach B. `Quick Practice` should be fast, JSON-first, in-app, and free-navigation with confirm-to-submit. `Exam Simulation` should be richer, timed, free-navigation, and still support PDF export.
- **Question generation strategy**: Use remix-based generation from past papers / homework already stored in `question_bank`, with lineage metadata so future uploads stay modular and scalable.
- **Current mock exam reality**: The app side is ahead of the generator. `src/components/MockExamMode.tsx` can already detect legacy PDF responses vs structured exam JSON, and generated sessions now save into `externalSupabase` when authenticated.
- **Quick Practice UX status (2026-03-31)**: The in-app quick-practice runner now supports free question navigation, per-question confirm-to-submit, history-backed review of completed attempts, and disables open-ended selection in `quick_practice` mode.
- **Saved exam library status (2026-03-31)**: `MockExamMode.tsx` now has a unified "Saved Mock Exams" section that surfaces all generated sessions for the signed-in user across both modes. The library uses `mock_exam_sessions` as the v1 saved-exam source of truth and makes "choose existing exam" vs "generate new exam" visually explicit.
- **Saved exam library UX status (2026-03-31)**: The mock-exam studio now uses independent section toggles for `Saved Mock Exams` and `Generate New Mock Exam`, so users can open both, hide both, or keep only one visible. Quick-practice cards always show a `View Result` action; if the session has no completed saved answers yet, the UI says that explicitly instead of hiding the button. Result review is now exam-style: one full question page at a time with the complete stem, all options, correctness markers, explanation, and previous/next navigation.
- **Saved exam library actions status (2026-03-31)**: Saved-exam cards now use a compact overflow `...` menu for secondary actions. The primary CTA stays visible (`Start`, `Continue`, `Practice Again`, `Open PDF`, `Use Shared Exam`), while secondary actions like `View Result`, `Share to Pool`, `Download PDF`, and `Delete Exam` live in the menu. Individual saved sessions can now be deleted from personal history.
- **Current library behavior**: `quick_practice` sessions with status `ready` reopen as in-app practice, while `submitted` / `graded` quick-practice sessions reopen as review. `exam_simulation` sessions reopen through stored PDF links when available, with a fallback detail load path from saved session payload/question snapshots.
- **Shared pool status (2026-03-31)**: Mock exams now support a separate shared catalog on the frontend. `MockExamMode.tsx` splits the saved library into `My History` and `Shared Pool`, mode-first (`Quick Practice` / `Exam Simulation`). Personal sessions can be published with `Share to Pool`, and shared exams are consumed through `Use Shared Exam`, which creates a fresh private copy in the current user's history before loading it.
- **Shared pool DB requirement**: Apply `docs/sql/external-supabase/20260331_mock_exam_shared_pool.sql` to the live `externalSupabase` project before expecting share/list/use to work. Until that migration exists, publish/use actions fail gracefully and the shared list stays empty.
- **Edge function status**: `supabase/functions/generate-exam/index.ts` has been upgraded to normalize structured exam JSON plus optional PDF artifacts, but the frontend is still calling n8n directly today.
- **Current n8n blocker**: The workflow still ends at `Post Links1 -> Return Link1`, so production behavior is still effectively PDF-first until the workflow is upgraded.
- **Mock exam PDF reliability rule**: Do not rely on blind `delay` values alone. PDFShift guidance is to avoid network requests, inline assets, and use `wait_for` only as a readiness guard when needed.
- **Mock exam diagram-fetch rule**: Do not use `fetch()` in Code nodes. Per official n8n docs, use `HTTP Request` or a separate renderer service for all external diagram fetching.
- **Mock exam response rule**: Structured exam JSON must still be returned when PDF generation or Drive upload fails. `pdf` can be `null`; the exam payload cannot disappear.
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
  **Reliability status after live execution test (2026-03-31):** The workflow shape is correct and PDF is best-effort, but one diagram reattachment bug is still open. `Render Diagram SVG` can return raw SVG without preserving `questionIndex`, so `Render Diagrams` must recover the mapping from `Prepare Diagram Jobs`. Also, `Validate Structured Exam` must reject any question that says `Refer to the diagram below.` while `diagram` is null.
  **Full pipeline shape:**
  ```
  Exam Request Webhook → Parse Request → Question Generator → Parse Questions → Validate Structured Exam
  → Prepare Diagram Jobs → Has Diagram Jobs?
    → true: Render Diagram SVG (HTTP Request, 20s timeout) → Render Diagrams (reassembly)
    → false: Render Diagrams (passthrough)
  → Is Exam Simulation?
    → true: Build Student Exam HTML → Convert HTML to PDF [continueRegularOutput] → Has PDF Binary?
      → true: Convert to TXT Binary1 → Upload to Google Drive1 → Share file1 → Build Exam Simulation Response → Return Link1
      → false: Build Exam Simulation Response → Return Link1
    → false: Build Quick Practice Response → Return Link1
  ```
  **New nodes added in robust workflow pass:** `Prepare Diagram Jobs` (Code), `Has Diagram Jobs?` (IF), `Render Diagram SVG` (HTTP Request), `Has PDF Binary?` (IF).
  **Remaining future work:** Per-question retrieval (Step 6), Verifier agent pass (Step 7). See "n8n Exam Quality Upgrade Plan" section above.
  **Testing needed:** Run end-to-end tests in this order: (1) quick_practice 5 MCQ, (2) exam_simulation 5 MCQ + 3 OE medium, (3) exam_simulation 10 MCQ + 5 OE hard.
- **n8n upgrade spec**: See `docs/mock-exam-n8n-upgrade.md` before editing the workflow. It lists the target response contract, required mode split, node-level changes, and rollout order.
- **n8n implementation guide**: Use `docs/mock-exam-n8n-step-by-step.md` for the exact beginner sequence, full code-node replacements, exact prompts, and connection changes.
- **n8n reliability guide**: Use `docs/mock-exam-n8n-robust-workflow.md` for the current diagram/PDF hardening pass. This is the source of truth for fixing PDFShift timeouts and removing unsupported Code-node HTTP ideas.
- **Step 1 files**: SQL is in `docs/sql/external-supabase/20260330_mock_exam_runtime.sql`. Beginner instructions are in `docs/mock-exam-phase1.md`.
- **Supabase ownership map**: See `docs/supabase-ownership.md` for the two-project split, active tables, likely legacy tables, and cleanup policy.
- **Supabase config status**: Frontend Supabase clients now read from env via `src/lib/supabaseConfig.ts`. The local `.env` typo for the external project URL has been corrected.
- **Mock exam runtime DB status**: Re-check on 2026-03-31 found that `mock_exam_sessions` and `mock_exam_questions` are not currently exposed/readable in the live `externalSupabase` app database. App-side persistence code is ready, but the SQL still needs to exist in the real project before those saves will succeed.
- **Quick Practice history caveat**: The new review/history UI depends on `mock_exam_sessions`, `mock_exam_questions`, and `mock_exam_answers` being available in the live `externalSupabase` project. If history does not appear, verify that the runtime SQL from `docs/sql/external-supabase/20260330_mock_exam_runtime.sql` is actually applied in the correct project.
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
