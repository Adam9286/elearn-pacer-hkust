

# Fix Redundant Greetings & Add Lecture Context

## Problem Analysis

The current prompts in both `generate-single-slide/index.ts` and `batch-generate-slides/index.ts` have two issues:

1. **Redundant greetings**: The AI adds "Welcome back!" or similar on every slide because there's no instruction to avoid it
2. **No lecture context**: Each slide is generated in isolation - the AI only sees:
   - Lecture ID (e.g., "01-Introduction")
   - Slide number (e.g., "3 of 18")
   - Slide text content
   
   It doesn't know the lecture title, chapter context, or what the overall learning journey looks like.

---

## Solution Overview

Improve the AI prompt to:

1. **Explicitly forbid repetitive greetings** - Only allow a welcome-style intro on slide 1
2. **Provide full lecture context** - Pass lecture title, chapter info, and topics
3. **Fetch ALL slide texts for batch generation** - Pass a summary/outline so the AI understands the lecture flow
4. **Add continuity instructions** - Tell the AI that each slide builds on the previous one

---

## Technical Implementation

### Changes to Both Edge Functions

The `generateSlideExplanation` function needs enhanced context parameters.

**New System Prompt:**

```typescript
const systemPrompt = `You are an expert computer networks instructor for ELEC3120 at HKUST.
Your role is to explain lecture slides clearly to undergraduate students.

CRITICAL INSTRUCTIONS:
- Do NOT start explanations with greetings like "Welcome!", "Welcome back!", "Hello!", etc.
- Only slide 1 of a lecture may include a brief introduction to the lecture topic.
- For slides 2+, dive directly into the content without preamble.
- Write as if you're continuing a conversation, not starting a new one.
- Connect concepts to what was covered in previous slides when relevant.
- Keep the tone educational, clear, and engaging without being repetitive.`;
```

**Enhanced User Prompt (with lecture context):**

```typescript
const userPrompt = `Generate an explanation for this lecture slide.

LECTURE CONTEXT:
- Course: ELEC3120 Computer Networks
- Chapter: ${chapterTitle} (${chapterDescription})
- Lecture: ${lectureTitle}
- Topics covered in this lecture: ${lectureTopics}

CURRENT SLIDE:
- Slide ${slideNumber} of ${totalSlides}
- Position: ${slideNumber === 1 ? 'This is the FIRST slide - you may briefly introduce the lecture' : 'NOT the first slide - skip any introduction or greeting'}

LECTURE OUTLINE (for context):
${lectureOutline}

SLIDE CONTENT:
${slideText}

INSTRUCTIONS:
- ${slideNumber === 1 ? 'You may include ONE brief introduction to this lecture topic.' : 'Do NOT include any greeting or "welcome" - dive straight into the content.'}
- Reference previous concepts from this lecture if relevant.
- Keep explanations connected and flowing.

Return a JSON object with:
1. "explanation": A clear 2-4 paragraph explanation (NO greetings except slide 1)
2. "keyPoints": An array of 3-5 key takeaways
3. "comprehensionQuestion": An object with question, options (4), correctIndex (0-3), explanation

Respond ONLY with valid JSON.`;
```

---

## Implementation Details

### 1. Batch Generation (batch-generate-slides/index.ts)

This already fetches ALL slides for the lecture. We can:
1. Build a lecture outline from all slide texts before processing
2. Pass the outline to each slide generation call
3. Add lecture metadata from course content

| Change | Description |
|--------|-------------|
| Update system prompt | Add explicit no-greeting instructions |
| Build lecture outline | Create summary of all slides to pass as context |
| Add lecture metadata | Include chapter title, lecture title, topics |
| Conditional greeting | Only allow intro on slide 1 |

### 2. Single Slide Generation (generate-single-slide/index.ts)

This currently fetches only the target slide. We need to:
1. Fetch ALL slides for the lecture (for outline context)
2. Pass the same enhanced prompt

| Change | Description |
|--------|-------------|
| Fetch all slides | Get full lecture context, not just target slide |
| Update system prompt | Same no-greeting instructions |
| Build lecture outline | Summary of entire lecture |
| Pass position context | Tell AI if this is slide 1 or not |

---

## Lecture Context Data

Since the edge function can't import `courseContent.ts`, we have two options:

**Option A**: Hardcode a minimal lecture metadata map in the edge function
**Option B**: Pass lecture metadata from the frontend when calling the API

**Recommended: Option A** - Simpler, no API changes needed. Create a lookup map:

```typescript
const LECTURE_CONTEXT: Record<string, { chapter: string; title: string; topics: string[] }> = {
  "01-Introduction": {
    chapter: "Foundations & Internet Overview",
    title: "Introduction to Computer Networks",
    topics: ["Network fundamentals", "Internet architecture", "Protocol layers"]
  },
  "02-Web": {
    chapter: "Foundations & Internet Overview", 
    title: "Web Basics",
    topics: ["HTTP", "Web protocols", "Client-server model"]
  },
  // ... etc for all 22 lectures
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-single-slide/index.ts` | Update prompt, fetch all slides for context, add lecture metadata |
| `supabase/functions/batch-generate-slides/index.ts` | Update prompt, build lecture outline, add lecture metadata |

---

## Summary

| Before | After |
|--------|-------|
| "Welcome back!" on every slide | Welcome only on slide 1 (if at all) |
| Each slide generated in isolation | AI sees full lecture outline |
| No chapter/topic context | Rich context: chapter, title, topics |
| Disjointed explanations | Connected, flowing teaching |
| Generic system prompt | Explicit no-greeting + continuity instructions |

This will make the AI Tutor feel like a cohesive lecture experience rather than 18 separate explanations.

