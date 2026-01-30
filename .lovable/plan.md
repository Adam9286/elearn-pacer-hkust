

## Fix: ModelScope Qwen3-32B "enable_thinking" Parameter Error

### Problem
The Qwen3-32B model requires a special parameter `enable_thinking: false` for non-streaming API calls. Without this, the API returns a 400 error.

### Solution: Add the Required Parameter

Update both edge functions to include `enable_thinking: false` in the request body.

---

### Changes Required

#### 1. Update `generate-single-slide/index.ts`

**Location**: Lines 225-232 (the API request body)

**Current code**:
```typescript
body: JSON.stringify({
  model: MODELSCOPE_MODEL,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  max_tokens: 2048,
}),
```

**Updated code**:
```typescript
body: JSON.stringify({
  model: MODELSCOPE_MODEL,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  max_tokens: 2048,
  enable_thinking: false,  // Required for Qwen3-32B non-streaming calls
}),
```

---

#### 2. Update `batch-generate-slides/index.ts`

Apply the same change to the batch function's API request.

---

### Alternative Option

If you'd prefer to avoid this complexity, we could switch back to **GLM-4.7-Flash** which worked without any special parameters:
```typescript
const MODELSCOPE_MODEL = "ZhipuAI/GLM-4.7-Flash";
```

---

### Recommendation

I recommend **Option 1** (adding `enable_thinking: false`) since Qwen3-32B is a strong reasoning model that should produce high-quality explanations for technical content. The fix is minimal - just one line in each function.

