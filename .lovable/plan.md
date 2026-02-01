

# In-Context Help + Retry Logic Fix

## Part 1: In-Context Micro-Help (Not a Manual)

Instead of building a documentation page, we'll add contextual help WHERE users get confused.

### 1.1 CompactProgress.tsx - Explain "5/72" on First View

Add an info icon with tooltip next to the mastery count that explains the 80% requirement.

**Changes:**
```typescript
// Add imports
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

// Wrap the "5/72 correct" display with tooltip
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button className="inline-flex items-center gap-1">
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[250px] text-center">
      <p className="text-sm">
        Answer 80% of the questions correctly to master this lecture.
        <br />
        <span className="text-muted-foreground text-xs">
          ({requiredCorrect} out of {totalPages} total pages)
        </span>
      </p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Why 80%?** Students will see this the first time they're confused. One hover = understanding. No manual needed.

---

### 1.2 DeepThinkToggle.tsx - Better Mode Descriptions

The current descriptions are too vague:
- "Fast, adaptive responses" - what does this mean?
- "Extended textbook knowledge" - still unclear

**Update the dropdown descriptions:**

| Mode | Current | New |
|------|---------|-----|
| **Auto** | "Fast, adaptive responses" | "Quick answers (2-5s) for simple questions" |
| **DeepThink** | "Extended textbook knowledge" | "Thorough answers (10-20s) with textbook citations" |

**Code changes (lines 51-68):**
```typescript
<SelectItem value="auto">
  <div className="flex items-center gap-3 py-1">
    <Zap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    <div className="flex flex-col">
      <span className="font-medium">Auto</span>
      <span className="text-xs text-muted-foreground">Quick answers (2-5s) for simple questions</span>
    </div>
  </div>
</SelectItem>
<SelectItem value="deepthink">
  <div className="flex items-center gap-3 py-1">
    <Brain className="w-4 h-4 text-primary flex-shrink-0" />
    <div className="flex flex-col">
      <span className="font-medium text-primary">DeepThink</span>
      <span className="text-xs text-muted-foreground">Thorough answers (10-20s) with textbook citations</span>
    </div>
  </div>
</SelectItem>
```

---

### 1.3 ChatConversation.tsx - Attachment Tooltip for Logged-Out Users

Currently the attachment button is just disabled. Add a tooltip explaining WHY.

**Code (around line 550-560, attachment button area):**
```typescript
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={!isAuthenticated}
        className="h-8 w-8"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {isAuthenticated 
        ? "Attach files (PDF, images, text)"
        : "Sign in to upload files"
      }
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### 1.4 TestYourselfCard.tsx - First-Time Hint (localStorage-based)

On the FIRST "Test Yourself" card a user ever sees, show a small hint below the question explaining the purpose. After they answer once, store in localStorage to never show again.

**Add to TestYourselfCard:**
```typescript
const [hasSeenTip, setHasSeenTip] = useState(() => {
  return localStorage.getItem('testyourself-tip-dismissed') === 'true';
});

const dismissTip = () => {
  localStorage.setItem('testyourself-tip-dismissed', 'true');
  setHasSeenTip(true);
};

// In the expandable content, before the question:
{!hasSeenTip && (
  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
    <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
    <div className="flex-1 text-sm text-muted-foreground">
      <p>Answer questions to track your mastery. You need 80% correct to complete this lecture.</p>
    </div>
    <button onClick={dismissTip} className="text-muted-foreground hover:text-foreground">
      <X className="h-4 w-4" />
    </button>
  </div>
)}
```

---

## Part 2: Fix the Retry Paradox

### The Problem (from screenshot)

When a student answers wrong:
1. Their wrong answer (A) is highlighted red with ✗
2. The CORRECT answer (B) is highlighted GREEN with ✓
3. The full explanation is shown
4. Then it says "Try Again"

**This defeats the purpose.** They already KNOW B is correct. Clicking "Try Again" is just clicking B for a free point.

### The Solution: Hide Answer Until Correct or Exhausted

**New UX Flow:**

| Attempt | Student gets WRONG | Student gets CORRECT |
|---------|-------------------|---------------------|
| 1st | Red highlight on their choice. Hint: "Not quite - think about the transport layer's main purpose." NO green reveal. Retry button. | Green highlight. Full explanation. Mastery credit. |
| 2nd | Same as above. "Still not right - consider what distinguishes layers." Retry button. | Same as above. |
| 3rd (final) | Red highlight + GREEN reveal + full explanation. "Here's the correct answer. Review and move on." No more retries. | Same as above. |

