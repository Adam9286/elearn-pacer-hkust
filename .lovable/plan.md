
# Fix Question Tracking & Add Retry Functionality

## Problems Identified

### Bug 1: Same Question Gives Multiple Credits
**Root Cause**: The system tracks only aggregate counts (`questionsAnswered`, `questionsCorrect`) without remembering which pages have been answered. When a user answers a question, navigates away, and returns, they can answer the same question again and get credit multiple times.

**Evidence**: Screenshot shows "2/1 correct" meaning the user answered the same question twice and got 2 correct credits.

### Bug 2: `requiredCorrect` Shows Wrong Value
The display shows "2/1 correct" suggesting `requiredCorrect = 1`. But for 18 pages, it should be `ceil(18 × 0.8) = 15`. This means `questionsTotal` in the database has a stale value of 1 from an earlier session.

### Bug 3: No Retry for Wrong Answers
When users get a question wrong, they see the explanation but cannot try again. They're stuck with a wrong answer permanently.

---

## Solution Design

### 1. Track Answered Pages (Prevent Double-Credit)

Add a Set to track which page numbers have been answered in this session, and persist to database.

**In `useLessonMastery.ts`:**
- Add `answeredPages: Set<number>` to state
- Add `pagesAnswered: number[]` column to database (or use existing - need to check)
- Before recording an answer, check if page was already answered:
  - If first attempt on this page → record to counts
  - If retry attempt → don't increment counts, just allow retry

**In `GuidedLearning.tsx`:**
- Pass `currentPage` to mastery hook when recording
- Check if page already answered before crediting

**In `TestYourselfCard.tsx`:**
- Add new prop `hasBeenAnswered: boolean` to know if this page was already answered
- If already answered, show previous answer state on mount

### 2. Fix Database Sync for `questionsTotal`

The issue is `questionsTotal` in database may have old values. The `upsert` should always update it.

**Current code** (line 122-133 in useLessonMastery.ts):
```typescript
.upsert({
  questions_total: state.questionsTotal,  // May be stale
  ...
})
```

**Fix**: Always update `questions_total` on upsert AND ensure it's set correctly on initial load.

### 3. Add Retry for Wrong Answers

**In `TestYourselfCard.tsx`:**
- When user gets answer wrong, show explanation + "Try Again" button
- "Try Again" resets `hasSubmitted`, `selectedOption`, `isCorrect`
- Retry attempts don't increment `questionsAnswered` (already counted)
- Only first correct answer increments `questionsCorrect`

---

## Implementation Details

### Database Schema Change

Add column to track which pages have been answered:
```sql
ALTER TABLE lesson_mastery 
ADD COLUMN pages_answered INTEGER[] DEFAULT '{}';
```

This stores page numbers that have been answered (e.g., `[2, 4, 8, 12]`).

### File: `src/hooks/useLessonMastery.ts`

**New State:**
```typescript
interface LessonMasteryState {
  questionsTotal: number;
  questionsAnswered: number;
  questionsCorrect: number;
  pagesAnswered: number[];     // NEW: Track which pages have been answered
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**New Methods:**
```typescript
// Check if a specific page has already been answered
hasAnsweredPage: (pageNumber: number) => boolean;

// Record answer with page tracking
recordAnswer: (pageNumber: number, isCorrect: boolean, isRetry: boolean) => Promise<void>;
```

**Updated Logic:**
```typescript
const recordAnswer = useCallback(async (pageNumber: number, isCorrect: boolean, isRetry: boolean) => {
  // If it's a retry, don't increment questionsAnswered
  // Only increment questionsCorrect if it's a retry that got it right after getting it wrong
  
  if (state.pagesAnswered.includes(pageNumber)) {
    // This is a retry - only update if they got it correct this time
    if (isCorrect && !isRetry) {
      // Already answered correctly before - no change
      return;
    }
    // If isRetry=true and isCorrect=true, update correct count
  } else {
    // First attempt on this page
    // Add to pagesAnswered, increment questionsAnswered
    // If correct, increment questionsCorrect
  }
});
```

### File: `src/components/lesson/GuidedLearning.tsx`

**Update handleQuestionAnswer:**
```typescript
const handleQuestionAnswer = useCallback(async (correct: boolean, isRetry: boolean = false) => {
  await recordAnswer(currentPage, correct, isRetry);
  // ... rest of completion logic
}, [...]);
```

**Pass to TestYourselfCard:**
```typescript
<TestYourselfCard
  question={currentSlideData.comprehensionQuestion}
  pageNumber={currentPage}
  hasBeenAnswered={hasAnsweredPage(currentPage)}
  onAnswer={(correct, isRetry) => handleQuestionAnswer(correct, isRetry)}
/>
```

### File: `src/components/lesson/TestYourselfCard.tsx`

**New Props:**
```typescript
interface TestYourselfCardProps {
  question: ComprehensionQuestion | null;
  pageNumber: number;
  hasBeenAnswered?: boolean;       // NEW: Whether this page was already answered
  previouslyCorrect?: boolean;     // NEW: Whether previous answer was correct
  onAnswer: (correct: boolean, isRetry: boolean) => void;  // UPDATED: Add isRetry flag
  className?: string;
}
```

**Add Retry Button:**
```typescript
// After showing explanation for wrong answer:
{hasSubmitted && !isCorrect && (
  <Button 
    variant="outline"
    onClick={handleRetry}
    className="w-full mt-3"
  >
    <RefreshCw className="mr-2 h-4 w-4" />
    Try Again
  </Button>
)}

const handleRetry = () => {
  setSelectedOption(null);
  setHasSubmitted(false);
  setIsCorrect(false);
  // isRetry flag will be true on next submit
};
```

---

## Flow Diagram

```text
┌────────────────────────────────────────────────────────────────┐
│ User answers question on Page 4                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Is Page 4 in pagesAnswered[]?                                │
│       │                                                        │
│       ├─ NO (First attempt)                                   │
│       │     ├─ Add 4 to pagesAnswered[]                       │
│       │     ├─ questionsAnswered++                            │
│       │     └─ If correct: questionsCorrect++                 │
│       │                                                        │
│       └─ YES (Already answered before)                        │
│             ├─ Was previous answer correct?                   │
│             │     ├─ YES: No change (can't double-credit)     │
│             │     └─ NO: If now correct, questionsCorrect++   │
│             └─ Don't increment questionsAnswered              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## UI Changes Summary

| State | What User Sees |
|-------|----------------|
| Not answered yet | Question card, "Check Answer" button |
| Answered correctly | Green feedback, "Correct!", card stays green |
| Answered wrong | Amber feedback, explanation, "Try Again" button |
| Retry (after wrong) | Question card resets, can select new answer |
| Retry correct | Green feedback, count updates, "Try Again" hidden |
| Already correct (revisit) | Card shows "Already answered correctly" |

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database** | Add `pages_answered` column |
| `src/hooks/useLessonMastery.ts` | Track pages, prevent double-credit, new API |
| `src/components/lesson/GuidedLearning.tsx` | Pass page number, handle retry flag |
| `src/components/lesson/TestYourselfCard.tsx` | Add retry button, handle already-answered state |

---

## Expected Result

- Each page can only give credit ONCE
- "2/1 correct" bug impossible - counts are bounded by pages answered
- Wrong answers can be retried until correct
- Progress persists correctly across sessions
- Clear UI feedback for all states
