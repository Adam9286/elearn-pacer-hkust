
# Fix Page Count & Stale Data Issues

## Problems Identified

### Problem 1: Wrong Page Count (18 instead of 89)
The system estimates page count from lecture duration instead of reading actual slide count from the database.

**Current code (wrong)**:
```typescript
// GuidedLearning.tsx
const totalPages = useMemo(
  () => estimateTotalSlides(lesson.estimatedMinutes),  // Returns 18 for 45-minute lecture
  [lesson.estimatedMinutes]
);
```

**Should be**: Query `slide_explanations` table for actual count of approved slides.

### Problem 2: Stale Database Values (4/1)
The `lesson_mastery` table has stale `questions_total` from previous sessions. The current record shows:
- `questions_total = 1` (old incorrect value)
- `questions_correct = 4` (accumulated incorrectly)

---

## Solution Design

### 1. Create a function to fetch actual slide count

Add to `courseApi.ts`:
```typescript
/**
 * Fetch actual slide count from database
 * Counts approved slides for a specific lecture
 */
export async function fetchActualSlideCount(lessonId: string): Promise<number | null> {
  const lectureId = getLectureId(lessonId);
  if (!lectureId) return null;
  
  const { count, error } = await examSupabase
    .from('slide_explanations')
    .select('*', { count: 'exact', head: true })
    .eq('lecture_id', lectureId)
    .eq('status', 'approved');
    
  if (error) {
    console.error('[CourseAPI] Error fetching slide count:', error);
    return null;
  }
  
  return count;
}
```

### 2. Update GuidedLearning to use actual count

Replace the estimate-based approach:
```typescript
// GuidedLearning.tsx

// State for actual page count (loaded from DB)
const [totalPages, setTotalPages] = useState(() => 
  estimateTotalSlides(lesson.estimatedMinutes) // Initial estimate
);

// Fetch actual slide count on mount
useEffect(() => {
  async function loadActualCount() {
    const actualCount = await fetchActualSlideCount(lesson.id);
    if (actualCount && actualCount > 0) {
      console.log('[GuidedLearning] Using actual slide count:', actualCount);
      setTotalPages(actualCount);
    }
  }
  loadActualCount();
}, [lesson.id]);
```

### 3. Fix mastery hook to always sync total

Update `useLessonMastery.ts` to correct stale data:
```typescript
// When questionsTotal is set from parent, update database if different
useEffect(() => {
  if (!userId || !lessonId || state.isLoading) return;
  
  // If DB has different total than what's passed in, update it
  if (state.questionsTotal !== totalFromParent && totalFromParent > 0) {
    // Upsert with correct total
    externalSupabase
      .from('lesson_mastery')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        questions_total: totalFromParent,
        // Keep existing counts but cap them at valid range
        questions_answered: Math.min(state.questionsAnswered, totalFromParent),
        questions_correct: Math.min(state.questionsCorrect, totalFromParent),
      }, { onConflict: 'user_id,lesson_id' });
  }
}, [totalFromParent, state.questionsTotal, state.isLoading]);
```

### 4. Add data validation to prevent impossible states

In `useLessonMastery.ts`, cap counts at `questionsTotal`:
```typescript
// After fetching from DB, validate the data
if (data) {
  const total = data.questions_total || 0;
  setState({
    questionsTotal: total,
    // Cap at valid range
    questionsAnswered: Math.min(data.questions_answered || 0, total),
    questionsCorrect: Math.min(data.questions_correct || 0, total),
    pagesAnswered: (data.pages_answered || []).filter(p => p <= total),
    pagesCorrect: (data.pages_correct || []).filter(p => p <= total),
    ...
  });
}
```

---

## Implementation Order

1. **Add `fetchActualSlideCount` to courseApi.ts** - Query examSupabase for approved slide count
2. **Update GuidedLearning.tsx** - Fetch actual count on mount, use state instead of useMemo
3. **Update useLessonMastery.ts** - Add data validation and sync logic
4. **Test with lecture 2-1** - Should show X/72 (where 72 = ceil(89 * 0.8))

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/services/courseApi.ts` | Add `fetchActualSlideCount()` function |
| `src/components/lesson/GuidedLearning.tsx` | Replace static estimate with async fetch, state for totalPages |
| `src/hooks/useLessonMastery.ts` | Add validation, sync stale data, cap impossible values |

### Database Query (for reference)
The query to get actual slide count for lecture 2-1:
```sql
SELECT COUNT(*) FROM slide_explanations 
WHERE lecture_id = '05-Transport_Model' 
AND status = 'approved';
```

### Expected Result After Fix
For Lecture 2-1 with 89 approved slides:
- `totalPages = 89`
- `requiredCorrect = ceil(89 * 0.8) = 72`
- Display: "0/72 correct (72 more needed)"

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| No approved slides yet | Fall back to estimate |
| Stale counts exceed total | Cap at valid range |
| Network error fetching count | Use estimate as fallback |
| User has 4/1 corrupted data | Auto-correct on next load |
