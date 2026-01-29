

# Plan: Switch to ModelScope Qwen3-Coder Model

## Overview
Replace the Hugging Face API with ModelScope's Qwen3-Coder-30B-A3B-Instruct model for slide explanation generation. This coder-focused model excels at technical explanations and structured JSON output.

## What Changes

| Component | Current | New |
|-----------|---------|-----|
| API URL | `https://router.huggingface.co/v1/chat/completions` | `https://api-inference.modelscope.cn/v1/chat/completions` |
| Model | `Qwen/Qwen2.5-72B-Instruct` | `Qwen/Qwen3-Coder-30B-A3B-Instruct` |
| Secret | `HUGGINGFACE_API_KEY` | `MODELSCOPE_TOKEN` |
| Context | 128K tokens | 256K tokens |

## Why Qwen3-Coder Works Well
- Coder-focused training: Strong at technical networking explanations (protocols, algorithms)
- 256K context window: Easily handles full lecture outlines
- MoE efficiency: 30.5B params but only 3.3B active per inference (fast)
- OpenAI-compatible API: Minimal code changes needed

## Implementation Steps

### Step 1: Add Secret
Add `MODELSCOPE_TOKEN` with your provided API key:
```
ms-6ebd26ce-71f0-4c90-92ba-c577c90ef608
```

### Step 2: Update generate-single-slide/index.ts
- Change API constants from Hugging Face to ModelScope
- Update environment variable from `HUGGINGFACE_API_KEY` to `MODELSCOPE_TOKEN`
- Update error messages to reference ModelScope

### Step 3: Update batch-generate-slides/index.ts
- Same changes as above for the batch processing function

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/generate-single-slide/index.ts` | Switch to ModelScope API |
| `supabase/functions/batch-generate-slides/index.ts` | Switch to ModelScope API |

## Technical Details

The API structure remains identical (OpenAI-compatible), so only these constants change:

```typescript
// Before (Hugging Face)
const HUGGINGFACE_API_URL = "https://router.huggingface.co/v1/chat/completions";
const HUGGINGFACE_MODEL = "Qwen/Qwen2.5-72B-Instruct";
const HF_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");

// After (ModelScope)
const MODELSCOPE_API_URL = "https://api-inference.modelscope.cn/v1/chat/completions";
const MODELSCOPE_MODEL = "Qwen/Qwen3-Coder-30B-A3B-Instruct";
const MODELSCOPE_TOKEN = Deno.env.get("MODELSCOPE_TOKEN");
```

## After Implementation
Test by generating a single slide from the admin review page to verify the new API works correctly.

