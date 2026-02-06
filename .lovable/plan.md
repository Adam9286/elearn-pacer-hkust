

# Fix Chat Integration: Production URL, Timeout, and Response Parsing

## Changes Overview

Three targeted fixes to resolve the "Smart Answer" mode failing to display responses.

---

## 1. Switch CHAT_RESEARCH to Production URL

**File:** `src/constants/api.ts` (line 9)

Change from:
```
https://n8n.learningpacer.org/webhook-test/6f2a40a0-765a-44f0-a012-b24f418869bb
```
To:
```
https://n8n.learningpacer.org/webhook/6f2a40a0-765a-44f0-a012-b24f418869bb
```

This eliminates the need for the "Listen for test event" button to be active in n8n, which was likely causing the "Failed to fetch" errors.

---

## 2. Increase Timeout for Agent Modes (auto/deepthink)

**File:** `src/components/ChatMode.tsx` (line 156)

Currently hardcoded to 90 seconds for all modes. Change to use mode-aware timeouts:
- Quick Answer: 30 seconds (LangChain is fast)
- Smart Answer / Deep Research: 120 seconds (Agent needs time for RAG + reasoning)

The `TIMEOUTS.CHAT` constant (already 120000ms) will be used for agent modes. The error message will also update to reflect the correct timeout duration.

---

## 3. Response Parsing and Error Handling

**File:** `src/components/ChatMode.tsx` (lines 176-184)

The existing parsing logic already handles `answer`, `citations`, and `retrieved_materials` correctly:
```typescript
const answer = payload.answer ?? payload.output ?? "fallback";
const citations = payload.citations ?? [];
const retrievedMaterials = payload.retrieved_materials ?? [];
```

No changes needed here -- the rendering (Markdown + LaTeX via `RenderMarkdown`, citations via `CitationSection`) is already wired up.

**Error handling improvement** (lines 200-229): Add differentiation for network/CORS errors vs timeouts, with clearer user-facing messages for each case.

---

## Files Modified
- `src/constants/api.ts` -- production webhook URL
- `src/components/ChatMode.tsx` -- mode-aware timeout + better error messages

