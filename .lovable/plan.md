

# Three Chat Modes Using Two Workflows

## The Problem
You have two n8n workflows:
1. **AI Agent workflow** (`CHAT_RESEARCH` webhook) with two internal paths based on `json.mode`: `"auto"` and `"deepthink"`
2. **LangChain workflow** (`CHAT_QUICK` webhook) for fast, no-memory answers

The current UI only has "Quick Answer" and "Deep Research" -- this maps 1:1 to webhooks, meaning the `deepthink` path inside the Agent workflow is never triggered.

## Solution
Expand the selector to **3 user-friendly modes**, mapping to the correct webhook + mode parameter:

| User sees | Webhook used | `mode` sent | Description |
|-----------|-------------|-------------|-------------|
| Quick Answer | `CHAT_QUICK` (LangChain) | `"quick"` | Instant, no memory, ~2-5s |
| Smart Answer | `CHAT_RESEARCH` (Agent) | `"auto"` | Agent with tools, ~10-20s |
| Deep Research | `CHAT_RESEARCH` (Agent) | `"deepthink"` | Thorough agent reasoning, ~20-40s |

## Technical Changes

### 1. Update type and selector (`DeepThinkToggle.tsx`)
- Change `ChatWorkflowMode` from `'quick' | 'research'` to `'quick' | 'auto' | 'deepthink'`
- Add a third `SelectItem` for "Smart Answer" between Quick and Deep Research
- Icons: Zap (quick), Brain (auto/smart), Search (deepthink/deep research)

### 2. Update webhook routing (`ChatMode.tsx`)
Change the webhook selection logic from:
```
chatMode === 'research' ? CHAT_RESEARCH : CHAT_QUICK
```
to:
```
chatMode === 'quick' ? CHAT_QUICK : CHAT_RESEARCH
```

The `mode` field already sends `chatMode` in the body (`mode: chatMode`), so the Agent workflow will correctly receive `"auto"` or `"deepthink"`.

### 3. Update default mode
Change the default state from `'quick'` to `'auto'` so most users land on the balanced option.

### Files Modified
- `src/components/chat/DeepThinkToggle.tsx` -- add third option, update type
- `src/components/ChatMode.tsx` -- update webhook routing logic, change default mode
