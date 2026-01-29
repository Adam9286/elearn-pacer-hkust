

# Simpler Slide Generation: One at a Time

## Problem
The current batch function times out because generating 61 slides takes 6+ minutes, but Edge Functions have a 60-second limit. The logs show it IS working - it generated 36 slides before the connection dropped.

## Solution: Single-Slide Generation
Replace batch generation with a simpler "Generate" button per slide that creates content instantly (~3 seconds per slide).

## How It Will Work

```text
+------------------------------------------+
| Select Lecture: [01-Introduction ▼]      |
+------------------------------------------+
| Slides         | Editor                  |
|----------------|-------------------------|
| ○ Slide 1      | [Generate] ← Click this |
| ○ Slide 2      |                         |
| ● Slide 3 ✓    | Explanation: _______    |
| ...            | Key Points: • ___       |
|                |                         |
|                | [Save] [Approve]        |
+------------------------------------------+
```

## Changes

### 1. New Edge Function: `generate-single-slide`
A lightweight function that generates content for ONE slide only:
- Accepts: `lecture_id`, `slide_number`
- Generates explanation via Gemini 3 Flash
- Saves directly to database with `status = 'draft'`
- Returns the generated content immediately (~3 seconds)

### 2. Update Admin UI
- Add "Generate" button to SlideEditor (visible when slide has no content)
- Add "Generate Next" button to quickly move through slides
- Show progress indicator during generation

### 3. Keep Batch Function (Background)
The existing batch function still works - it just times out before finishing. But the content IS being saved (36 slides were generated). You can:
- Run it multiple times (it skips already-generated slides)
- Or use single-slide generation for remaining slides

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/generate-single-slide/index.ts` | Create | New lightweight function |
| `supabase/config.toml` | Edit | Add function config |
| `src/services/adminApi.ts` | Edit | Add `generateSingleSlide()` |
| `src/components/admin/SlideEditor.tsx` | Edit | Add Generate button |
| `src/pages/AdminReviewSlides.tsx` | Edit | Handle missing slides + generation |

## Technical Details

### New Edge Function (`generate-single-slide`)
```typescript
// Input: { lecture_id: "01-Introduction", slide_number: 5 }
// Output: { success: true, data: { explanation, key_points, comprehension_question } }

1. Fetch single slide text from lecture_slides_course
2. Call Lovable AI (Gemini 3 Flash) - ~2-3 seconds
3. Save to slide_explanations with status = 'draft'
4. Return generated content
```

### UI Changes
- SlideEditor shows "Generate Content" button if `explanation` is empty
- After generation, content populates editor for review
- One-click workflow: Generate → Review → Approve

## Workflow After Implementation

1. Go to `/admin/review-slides`
2. Select lecture (e.g., 01-Introduction)
3. See list of slides (some generated, some empty)
4. Click on empty slide → Click "Generate"
5. Review content → Edit if needed → Approve
6. Move to next slide, repeat

## Benefits
- No timeouts (single API call completes in 3 seconds)
- Immediate feedback
- Control over which slides to generate
- Can still use batch function for background generation
