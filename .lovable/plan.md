

# Fix Batch Generation Timeout Plan

## Problem Analysis

The `batch-generate-slides` edge function times out because:

1. **Sequential Processing**: Each slide is processed one-by-one in a for-loop (lines 192-246)
2. **Time Per Slide**: ~5-10 seconds AI generation + 1.5s rate-limit delay = ~7-12 seconds per slide
3. **Timeout Limit**: Supabase Edge Functions have a **60-second hard limit**
4. **Result**: A lecture with 18 slides needing generation = ~2+ minutes (times out after ~5-6 slides)

The `generate-single-slide` function works because it only processes 1 slide (~5-10 seconds).

---

## Proposed Solution: Background Processing with Immediate Response

Use Supabase's `EdgeRuntime.waitUntil()` to:
1. Return an immediate response to the client (no timeout)
2. Continue processing slides in the background
3. Track progress in a status table so the UI can poll for updates

---

## Architecture

```text
+----------------+          +----------------------+
|   Admin UI     |  POST    | batch-generate       |
|  (Click btn)   | -------> | edge function        |
+----------------+          +----------------------+
       |                              |
       |                    1. Return immediately:
       |                       { job_id, status: "processing" }
       |                              |
       v                    2. Background: for each slide...
+----------------+                    |
| Poll for       | <----- 3. EdgeRuntime.waitUntil() 
| progress       |           saves results to DB
+----------------+
```

---

## Technical Implementation

### Option A: Background Processing (Recommended)
Use `EdgeRuntime.waitUntil()` to process slides after returning response.

**Pros**: Simple, single function, no new tables needed
**Cons**: No real-time progress tracking (but we can check DB)

### Option B: Job Queue with Status Table
Create a `generation_jobs` table to track progress and poll from UI.

**Pros**: Real-time progress, retry failed slides
**Cons**: More complex, requires new table

**Selected: Option A** - simpler and meets the need

---

## File Changes

### 1. supabase/functions/batch-generate-slides/index.ts

| Change | Description |
|--------|-------------|
| Add shutdown handler | Log progress when function terminates |
| Wrap processing in waitUntil | Move the for-loop into a background task |
| Return immediate response | Send job acknowledgment immediately |
| Remove blocking awaits | Let the background task run independently |

**New Flow:**
```typescript
serve(async (req) => {
  // 1. Validate inputs (same as before)
  // 2. Fetch slides list (same as before)
  // 3. Determine which need generation (same as before)
  
  // 4. NEW: Start background processing
  const slidesToProcess = slides.filter(...);
  
  EdgeRuntime.waitUntil(processSlides(slidesToProcess, ...));
  
  // 5. Return immediately
  return new Response(JSON.stringify({
    status: "processing",
    message: `Started generating ${slidesToProcess.length} slides`,
    total_slides: slides.length,
    to_generate: slidesToProcess.length,
    skipped: existingCount,
  }), { headers: corsHeaders });
});
```

### 2. src/services/adminApi.ts

| Change | Description |
|--------|-------------|
| Update response handling | Handle new "processing" status |
| Add polling helper | Optional: poll DB for completion |

### 3. src/pages/AdminReviewSlides.tsx

| Change | Description |
|--------|-------------|
| Update toast messages | Show "Generation started" instead of waiting |
| Add refresh after delay | Auto-reload slides after a few seconds |

---

## Detailed Code Changes

### Edge Function Changes

```typescript
// Add at top of file
const processSlides = async (
  slides: SlideContent[],
  lectureId: string,
  totalSlides: number,
  apiKey: string,
  examSupabase: any
) => {
  let generated = 0;
  let errors = 0;
  
  for (const slide of slides) {
    try {
      console.log(`[background] Generating slide ${slide.slide_number}...`);
      const content = await generateSlideExplanation(...);
      await examSupabase.from("slide_explanations").upsert(...);
      generated++;
      console.log(`[background] Slide ${slide.slide_number} done (${generated}/${slides.length})`);
      await new Promise(r => setTimeout(r, 1500)); // rate limit
    } catch (err) {
      console.error(`[background] Slide ${slide.slide_number} failed:`, err);
      errors++;
    }
  }
  
  console.log(`[background] Complete: ${generated} generated, ${errors} errors`);
};

// Add shutdown handler
addEventListener('beforeunload', (ev) => {
  console.log('[batch-generate-slides] Shutting down:', ev.detail?.reason);
});
```

### Admin UI Changes

Show immediate feedback and auto-refresh:
```typescript
const handleGenerateLecture = async () => {
  setIsGenerating(true);
  try {
    const result = await triggerBatchGeneration(selectedLecture, false);
    toast({
      title: 'Generation Started',
      description: `Processing ${result.to_generate} slides in background...`,
    });
    
    // Auto-refresh after 5 seconds to check progress
    setTimeout(() => {
      loadLectureSlides(selectedLecture);
      loadSummaries();
    }, 5000);
  } catch (err) {
    toast({ title: 'Error', variant: 'destructive' });
  } finally {
    setIsGenerating(false);
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/batch-generate-slides/index.ts` | Add EdgeRuntime.waitUntil(), return immediately, add shutdown handler |
| `src/services/adminApi.ts` | Update response type to handle "processing" status |
| `src/pages/AdminReviewSlides.tsx` | Update toast messages, add auto-refresh |

---

## Summary

| Before | After |
|--------|-------|
| Function waits for all slides | Function returns in ~2 seconds |
| Timeout after ~60s (5-6 slides) | Background processes all slides |
| No feedback until complete/fail | Immediate "started" confirmation |
| Must manually refresh | Auto-refresh to see progress |

This approach uses the Supabase-recommended `EdgeRuntime.waitUntil()` pattern for background processing while keeping the implementation simple.

