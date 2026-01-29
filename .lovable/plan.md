
# PDF Viewer Enhancement Plan

## Problem Analysis

From the screenshot, I can see two issues:

1. **PDF iframe height is limited**: Currently `lg:h-[500px]` which feels cramped when the sidebar is hidden and there's more vertical space available
2. **No page jump feature**: Users must click Previous/Next repeatedly to navigate - no way to jump directly to page 7 or 12

---

## Proposed Solutions

### 1. Make PDF Iframe Bigger

**Current constraint:** `lg:h-[500px]` in PdfViewer.tsx (line 61)

**Proposed change:** Increase to `lg:h-[600px]` or even `lg:h-[calc(100vh-200px)]` for dynamic height based on viewport.

| Option | Height | Pros | Cons |
|--------|--------|------|------|
| Fixed 600px | `lg:h-[600px]` | Simple, predictable | May still feel small on large screens |
| Fixed 700px | `lg:h-[700px]` | More content visible | Could push content below fold on smaller screens |
| Dynamic | `lg:h-[calc(100vh-220px)]` | Uses available space | Scrolling behavior changes |

**Recommended:** `lg:h-[650px]` - a good balance for most screens

---

### 2. Add Page Jump Dropdown

Transform the "Page X of Y" indicator into a clickable dropdown that lets users jump directly to any page.

**Location:** PageNavigation.tsx - the center section

**UI Design:**
```text
[< Prev]   [Page ▼ 3 ] of 18   [Next >]
                |
                v
           +---------+
           | Page 1  |
           | Page 2  |
           | Page 3 ✓|
           | Page 4  |
           | ...     |
           +---------+
```

**Implementation:**
- Use Radix Select component (already available: `@radix-ui/react-select`)
- Generate options for all pages 1 to totalPages
- On selection, call a new `onPageJump(pageNumber)` callback
- Style to match existing muted/ghost aesthetic

---

## Technical Changes

### File: src/components/lesson/PdfViewer.tsx

| Line | Current | New |
|------|---------|-----|
| 61 | `lg:h-[500px]` | `lg:h-[650px]` |

### File: src/components/lesson/PageNavigation.tsx

| Change | Description |
|--------|-------------|
| Add `onPageJump` prop | New callback: `(page: number) => void` |
| Import Select component | From `@/components/ui/select` |
| Replace static text | Convert "Page X of Y" to a Select dropdown |
| Generate page options | Map 1 to totalPages into Select options |

**New PageNavigation interface:**
```typescript
interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onPageJump: (page: number) => void;  // NEW
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading: boolean;
}
```

### File: src/components/lesson/GuidedLearning.tsx

| Change | Description |
|--------|-------------|
| Add `handlePageJump` handler | New function to handle direct page navigation |
| Pass to PageNavigation | Add `onPageJump={handlePageJump}` prop |

**Handler logic:**
```typescript
const handlePageJump = useCallback((targetPage: number) => {
  if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
    // Mark current page as completed if moving forward
    if (targetPage > currentPage) {
      setSlides(prev => prev.map(slide => 
        slide.slideNumber === currentPage 
          ? { ...slide, status: 'completed' as const }
          : slide
      ));
    }
    setCurrentPage(targetPage);
  }
}, [currentPage, totalPages]);
```

---

## Visual Mockup

### Before (current):
```text
[< Prev Page]      Page 3 of 18      [Next Page >]
```

### After (with dropdown):
```text
[< Prev Page]   Page [▼ 3] of 18    [Next Page >]
                     ↓ click
              +-------------+
              | 1           |
              | 2           |
              | 3 ✓         |
              | 4           |
              | 5           |
              | ...         |
              | 18          |
              +-------------+
```

---

## Files to Modify

1. **src/components/lesson/PdfViewer.tsx** - Increase iframe height
2. **src/components/lesson/PageNavigation.tsx** - Add Select dropdown for page jump
3. **src/components/lesson/GuidedLearning.tsx** - Add handlePageJump handler and pass to navigation

---

## Summary

| Enhancement | Implementation |
|-------------|----------------|
| Bigger PDF | Change `lg:h-[500px]` to `lg:h-[650px]` |
| Page jump | Add Select dropdown in PageNavigation center, wire up through GuidedLearning |

This is a minimal change (3 files) that significantly improves navigation UX.
