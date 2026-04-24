# Agent Notes

Read `CLAUDE.md` first.

## Hard Constraints
- Hosted n8n is the default: `https://n8n.learningpacer.org`
- Current workflow editor link: `https://n8n.learningpacer.org/workflow/MznVBhIC4sbFquyy`
- `externalSupabase` is for auth/user data
- `examSupabase` is for RAG/exams
- Do not enable TypeScript strict mode
- Use `@/` imports
- Treat `webhook-test/` as development-only

## Main Entry Points
- `src/constants/api.ts`
- `src/components/ChatMode.tsx`
- `src/components/chat/ChatConversation.tsx`
- `src/services/mockExamApi.ts`
- `src/services/courseApi.ts`
