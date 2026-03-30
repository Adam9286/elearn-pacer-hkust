# LearningPacer — ELEC3120 Computer Networks

## Project Overview
Interactive learning platform for HKUST ELEC3120 (Computer Networks). Features AI chat with RAG, 18 interactive network simulators, course slide viewer, and mock exam generation. Built as a Final Year Project.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite (port 8080) + Tailwind CSS 3 + shadcn/ui
- **AI Orchestration:** n8n (webhooks in `src/constants/api.ts`)
- **Auth & User Data:** Supabase (`externalSupabase` in `src/lib/externalSupabase.ts`)
- **Knowledge Base & Exams:** Supabase (`examSupabase` in `src/lib/examSupabase.ts`)
- **Diagrams:** Mermaid.js 11 (rendered via `src/components/chat/MermaidDiagram.tsx`)
- **Math:** KaTeX (rendered via `src/components/RenderMath.tsx`)
- **Charts:** Recharts
- **Animations:** Framer Motion

## Commands
```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint check
npm run preview      # Preview production build
```

## Project Structure
```
src/
├── pages/              # Route-level components (Platform, Landing, Auth, Lesson)
├── components/         # Feature components
│   ├── chat/           # Chat UI: ChatConversation, RenderMarkdown, MermaidDiagram, Citations
│   ├── simulations/    # 18 simulators + SimulationShell + SimulationCanvas
│   ├── lesson/         # Course viewer: PdfViewer, SlideChat, GuidedLearning
│   ├── landing/        # Landing page sections
│   ├── admin/          # Slide management
│   └── ui/             # 50+ shadcn/ui primitives
├── hooks/              # useChatHistory, useLessonMastery, use-mobile, use-toast
├── services/           # attachmentService, courseApi, adminApi
├── lib/                # Supabase clients, utils
├── constants/          # api.ts (webhooks + timeouts), upload.ts
├── types/              # chatTypes.ts, courseTypes.ts
├── data/               # courseContent.ts, examTopics.ts
├── contexts/           # UserProgressContext
└── utils/              # citationParser, fileHash, fileValidation
```

## Platform Tabs (in order)
1. **Chat Mode** — AI chat with RAG, citations, file attachments, Mermaid diagrams
2. **Course Mode** — Slide viewer with per-slide AI explanations
3. **Mock Exam** — Configurable exam generation via n8n → Google Drive PDF
4. **Simulations** — 18 interactive network concept simulators
5. **Feedback** — User feedback form
6. **How It Works** — Platform guide

## Dual Supabase Architecture
- `externalSupabase` → Auth, user sessions, chat history, user progress
- `examSupabase` → Knowledge base (lecture embeddings, textbook content, past papers)
- Never mix these up. Auth always uses `externalSupabase`. RAG/exam data uses `examSupabase`.

## n8n Webhooks
| Name | Purpose | Timeout |
|------|---------|---------|
| `CHAT_RESEARCH` | AI chat with RAG retrieval | 120s |
| `EXAM_GENERATOR` | Mock exam PDF generation | 180s |
| `COURSE_SLIDE_CHAT` | Per-slide AI explanations | 60s |

## UI Conventions

### Simulator Components
- All simulators wrap content in `<SimulationShell>` (mission briefing) + `<SimulationCanvas>` (visualization area)
- **Primary action buttons** (Play/Auto-play): `className="bg-cyan-600 hover:bg-cyan-500 text-white"`
- **Secondary buttons** (Step/Back/Next): `variant="outline" className="border-slate-600 text-slate-300"`
- **Destructive buttons** (Reset): `variant="ghost" className="text-slate-500 hover:text-red-400"`
- **Canvas border:** `border-slate-700/80` not `border-border/50`
- **Section backgrounds:** `bg-slate-800/60` not `bg-muted/20` or `bg-muted/30`
- **Card backgrounds:** `bg-slate-900/80` not `bg-card/50`
- **Theory/narration text:** `text-sm text-slate-300` never `text-xs text-muted-foreground`
- **Color-coded status indicators** (packets, nodes, layers): Keep their semantic `/20` opacity — only structural elements get the stronger opacity treatment

### Dark Mode
- Support both light and dark via `dark:` prefix where needed
- SimulationCanvas uses `dark:bg-zinc-900/95 bg-zinc-50` pattern
- SimulationShell uses `dark:text-zinc-200 text-zinc-900` for headings

### General
- Use `@/` path alias for all imports
- Icons from `lucide-react` only
- Toast notifications via `sonner`
- Forms via `react-hook-form` + `zod`

## Chat System Architecture
- User message → `ChatMode.handleSendMessage()` → n8n webhook
- Response parsed → `RenderMarkdown.tsx` handles all rendering
- Mermaid blocks detected by ` ```mermaid ` fence → `<MermaidDiagram>` component (lazy loaded)
- LaTeX blocks: `$$...$$` or `\[...\]` → KaTeX `BlockMath`
- Citations parsed via `src/utils/citationParser.ts` → matched to `retrieved_materials`

## TypeScript Notes
- Strict mode is **off** (`strictNullChecks: false`, `noImplicitAny: false`)
- This is intentional — don't enable strict checks
- Path alias: `@/*` maps to `./src/*`

## Environment Variables
```
VITE_N8N_BASE_URL          # n8n instance URL (default: http://localhost:5678)
VITE_SUPABASE_URL          # External Supabase URL
VITE_SUPABASE_ANON_KEY     # External Supabase anon key
VITE_KNOWLEDGE_BASE_URL    # Exam Supabase URL
VITE_KNOWLEDGE_BASE_ANON_KEY # Exam Supabase anon key
```

## Common Pitfalls
- Don't use `-uall` flag with `git status` — causes memory issues
- The `examSupabase` MCP server (project ref: `oqgotlmztpvchkipslnc`) is configured in `.mcp.json`
- Mock exam currently returns Google Drive PDF links only — structured question data is NOT returned from n8n
- `webhook-test/` endpoints are development-only; production uses `webhook/`
