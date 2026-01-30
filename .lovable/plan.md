

# Course Mode SlideChat Integration Plan

## Summary
Connect the SlideChat component to your new n8n Course Mode workflow by fixing the webhook URL and ensuring proper data flow.

---

## Current Issue
The frontend `SlideChat.tsx` is calling the **wrong webhook** (`WEBHOOKS.CHAT` - general chat) instead of your Course Mode workflow.

---

## Changes I Will Make

### File 1: `src/constants/api.ts`

Update the webhook constant to match your n8n path:

```typescript
export const WEBHOOKS = {
  // Chat AI webhook - PRODUCTION
  CHAT: 'https://smellycat9286.app.n8n.cloud/webhook/6f2a40a0-765a-44f0-a012-b24f418869bb',
  
  // Mock exam generator webhook - PRODUCTION
  EXAM_GENERATOR: 'https://smellycat9286.app.n8n.cloud/webhook/bfdb1a10-c848-4bd1-8f50-5dbca106ccdb',
  
  // Course Mode SlideChat - context-aware Q&A (NEW)
  COURSE_SLIDE_CHAT: 'https://smellycat9286.app.n8n.cloud/webhook/56bcc2db-cee9-4158-a0b2-1675ecdd2423/course/slide-chat',
} as const;
```

---

### File 2: `src/components/lesson/SlideChat.tsx`

**Change 1:** Use the Course Mode webhook instead of general chat

```typescript
// Line 76: Change from
const response = await fetch(WEBHOOKS.CHAT, {

// To
const response = await fetch(WEBHOOKS.COURSE_SLIDE_CHAT, {
```

**Change 2:** Add fallback for n8n agent output format

```typescript
// Line 105: Add data.output fallback
content: data.response || data.output || data.message || "I couldn't generate a response. Please try again.",
```

---

## Data Flow After Changes

```text
User types question in SlideChat
        │
        ▼
Frontend sends POST to /course/slide-chat
{
  message: "What is TCP?",
  slideContext: {
    lessonId: "5-1",
    lessonTitle: "BGP Introduction",
    slideNumber: 3,
    lectureId: "11-BGP"
  },
  isSlideChat: true
}
        │
        ▼
n8n Webhook receives → Set Fields extracts context
        │
        ▼
CourseMode Agent queries vector stores
(testingone + elec3120_textbook)
        │
        ▼
Formatting Node returns { response: "..." }
        │
        ▼
Frontend displays response in chat
```

---

## What You Need to Verify in n8n

1. **Workflow is ACTIVATED** - Toggle in top-right must be ON (green)
2. **Webhook path matches** - Should be `/course/slide-chat`
3. **Test the webhook** - Try sending a test request to verify it works

---

## Technical Details

| Setting | Value |
|---------|-------|
| Webhook URL | `https://smellycat9286.app.n8n.cloud/webhook/56bcc2db-cee9-4158-a0b2-1675ecdd2423/course/slide-chat` |
| HTTP Method | POST |
| Response Format | `{ "response": "AI answer text" }` |
| Timeout | 120 seconds (2 minutes) |

