
# Improve Mock Exam Lecture Topic Selection Clarity

## Problem
Students are confused by the lecture selection interface because:
1. They don't realize that **by default, ALL 15 lectures are included**
2. The button says "Select lectures to include/exclude" which implies they must manually select each one
3. There's no visual feedback showing the current coverage status

## Solution Overview
Make the default behavior crystal clear with visual indicators and better labeling.

## UI Changes

### 1. Add a Clear Default State Indicator
Show a badge or text that explicitly states "All 15 lectures included" when no specific selection is made.

### 2. Update Button Label
Change the button text to be dynamic:
- Default: "All 15 lectures (click to customize)"
- With selections: "3 included, 2 excluded (click to modify)"

### 3. Add Quick Action Buttons
Add "Select All" and "Clear All" buttons for faster bulk operations.

### 4. Add Helper Text
Add a brief explanation below the label: "By default, questions can come from any lecture. Use this to focus on specific topics."

## Visual Design

```text
BEFORE:
┌─────────────────────────────────────────┐
│ Lecture Topics (PDFs)                   │
│ [Select lectures to include/exclude ▼]  │
│                                         │
│ (nothing shown if no selection)         │
└─────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────┐
│ Lecture Topics                          │
│ By default, all 15 lectures are covered │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ All 15 lectures included          │ │
│ │              (click to customize) ▼ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Select All] [Clear Selection]          │
│                                         │
│ (badges shown only when customized)     │
└─────────────────────────────────────────┘
```

## Technical Implementation

### File to Modify
`src/components/MockExamMode.tsx`

### Changes

**1. Add helper variables for display logic (around line 78):**
```tsx
// Calculate selection summary
const totalLectures = LECTURE_TOPICS.length; // 15
const hasCustomSelection = includeTopics.length > 0 || excludeTopics.length > 0;
const effectiveLectures = includeTopics.length > 0 
  ? includeTopics.length 
  : totalLectures - excludeTopics.length;
```

**2. Update the Label section (around line 510-511):**
```tsx
<div className="flex items-center justify-between">
  <Label>Lecture Topics</Label>
  {!hasCustomSelection && (
    <Badge variant="outline" className="text-xs bg-primary/10">
      All {totalLectures} lectures included
    </Badge>
  )}
</div>
<p className="text-xs text-muted-foreground mt-1">
  By default, questions come from all lectures. Customize to focus on specific topics.
</p>
```

**3. Update the Popover button text (around line 515-522):**
```tsx
<Button
  variant="outline"
  role="combobox"
  disabled={isLoadingQuestions}
  className={cn(
    "w-full justify-between",
    !hasCustomSelection && "border-primary/50"
  )}
>
  {hasCustomSelection ? (
    <span>
      {includeTopics.length > 0 && `${includeTopics.length} included`}
      {includeTopics.length > 0 && excludeTopics.length > 0 && ", "}
      {excludeTopics.length > 0 && `${excludeTopics.length} excluded`}
      <span className="text-muted-foreground ml-1">(click to modify)</span>
    </span>
  ) : (
    <span className="flex items-center gap-2">
      <Check className="h-4 w-4 text-primary" />
      All {totalLectures} lectures
      <span className="text-muted-foreground">(click to customize)</span>
    </span>
  )}
  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
</Button>
```

**4. Add Quick Action buttons after the Popover (before the badges display):**
```tsx
{/* Quick actions */}
<div className="flex gap-2">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      setIncludeTopics([...LECTURE_TOPICS]);
      setExcludeTopics([]);
    }}
    disabled={isLoadingQuestions || includeTopics.length === totalLectures}
    className="text-xs"
  >
    Include All
  </Button>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      setIncludeTopics([]);
      setExcludeTopics([]);
    }}
    disabled={isLoadingQuestions || !hasCustomSelection}
    className="text-xs"
  >
    Reset to Default
  </Button>
</div>
```

**5. Update the selected topics display section (around line 571-610):**
Add a visual summary when customized:
```tsx
{hasCustomSelection && (
  <div className="p-3 rounded-lg bg-secondary/50 border">
    <div className="flex items-center gap-2 text-sm">
      <Target className="h-4 w-4 text-primary" />
      <span>
        Exam will cover <strong>{effectiveLectures}</strong> of {totalLectures} lectures
      </span>
    </div>
  </div>
)}
```

## Summary of User Experience Improvements

| Before | After |
|--------|-------|
| Unclear default state | "All 15 lectures included" badge shown by default |
| Confusing button text | Dynamic text showing current selection state |
| No way to quickly reset | "Reset to Default" button available |
| Must click each lecture | "Include All" for bulk selection |
| No coverage summary | Shows "X of 15 lectures" when customized |

This makes it immediately clear that:
- By default, the exam covers ALL lectures (no action needed for full coverage)
- Users only need to customize if they want to focus on specific topics
- The current selection state is always visible
