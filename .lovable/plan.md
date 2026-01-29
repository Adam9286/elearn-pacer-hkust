
# Switch to OpenRouter (Llama 3.3 70B Instruct)

## Overview
Replace the current ModelScope API with OpenRouter to use the **Meta Llama 3.3 70B Instruct** model for generating slide explanations. This model offers excellent multilingual support, 131K context window, and strong instruction-following for structured JSON output.

## Changes Required

### 1. Add OpenRouter API Secret
Store the provided API key as `OPENROUTER_API_KEY` in the project secrets.

### 2. Update `generate-single-slide` Edge Function
- Change API endpoint from ModelScope to OpenRouter: `https://openrouter.ai/api/v1/chat/completions`
- Update model identifier to: `meta-llama/llama-3.3-70b-instruct`
- Update secret reference from `MODELSCOPE_API_KEY` to `OPENROUTER_API_KEY`
- Update error messages to reference OpenRouter

### 3. Update `batch-generate-slides` Edge Function
Same changes as above:
- API endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Model: `meta-llama/llama-3.3-70b-instruct`
- Secret: `OPENROUTER_API_KEY`

### 4. Redeploy Both Functions
Deploy the updated edge functions to apply changes.

---

## Technical Details

**API Configuration:**
```text
Endpoint: https://openrouter.ai/api/v1/chat/completions
Model: meta-llama/llama-3.3-70b-instruct
Secret: OPENROUTER_API_KEY
```

**Files Modified:**
- `supabase/functions/generate-single-slide/index.ts`
- `supabase/functions/batch-generate-slides/index.ts`

**Key Changes in Code:**
```typescript
// Before (ModelScope)
const MODELSCOPE_API_URL = "https://api-inference.modelscope.cn/v1/chat/completions";
const MODELSCOPE_MODEL = "ZhipuAI/GLM-4.7";
// Uses MODELSCOPE_API_KEY

// After (OpenRouter)
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";
// Uses OPENROUTER_API_KEY
```

**Benefits of Llama 3.3 70B:**
- 131K context window (perfect for full lecture outlines)
- Strong instruction-following for reliable JSON output
- Free tier available on OpenRouter
- Excellent multilingual support (8 languages including English)
- Optimized for dialogue and educational content
