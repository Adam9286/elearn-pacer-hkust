
# Expand AI Tutor Layout to Use Full Screen Width

## Problem Analysis
Looking at your screenshot, the PDF viewer is constrained by multiple nested containers:
- Tailwind `container` class limits content to 1400px max-width
- 2rem padding on each side (-64px)
- Card component adds additional padding
- 50/50 grid split gives PDF only ~50% of available space

This results in a PDF that's only ~400-500px wide, causing multiple slides to be visible at once instead of focusing on one slide.

## Solution: Full-Width Layout for AI Tutor Mode

When in AI Tutor mode, we'll break out of the container constraints to maximize the learning experience.

### Changes

**1. Lesson.tsx - Remove container constraint in AI Tutor mode**

Currently:
```tsx
<div className={`container grid grid-cols-1 ${showSidebar ? 'lg:grid-cols-4' : ''} gap-6 p-6`}>
```

Change to conditional full-width in AI Tutor mode:
```tsx
<div className={`${showSidebar ? 'container' : 'w-full max-w-[1800px] mx-auto'} grid grid-cols-1 ${showSidebar ? 'lg:grid-cols-4' : ''} gap-6 p-6`}>
```

**2. Remove Card wrapper around AI Tutor content**

The Card adds unnecessary nesting and padding. In AI Tutor mode, render GuidedLearning directly without the Card/Tabs wrapper overhead.

**3. PdfViewer.tsx - Increase height**

Change from:
```tsx
<div className="aspect-[4/3] lg:aspect-auto lg:h-[650px] ...">
```

To:
```tsx
<div className="aspect-[4/3] lg:aspect-auto lg:h-[75vh] min-h-[600px] max-h-[850px] ...">
```

This makes the PDF responsive to screen height while maintaining reasonable bounds.

**4. GuidedLearning.tsx - Adjust grid ratio**

Change from equal 50/50 split:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
```

To 55/45 favoring PDF:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
```

---

## Visual Impact

| Before | After |
|--------|-------|
| Container: 1400px max | Container: 1800px max |
| PDF width: ~400px | PDF width: ~600-700px |
| Multiple slides visible | Single slide focused |
| Wasted dark margins | Content fills screen |

---

## Technical Details

### File: `src/pages/Lesson.tsx`

**Line 118** - Make container wider in AI Tutor mode:
```tsx
// Before
<div className={`container grid grid-cols-1 ${showSidebar ? 'lg:grid-cols-4' : ''} gap-6 p-6`}>

// After  
<div className={`${showSidebar ? 'container' : 'w-full max-w-[1800px] mx-auto px-4 lg:px-8'} grid grid-cols-1 ${showSidebar ? 'lg:grid-cols-4' : ''} gap-6 py-6`}>
```

**Lines 197-269** - Simplify AI Tutor rendering by reducing Card nesting:
```tsx
{activeTab === "ai-tutor" ? (
  <GuidedLearning 
    lesson={currentLesson} 
    chapter={currentChapter}
    onComplete={handleMarkComplete}
  />
) : (
  <Card className="glass-card">
    {/* Overview tab content with Tabs wrapper */}
  </Card>
)}
```

### File: `src/components/lesson/PdfViewer.tsx`

**Line 45** - Increase iframe height:
```tsx
// Before
<div className="aspect-[4/3] lg:aspect-auto lg:h-[650px] rounded-b-lg overflow-hidden border bg-muted">

// After
<div className="aspect-[4/3] lg:aspect-auto lg:h-[75vh] lg:min-h-[600px] lg:max-h-[850px] rounded-b-lg overflow-hidden border bg-muted">
```

### File: `src/components/lesson/GuidedLearning.tsx`

**Line 242** - Favor PDF in grid split:
```tsx
// Before
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

// After
<div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
```

---

## Expected Result

After these changes:
- PDF viewer will be approximately 55% of a much wider container (~700-800px)
- Single slide will be prominently displayed
- Dark margins reduced significantly
- Better focus for students on the current slide content

