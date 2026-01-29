
# Fix: Update ModelScope API Endpoint

## Problem Identified
Your ModelScope token was created on **modelscope.cn** (Chinese platform), but the code is calling **api-inference.modelscope.ai** (international platform). These are separate services with different authentication systems.

## Solution
Change the API endpoint from `.ai` to `.cn` domain.

## What Changes

| Current (broken) | Fixed |
|------------------|-------|
| `https://api-inference.modelscope.ai/v1/chat/completions` | `https://api-inference.modelscope.cn/v1/chat/completions` |

## Files to Modify

### 1. supabase/functions/generate-single-slide/index.ts (line 16)
Change the API URL constant:
```typescript
// Before
const MODELSCOPE_API_URL = "https://api-inference.modelscope.ai/v1/chat/completions";

// After  
const MODELSCOPE_API_URL = "https://api-inference.modelscope.cn/v1/chat/completions";
```

### 2. supabase/functions/batch-generate-slides/index.ts
Apply the same URL change for consistency when batch generating.

## After Implementation
Redeploy the edge functions and test slide generation - your token should now authenticate correctly.
