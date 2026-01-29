

# Course Mode Width Optimization Plan

## Problem Analysis

The current layout has **three levels of nesting** that reduce available content width:

1. **Page container**: `container` class with max-width constraints
2. **Sidebar + Main**: `grid-cols-4` (sidebar 1, main 3) = main gets 75% of container
3. **PDF + Explanation**: `grid-cols-2` inside main = each gets 37.5% of container

Result: Each panel ends up ~300-400px wide, causing excessive vertical scrolling.

## Proposed Solution: Collapsible Sidebar + Full-Width Layout

### Option A: Hide sidebar by default in AI Tutor tab
When user switches to "AI Tutor" tab, automatically collapse the sidebar to maximize horizontal space. Keep sidebar visible in "Overview" tab.

### Option B: Floating/overlay sidebar
Convert sidebar to a slide-out drawer that overlays content when opened, giving AI Tutor the full 4/4 grid width.

### Option C: Remove sidebar entirely in AI Tutor mode
The sidebar shows section lessons, but once in AI Tutor, users focus on single-lesson learning. Remove sidebar completely when in AI Tutor tab.

**Recommended: Option A** - Conditional sidebar visibility based on active tab

---

## Implementation Details

### Changes to Lesson.tsx

1. Track the active tab state at page level (currently `defaultValue="ai-tutor"`)
2. Conditionally render sidebar based on active tab
3. Adjust grid columns: 
   - Overview tab: `lg:grid-cols-4` (with sidebar)
   - AI Tutor tab: single column, full width (no sidebar)

```
Before:  [Sidebar 1/4] | [Main 3/4 → PDF 50% | Explanation 50%]
After:   [Full Width → PDF 50% | Explanation 50%]
```

### Changes to GuidedLearning.tsx

Increase the grid gap and adjust sticky positioning for better spacing.

---

## Technical Changes

### File: src/pages/Lesson.tsx

| Change | Description |
|--------|-------------|
| Add `activeTab` state | Track which tab is selected |
| Conditional sidebar | Hide sidebar when `activeTab === "ai-tutor"` |
| Dynamic grid | `lg:grid-cols-1` for AI Tutor, `lg:grid-cols-4` for Overview |
| Full-width main | When sidebar hidden, main content gets 100% width |

### File: src/components/lesson/GuidedLearning.tsx

| Change | Description |
|--------|-------------|
| Optional: Increase gap | Change `gap-6` to `gap-8` for more breathing room |
| Sticky top adjustment | Update `lg:top-4` to account for new layout |

---

## Visual Comparison

### Current Layout (cramped)
```
+------------------+----------------------------------------+
| Sidebar (25%)    | Main Content (75%)                     |
| Section Lessons  | +----------------+--------------------+ |
|                  | | PDF (37.5%)    | Explanation (37.5%)| |
|                  | |                |                    | |
|                  | +----------------+--------------------+ |
+------------------+----------------------------------------+
```

### Proposed Layout (AI Tutor tab)
```
+----------------------------------------------------------------+
| Full Width Main Content (100%)                                  |
| +-----------------------------+-------------------------------+ |
| | PDF (50%)                   | Explanation (50%)             | |
| |                             |                               | |
| +-----------------------------+-------------------------------+ |
+----------------------------------------------------------------+
```

---

## Summary

- **Sidebar hidden in AI Tutor tab** - Gives 33% more horizontal space
- **Full-width grid** - PDF and explanation each get 50% of screen width
- **Sidebar remains for Overview tab** - Navigation still available when browsing lesson summaries

This is a minimal-change approach: only Lesson.tsx needs modification, GuidedLearning.tsx stays mostly the same.

