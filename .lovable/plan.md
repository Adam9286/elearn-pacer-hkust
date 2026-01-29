

# Switch to Hugging Face Inference API

## Overview

Replace the Lovable AI Gateway with Hugging Face's Router API to bypass the AI credits limitation. The change is straightforward since HF uses OpenAI-compatible endpoints.

---

## What Changes

| Component | Before | After |
|-----------|--------|-------|
| API URL | `https://ai.gateway.lovable.dev/v1/chat/completions` | `https://router.huggingface.co/v1/chat/completions` |
| Auth Header | `Bearer ${LOVABLE_API_KEY}` | `Bearer ${HUGGINGFACE_API_KEY}` |
| Model | `google/gemini-3-flash-preview` | `Qwen/Qwen2.5-72B-Instruct` |
| Secret | Uses existing LOVABLE_API_KEY | New HUGGINGFACE_API_KEY secret |

---

## Recommended Model

**Qwen/Qwen2.5-72B-Instruct** is recommended for teaching because:
- Excellent at structured explanations
- Strong reasoning for technical content like computer networks
- Good at following JSON output format instructions
- Available on HF Inference API with generous free tier

Alternative options:
- `meta-llama/Llama-3.1-70B-Instruct` - Also excellent
- `mistralai/Mixtral-8x7B-Instruct-v0.1` - Faster, slightly smaller

---

## Implementation Steps

### Step 1: Add Secret

Add `HUGGINGFACE_API_KEY` as a new secret with your API key:
```
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
```

### Step 2: Update generate-single-slide/index.ts

```typescript
// Change from:
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// To:
const HUGGINGFACE_API_URL = "https://router.huggingface.co/v1/chat/completions";
const HUGGINGFACE_MODEL = "Qwen/Qwen2.5-72B-Instruct";
```

Update the API call:
```typescript
// Change from:
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// To:
const HF_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
```

Update the fetch call:
```typescript
const response = await fetch(HUGGINGFACE_API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${HF_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: HUGGINGFACE_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2048,
  }),
});
```

### Step 3: Update batch-generate-slides/index.ts

Same changes as above - update URL, model, and API key references.

---

## Files to Modify

| File | Changes |
|------|---------|
| (Secret) | Add `HUGGINGFACE_API_KEY` secret |
| `supabase/functions/generate-single-slide/index.ts` | Switch to HF API URL, model, and key |
| `supabase/functions/batch-generate-slides/index.ts` | Switch to HF API URL, model, and key |

---

## Error Handling

Update error handling for HF-specific responses:
```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error("Hugging Face API error:", response.status, errorText);
  if (response.status === 429) {
    throw new Error("Rate limit exceeded. Please try again in a moment.");
  }
  if (response.status === 401) {
    throw new Error("Invalid Hugging Face API key.");
  }
  throw new Error(`Hugging Face API error: ${response.status}`);
}
```

---

## Summary

This is a minimal change - just swapping the API endpoint, model name, and secret. The request/response format is identical (OpenAI-compatible), so all the prompt engineering and JSON parsing logic remains unchanged.

Your HF API key has a generous free tier, and Qwen2.5-72B-Instruct is an excellent model for educational content.

