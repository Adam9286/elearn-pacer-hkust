

# Switch to n8n Test Webhook URL

## Summary
Update the `COURSE_SLIDE_CHAT` webhook URL to use the **test endpoint** so you can develop and debug without activating the workflow.

---

## Change Required

### File: `src/constants/api.ts`

**Line 15 - Change from:**
```typescript
COURSE_SLIDE_CHAT: 'https://smellycat9286.app.n8n.cloud/webhook/56bcc2db-cee9-4158-a0b2-1675ecdd2423/course/slide-chat',
```

**To:**
```typescript
COURSE_SLIDE_CHAT: 'https://smellycat9286.app.n8n.cloud/webhook-test/course/slide-chat',
```

---

## How to Test

1. In n8n, click **"Listen for test event"** (orange button)
2. In your app, go to any lesson page and ask a question in SlideChat
3. n8n will receive the request and you can see the full execution
4. The response will appear in your chat

---

## Important Notes

| Mode | URL Pattern | When to Use |
|------|-------------|-------------|
| **Test** | `/webhook-test/path` | Development - requires clicking "Listen" |
| **Production** | `/webhook/{id}/path` | Live app - requires workflow Activated |

When you're ready to go live, you'll change it back to the production URL and activate the workflow.

