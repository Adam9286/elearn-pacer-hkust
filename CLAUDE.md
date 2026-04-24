# LearningPacer - Repo Brief

## What This Repo Is
Frontend for HKUST ELEC3120 (Computer Networks). Main product areas:
- Chat Mode
- Course Mode
- Mock Exam
- Simulations

## Commands
```bash
npm run dev
npm run build
npm run build:dev
npm run lint
npm run preview
```

## Core Stack
- React 18 + TypeScript + Vite
- Tailwind CSS 3 + shadcn/ui
- Hosted n8n for AI orchestration
- Two Supabase projects
- Mermaid.js, KaTeX, Recharts, Framer Motion

## Architecture
- Hosted n8n base defaults to `https://n8n.learningpacer.org`
- Current n8n workflow editor link: `https://n8n.learningpacer.org/workflow/MznVBhIC4sbFquyy`
- Webhook URLs and timeouts live in `src/constants/api.ts`
- `externalSupabase` in `src/lib/externalSupabase.ts` handles auth, sessions, chat history, and user progress
- `examSupabase` in `src/lib/examSupabase.ts` handles lecture embeddings, textbook content, past papers, and exam-related data

## High-Value Files
- `src/constants/api.ts` - n8n endpoints and timeout settings
- `src/components/ChatMode.tsx` - main chat send flow
- `src/components/chat/ChatConversation.tsx` - chat rendering and follow-up flow
- `src/components/chat/RenderMarkdown.tsx` - markdown, Mermaid, and KaTeX rendering
- `src/services/mockExamApi.ts` - mock exam requests
- `src/services/courseApi.ts` - Course Mode retrieval and n8n fallback
- `src/utils/citationParser.ts` - citation normalization/parsing

## Webhooks
- `CHAT_RESEARCH` - chat with RAG, 120s timeout
- `EXAM_GENERATOR` - mock exam generation, 180s timeout
- `COURSE_SLIDE_CHAT` - per-slide AI explanation, 60s timeout

## Rules That Matter
- Never mix the two Supabase clients. Auth/user data always uses `externalSupabase`. Knowledge base and exam data use `examSupabase`.
- TypeScript strict mode is intentionally off. Do not enable it as part of unrelated work.
- Production calls should use `webhook/`; `webhook-test/` is for development-only workflow testing.
- Mock exam still primarily returns hosted PDF links from n8n. Do not assume structured exam payloads are always available.
- Use `@/` imports.
- Use `lucide-react` for icons, `sonner` for toasts, and `react-hook-form` + `zod` for forms.

## Simulator UI Rules
- Wrap simulator content in `SimulationShell` and `SimulationCanvas`
- Preserve the existing simulator button styling conventions instead of introducing new variants
- Keep simulator visuals compatible with both light and dark mode

## Environment Variables
```bash
VITE_N8N_BASE_URL            # Optional override; default is https://n8n.learningpacer.org
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_KNOWLEDGE_BASE_URL
VITE_KNOWLEDGE_BASE_ANON_KEY
VITE_APP_ENV
VITE_TIMEOUT_AGENT
```

## Common Pitfalls
- `examSupabase` MCP project ref is `oqgotlmztpvchkipslnc`
- n8n may return empty bodies if the workflow is active but the response node is misconfigured
- Citation cards expect normalized extracted content, not just raw tool output
