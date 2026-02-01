
# Fix "Skip Ahead" Not Working

## Problem Identified

The "Skip ahead →" button in CourseMode.tsx navigates to the lesson page, but **Lesson.tsx has a guard clause that immediately kicks users back** if the chapter is locked.

```
Flow:
1. User clicks "Skip ahead →" on Section 3
2. Navigation: /platform/lesson/3-1
3. Lesson.tsx loads → checks isChapterUnlocked(3) → returns FALSE
4. Guard triggers → toast error → redirects back to /platform
5. User is back where they started
```

## The Fix

Remove the `chapterLocked` guard from `Lesson.tsx` since we've decided to make progression **recommended, not required**.

### Changes to `src/pages/Lesson.tsx`

**Delete lines 38-45** (the guard clause):
```typescript
// DELETE THIS ENTIRE BLOCK:
const chapterLocked = currentChapter && !loading ? !isChapterUnlocked(currentChapter.id) : false;

useEffect(() => {
  if (!loading && chapterLocked && currentChapter) {
    toast.error(`Section ${currentChapter.id} is locked. Complete the previous section first.`);
    navigate("/platform", { state: { mode: "course" } });
  }
}, [loading, chapterLocked, currentChapter, navigate]);
```

**Why this is safe:**
- The "Recommended Path" messaging in CourseMode still encourages sequential learning
- Progress tracking still works correctly
- Mastery system remains intact
- Students who need to cram can access any section

## Summary

| File | Change |
|------|--------|
| `src/pages/Lesson.tsx` | Remove the `chapterLocked` check and redirect effect (lines 38-45) |

## Expected Behavior After Fix

1. User clicks "Skip ahead →" on locked Section 3
2. Navigation to `/platform/lesson/3-1`
3. Lesson page loads successfully with AI Tutor
4. User can study the content freely
5. Progress is tracked normally
