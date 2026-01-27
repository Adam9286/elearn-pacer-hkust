
# Integration Plan: Connect Course Mode AI Tutor to n8n Backend

## Overview
Connect the Course Mode slide-by-slide learning feature to your existing n8n workflow. When users click "Next Section" or navigate slides in the AI Tutor tab, the frontend will call your n8n webhook to get AI-generated explanations from your pre-populated `LectureSlides` table.

---

## Current State
- Frontend: `GuidedLearning.tsx` calls `fetchSlideExplanation()` from `src/services/courseApi.ts`
- Backend: Mock implementation returning placeholder data (`USE_MOCK_BACKEND = true`)
- Your n8n: Ready with webhook, Supabase lookup, DeepSeek AI, and RAG tools

---

## Changes Required

### 1. Add Course Mode Webhook to Constants
**File:** `src/constants/api.ts`

Add the new Course Mode webhook URL alongside your existing Chat and Exam webhooks:
```typescript
export const WEBHOOKS = {
  CHAT: 'https://smellycat9286.app.n8n.cloud/webhook/...',
  EXAM_GENERATOR: 'https://smellycat9286.app.n8n.cloud/webhook/...',
  
  // NEW: Course Mode AI Tutor
  COURSE_SLIDE_EXPLAIN: 'https://smellycat9286.app.n8n.cloud/webhook/56bcc2db-cee9-4158-a0b2-1675ecdd2423/course/slide-explain',
} as const;

export const TIMEOUTS = {
  CHAT: 120000,
  EXAM_GENERATION: 180000,
  SLIDE_EXPLANATION: 60000,  // NEW: 60 seconds for slide explanations
} as const;
```

---

### 2. Update Course API to Call n8n
**File:** `src/services/courseApi.ts`

Replace the mock implementation with a real API call to your n8n webhook:

```typescript
import { WEBHOOKS, TIMEOUTS } from '@/constants/api';

// Feature flag - set to false to use real n8n backend
const USE_MOCK_BACKEND = false;

export async function fetchSlideExplanation(
  request: SlideExplanationRequest
): Promise<SlideExplanationResponse> {
  if (USE_MOCK_BACKEND) {
    return mockSlideExplanation(request);
  }

  // Real n8n API call
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.SLIDE_EXPLANATION);

  try {
    const response = await fetch(WEBHOOKS.COURSE_SLIDE_EXPLAIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: request.lessonId,
        slideNumber: request.slideNumber,
        totalSlides: request.totalSlides,
        lessonTitle: request.lessonTitle,
        chapterTitle: request.chapterTitle,
        chapterTopics: request.chapterTopics,
        textbookSections: request.textbookSections,
        previousContext: request.previousContext,
        generateQuestion: request.generateQuestion,
        pdfUrl: request.pdfUrl,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch explanation (${response.status})`);
    }

    const data = await response.json();
    
    // Ensure keyPoints is an array (handle n8n serialization issue)
    return {
      explanation: data.explanation || '',
      keyPoints: Array.isArray(data.keyPoints) 
        ? data.keyPoints 
        : JSON.parse(data.keyPoints || '[]'),
      comprehensionQuestion: data.comprehensionQuestion || undefined,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
}
```

---

## Critical Fix Needed in n8n

### Issue: Response Serialization
Your `Respond to Webhook1` node currently has:
```javascript
"keyPoints": "={{ $json.keyPoints }}"  // ❌ Becomes a string
```

**Fix:** Change to proper JSON expression:
```javascript
{
  "explanation": {{ JSON.stringify($json.explanation) }},
  "keyPoints": {{ JSON.stringify($json.keyPoints) }},
  "comprehensionQuestion": {{ $json.comprehensionQuestion ? JSON.stringify($json.comprehensionQuestion) : 'null' }}
}
```

Or use the "Respond with all incoming items" option and let n8n serialize automatically.

---

## How It Will Work After Integration

```text
User clicks "AI Tutor" tab
         │
         ▼
GuidedLearning loads → slide 1 contentState = 'idle'
         │
         ▼ (useEffect triggers)
         │
fetchSlideExplanation({ lessonId: "1-1", slideNumber: 1, ... })
         │
         ▼ (POST request)
         │
n8n Webhook receives request
         │
         ▼
Validation Code Node → validates input
         │
         ▼
Supabase "Get many rows" → lookup LectureSlides
         │
    ┌────┴────┐
    │         │
 Found    Not Found
    │         │
    ▼         ▼
Use cached   OCR (not configured)
slide text   → would fail
    │
    ▼
Edit Fields → normalize slideText
    │
    ▼
CourseMode Agent (DeepSeek + RAG)
    │
    ▼
Validation Code → ensure keyPoints is array
    │
    ▼
Respond to Webhook → JSON response
    │
    ▼
Frontend receives { explanation, keyPoints, comprehensionQuestion }
    │
    ▼
ExplanationPanel shows explanation + key points
```

---

## Testing Checklist

1. **Activate n8n workflow** - Toggle to "Active" in n8n dashboard
2. **Verify LectureSlides data** - Ensure your table has entries for all `(lessonId, slideNumber)` pairs
3. **Test one slide** - Go to AI Tutor tab and verify explanation loads
4. **Check console for errors** - Look for 200 OK responses and valid JSON

---

## Data Requirements

Your `LectureSlides` table should have:
| Column | Type | Description |
|--------|------|-------------|
| id | text | Matches `lessonId` from frontend (e.g., "1-1") |
| slide_number | int | Page number (1, 2, 3...) |
| source_text | text | Pre-extracted slide content |

---

## Summary

| Component | Action |
|-----------|--------|
| `src/constants/api.ts` | Add `COURSE_SLIDE_EXPLAIN` webhook URL |
| `src/services/courseApi.ts` | Switch `USE_MOCK_BACKEND` to `false`, call n8n |
| n8n `Respond to Webhook1` | Fix JSON array serialization for `keyPoints` |
| n8n workflow | Ensure it's Activated (not just saved) |

No OCR is needed if your `LectureSlides` table is fully populated.