**This is real learning.** Struggle → insight → reward.

### Code Changes (TestYourselfCard.tsx)

**1. Don't show correct answer highlighting on wrong attempts (lines 196-201):**

```typescript
// BEFORE (shows correct answer on any wrong)
hasSubmitted && isThisCorrect && "border-green-500 bg-green-500/10",
hasSubmitted && isSelected && !isThisCorrect && "border-red-500 bg-red-500/10"

// AFTER (only show correct if user got it right OR exhausted attempts)
const showCorrectAnswer = hasSubmitted && (isCorrect || attemptCount >= MAX_ATTEMPTS);

// In className:
showCorrectAnswer && isThisCorrect && "border-green-500 bg-green-500/10",
hasSubmitted && isSelected && !isThisCorrect && "border-red-500 bg-red-500/10"
```

**2. Don't show green checkmark until earned (lines 211-213):**

```typescript
// BEFORE
{hasSubmitted && isThisCorrect && (
  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
)}

// AFTER
{showCorrectAnswer && isThisCorrect && (
  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
)}
```

**3. Different feedback messages based on state (lines 234-247):**

```typescript
{hasSubmitted && (
  <div className="space-y-3">
    {isCorrect ? (
      // Correct answer - show full explanation
      <div className="rounded-lg p-4 bg-green-500/10">
        <p className="font-medium mb-2 text-green-700 dark:text-green-400">
          Great job!
        </p>
        <p className="text-sm text-muted-foreground">
          {question.explanation}
        </p>
      </div>
    ) : attemptCount >= MAX_ATTEMPTS ? (
      // Exhausted attempts - reveal answer and explanation
      <div className="rounded-lg p-4 bg-amber-500/10">
        <p className="font-medium mb-2 text-amber-700 dark:text-amber-400">
          Here's the correct answer
        </p>
        <p className="text-sm text-muted-foreground">
          {question.explanation}
        </p>
        <p className="text-sm text-muted-foreground mt-2 italic">
          Review this explanation and continue to the next page.
        </p>
      </div>
    ) : (
      // Wrong but has retries - show hint only, NOT the answer
      <div className="rounded-lg p-4 bg-amber-500/10">
        <p className="font-medium mb-2 text-amber-700 dark:text-amber-400">
          Not quite right
        </p>
        <p className="text-sm text-muted-foreground">
          {attemptCount === 1 
            ? "Think about what makes this layer unique in the network stack."
            : "Consider the key responsibility that differentiates this from other layers."
          }
        </p>
      </div>
    )}
    
    {/* Retry button - only if wrong AND has attempts left */}
    {!isCorrect && attemptCount < MAX_ATTEMPTS && (
      <Button variant="outline" onClick={handleRetry} className="w-full">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again ({MAX_ATTEMPTS - attemptCount} {MAX_ATTEMPTS - attemptCount === 1 ? 'attempt' : 'attempts'} left)
      </Button>
    )}
  </div>
)}
```

**4. Smarter hints (optional enhancement):**

Instead of hardcoded generic hints, we could add a `hint` field to the question schema. But for now, generic hints are fine - they don't reveal the answer.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/lesson/CompactProgress.tsx` | Add tooltip explaining 80% mastery requirement |
| `src/components/chat/DeepThinkToggle.tsx` | Clearer mode descriptions with response times |
| `src/components/chat/ChatConversation.tsx` | Tooltip for disabled attachment button |
| `src/components/lesson/TestYourselfCard.tsx` | 1. First-time tip (localStorage). 2. Hide correct answer until earned/exhausted. 3. Show hints instead of explanations on wrong attempts. |

---

## Expected Outcomes

1. **No confused users** - every "huh?" moment has an in-context explanation
2. **No documentation page** - the app teaches itself
3. **Real learning from retries** - students must THINK, not just click the green answer
4. **Mastery integrity preserved** - can't game the 80% by brute-forcing

---

## Technical Notes

- CompactProgress needs to receive `totalPages` as a prop (it currently has `requiredCorrect`, so we need to also pass total for the tooltip math)
- TestYourselfCard localStorage key: `testyourself-tip-dismissed`
- No database changes needed
- All changes are UI/UX only

