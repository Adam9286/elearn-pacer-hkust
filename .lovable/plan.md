
# Fix Mastery Completion: 80% of Total Pages Required

## Problem

The current implementation uses **accuracy-based** completion:
- Formula: `questionsCorrect / questionsAnswered >= 80%`
- Issue: 1 correct out of 1 answered = 100% → Passes immediately

## Your Requirement

You want **count-based** completion:
- Formula: `questionsCorrect >= 80% of totalPages`
- Example: Lecture 2-1 has 89 pages → Need at least 72 correct answers
- This ensures students engage with most of the content before completing

## Current Data Flow Issue

```
┌─────────────────────────────────────────────────────────────────┐
│ CURRENT (WRONG)                                                 │
│                                                                 │
│ Answer 1 question correctly                                     │
│     ↓                                                           │
│ accuracy = 1/1 = 100%                                          │
│     ↓                                                           │
│ 100% >= 80% → PASSES ❌                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CORRECT (NEW)                                                   │
│                                                                 │
│ Lecture has 89 pages → requiredCorrect = ceil(89 × 0.80) = 72  │
│     ↓                                                           │
│ Answer 1 question correctly → questionsCorrect = 1             │
│     ↓                                                           │
│ 1 < 72 → NOT PASSED                                            │
│     ↓                                                           │
│ UI shows: "1/72 correct answers needed"                        │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Changes

### 1. Update `useLessonMastery.ts`

Change the passing logic from accuracy-based to count-based:

```typescript
// BEFORE
const hasPassed = accuracy >= MASTERY_THRESHOLD && state.questionsAnswered > 0;

// AFTER
const requiredCorrect = Math.ceil(state.questionsTotal * (MASTERY_THRESHOLD / 100));
const hasPassed = state.questionsCorrect >= requiredCorrect && requiredCorrect > 0;
```

**Key changes:**
- Rename `questionsTotal` to `pagesTotal` for clarity (or keep as-is but use it for pages)
- Add `requiredCorrect` calculation
- Export `requiredCorrect` for UI display
- Update `willPass` check in `recordAnswer` function

### 2. Update `GuidedLearning.tsx`

Pass `totalPages` to the mastery hook instead of counting questions:

```typescript
// BEFORE
useEffect(() => {
  if (totalQuestionsAvailable > 0) {
    setTotalQuestions(totalQuestionsAvailable);
  }
}, [totalQuestionsAvailable, setTotalQuestions]);

// AFTER
useEffect(() => {
  if (totalPages > 0) {
    setTotalQuestions(totalPages);  // Pass total PAGES, not questions
  }
}, [totalPages, setTotalQuestions]);
```

Update completion trigger:

```typescript
// BEFORE
const newAccuracy = Math.round((newCorrect / newAnswered) * 100);
if (newAccuracy >= MASTERY_THRESHOLD && !hasTriggeredComplete && !masteryComplete) {

// AFTER
const requiredCorrect = Math.ceil(totalPages * 0.8);
if (newCorrect >= requiredCorrect && !hasTriggeredComplete && !masteryComplete) {
```

### 3. Update `CompactProgress.tsx`

Show progress toward required correct count:

```typescript
// BEFORE (accuracy-based display)
{questionsCorrect}/{questionsAnswered} correct ({accuracy}%)

// AFTER (count-based display)
{questionsCorrect}/{requiredCorrect} correct
```

**New props needed:**
- `requiredCorrect: number` - How many correct answers needed (e.g., 72)
- Keep `questionsCorrect` - How many correct so far

**Visual:**
```
Before: "3/4 correct (75%)"        ← Confusing, looks like you need 4
After:  "3/72 correct answers"     ← Clear, shows you need 72 total
```

### 4. Update `useLessonMastery.ts` - Return Interface

```typescript
interface UseLessonMasteryReturn extends LessonMasteryState {
  accuracy: number;              // Keep for reference
  requiredCorrect: number;       // NEW: ceil(pagesTotal * 0.8)
  hasPassed: boolean;            // questionsCorrect >= requiredCorrect
  recordAnswer: (isCorrect: boolean) => Promise<void>;
  setTotalQuestions: (total: number) => void;  // Rename to setTotalPages
}
```

## Database Schema

No changes needed - the existing `lesson_mastery` table already has:
- `questions_total` → We'll store `totalPages` here
- `questions_correct` → Count of correct answers
- `is_complete` → True when `questions_correct >= 80% of questions_total`

## UI Changes Summary

| Location | Before | After |
|----------|--------|-------|
| CompactProgress | `3/4 (75%)` | `3/72 correct` |
| Progress hint | `80% to complete` | `69 more needed` |
| Completion toast | `80% mastery achieved!` | `72 correct answers! Lecture complete.` |

## File Changes Required

| File | Change |
|------|--------|
| `src/hooks/useLessonMastery.ts` | Change pass logic from accuracy to count-based |
| `src/components/lesson/GuidedLearning.tsx` | Pass totalPages, update completion check |
| `src/components/lesson/CompactProgress.tsx` | Add requiredCorrect prop, update display |

## Example Walkthrough

For Lecture 2-1 with 89 pages:
1. `requiredCorrect = ceil(89 × 0.80) = 72`
2. Student answers question on page 4 correctly → `questionsCorrect = 1`
3. UI shows: "1/72 correct answers (71 more needed)"
4. Student continues answering questions...
5. When `questionsCorrect` reaches 72 → "🎉 Lecture complete!"
