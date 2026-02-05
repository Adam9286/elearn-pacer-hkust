

# Replace Lecture Topic Dropdown with 2-Column Checkbox Grid

## Problem
The current dropdown/popover interface requires users to:
1. Click to open the popover
2. Scroll through a list to find lectures
3. Click each lecture one-by-one (with confusing include/exclude toggle states)

This is cumbersome and not intuitive for selecting multiple lectures.

## Solution
Replace the entire popover-based selection with a visible 2-column grid of checkboxes. All 15 lectures will be displayed at once, and users can simply check/uncheck to include them.

## New Design

```text
┌─────────────────────────────────────────────────────────────┐
│ Lecture Topics                    [Select All] [Clear All] │
│ Check the lectures you want to include in your exam        │
│                                                             │
│ ┌─────────────────────────────┬─────────────────────────────┐
│ │ ☑ Lecture 1: Introduction  │ ☑ Lecture 9: Network Layer  │
│ │ ☑ Lecture 2: Physical Layer│ ☑ Lecture 10: Transport UDP │
│ │ ☑ Lecture 3: Transmission  │ ☑ Lecture 11: Transport TCP │
│ │ ☑ Lecture 4: Error Detect  │ ☑ Lecture 12: HTTP          │
│ │ ☑ Lecture 5: Multiple Acc  │ ☑ Lecture 13: DNS           │
│ │ ☑ Lecture 6: Switched LANs │ ☑ Lecture 14: Email         │
│ │ ☑ Lecture 7: Network Over  │ ☑ Lecture 15: Security      │
│ │ ☑ Lecture 8: Routing Alg   │                             │
│ └─────────────────────────────┴─────────────────────────────┘
│                                                             │
│ ✓ 15 of 15 lectures selected                               │
└─────────────────────────────────────────────────────────────┘
```

## Simplified Logic

**Current (complex):** Include/exclude toggle with 3 states per lecture
**New (simple):** Binary selected/unselected with checkboxes

- By default: All lectures are selected (all checkboxes checked)
- User unchecks lectures they want to exclude
- Simple "Select All" / "Clear All" buttons for bulk actions

## Technical Implementation

### File to Modify
`src/components/MockExamMode.tsx`

### Changes

**1. Simplify state management (lines 76-77):**

Replace include/exclude logic with a single "selected" array:
```tsx
// Old:
const [includeTopics, setIncludeTopics] = useState<string[]>([]);
const [excludeTopics, setExcludeTopics] = useState<string[]>([]);

// New: All lectures selected by default
const [selectedTopics, setSelectedTopics] = useState<string[]>([...LECTURE_TOPICS]);
```

**2. Update helper variables (lines 79-84):**
```tsx
const totalLectures = LECTURE_TOPICS.length;
const selectedCount = selectedTopics.length;
const allSelected = selectedCount === totalLectures;
const noneSelected = selectedCount === 0;
```

**3. Replace the Popover section (lines 515-684) with a 2-column checkbox grid:**
```tsx
{/* Lecture Selection Section */}
<div className="space-y-3 pt-2 border-t">
  <div className="flex items-center justify-between">
    <h4 className="font-semibold text-sm">Lecture Topics</h4>
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSelectedTopics([...LECTURE_TOPICS])}
        disabled={isLoadingQuestions || allSelected}
        className="text-xs h-7"
      >
        Select All
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSelectedTopics([])}
        disabled={isLoadingQuestions || noneSelected}
        className="text-xs h-7"
      >
        Clear All
      </Button>
    </div>
  </div>
  <p className="text-xs text-muted-foreground">
    Check the lectures you want to include in your exam.
  </p>

  {/* 2-Column Checkbox Grid */}
  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-background/50">
    {LECTURE_TOPICS.map((lecture) => {
      const isSelected = selectedTopics.includes(lecture);
      // Extract short name: "Lecture 1: Introduction..." -> "L1: Introduction..."
      const shortName = lecture.replace(/Lecture (\d+):/, 'L$1:');
      
      return (
        <label
          key={lecture}
          className={cn(
            "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm",
            "hover:bg-secondary/50",
            isSelected && "bg-primary/10",
            isLoadingQuestions && "opacity-50 cursor-not-allowed"
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedTopics([...selectedTopics, lecture]);
              } else {
                setSelectedTopics(selectedTopics.filter(t => t !== lecture));
              }
            }}
            disabled={isLoadingQuestions}
          />
          <span className={cn(
            "truncate",
            !isSelected && "text-muted-foreground"
          )}>
            {shortName}
          </span>
        </label>
      );
    })}
  </div>

  {/* Selection summary */}
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Target className="h-4 w-4" />
    <span>
      {allSelected ? (
        <span className="text-primary font-medium">All {totalLectures} lectures selected</span>
      ) : noneSelected ? (
        <span className="text-destructive">No lectures selected - please select at least one</span>
      ) : (
        <span><strong>{selectedCount}</strong> of {totalLectures} lectures selected</span>
      )}
    </span>
  </div>
</div>
```

**4. Add Checkbox import (line 1):**
```tsx
import { Checkbox } from "@/components/ui/checkbox";
```

**5. Remove unused imports:**
Remove `Popover`, `PopoverContent`, `PopoverTrigger`, `Command`, `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList`, `ChevronsUpDown` if no longer used elsewhere.

**6. Update the API call (around line 180-200):**

Map `selectedTopics` to the `includeTopics` array sent to the backend:
```tsx
// When sending to backend:
const includeTopics = selectedTopics.length === totalLectures 
  ? [] // Empty means "all lectures" 
  : selectedTopics;

// In the fetch body:
body: JSON.stringify({
  topic: courseName,
  numMultipleChoice: parseInt(numMCQ),
  numOpenEnded: parseInt(numOpenEnded),
  difficulty,
  includeTopics,
  excludeTopics: [], // No longer used
  sessionId: `exam-${Date.now()}`,
})
```

**7. Add validation before generating:**
```tsx
if (selectedTopics.length === 0) {
  toast({
    title: "No lectures selected",
    description: "Please select at least one lecture to generate an exam.",
    variant: "destructive",
  });
  return;
}
```

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Visibility | Hidden in dropdown | All 15 lectures visible |
| Interaction | Click dropdown → search → click item | Direct checkbox click |
| States per lecture | 3 (default/include/exclude) | 2 (selected/unselected) |
| Default behavior | All included (confusing) | All checked (clear) |
| Bulk actions | Hidden in dropdown | Visible "Select All / Clear All" buttons |
| Layout | Single column list in popover | 2-column grid, always visible |

This is much clearer and faster for students to use!

