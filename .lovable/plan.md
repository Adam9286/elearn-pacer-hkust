
# Comprehensive UX Overhaul Plan

## Overview
This plan addresses all issues identified in the brutal critique: landing page filler, technical jargon overload, Chat Mode inefficiencies, Course Mode gating friction, Mock Exam fake progress, and missing retry limits.

---

## Part 1: Landing Page - Student-Centric Rewrite

### Problem
Landing page talks TO engineers, not TO students. Students don't care about "RAG Architecture" or "pgvector embeddings" - they care about passing ELEC3120.

### Changes

#### 1.1 Hero.tsx - Simplify Stats
**Current** (line 175-191):
```typescript
{ label: "Learning Modes", value: "3" },
{ label: "AI-Powered", value: "100%" },  // Meaningless
{ label: "Topics Covered", value: "50+" },
```

**New** (student-focused outcomes):
```typescript
{ label: "Cites Sources", value: "Always" },
{ label: "ELEC3120 Aligned", value: "100%" },
{ label: "Exam Topics", value: "50+" },
```

#### 1.2 PlatformIntro.tsx - Remove Technical Jargon
**Current** (line 11-16):
```typescript
{ icon: Brain, text: "RAG Architecture prevents hallucinations" },
{ icon: Zap, text: "Real-time semantic search with vector embeddings" },
{ icon: Lock, text: "Source-cited answers from verified materials" },
{ icon: Target, text: "Gated learning paths for structured progression" },
```

**New** (student language):
```typescript
{ icon: Brain, text: "Every answer cites Prof. Meng's lecture slides" },
{ icon: Zap, text: "Ask anything about ELEC3120, get instant answers" },
{ icon: Lock, text: "Only uses your course materials - no hallucinations" },
{ icon: Target, text: "Practice with real exam-style questions" },
```

**Also remove** (line 155-161):
- The floating "vector_search()" code snippet - meaningless to students

**Change section title** (line 170-173):
```typescript
// BEFORE: "Powered by Retrieval-Augmented Generation"
// AFTER: "Built Specifically for ELEC3120"
```

#### 1.3 TechStack.tsx - DELETE ENTIRELY
This entire component is engineering vanity that provides zero value to students.
- "Supabase pgvector for embeddings" - students don't care
- "n8n workflow automation" - irrelevant to them
- "RAG Pipeline" diagram - confuses them

**Action**: Remove `<TechStack />` from `Landing.tsx` and delete the component file.

#### 1.4 ModesShowcase.tsx - Clearer Feature Descriptions
**Current** (line 13-20):
```typescript
description: "Ask questions, get instant RAG-powered answers",
features: [
  "Natural language Q&A",
  "Source citations included",
  "Context-aware responses",
  "Real-time interaction"
],
```

**New**:
```typescript
description: "Ask anything about the course, get answers from Prof. Meng's slides",
features: [
  "Ask in plain English",
  "Every answer shows which slide it's from",
  "Understands follow-up questions",
  "Answers in seconds, not hours"
],
```

**Similar updates for Course Mode and Mock Exam Mode** - replace vague tech terms with concrete benefits.

#### 1.5 CTA.tsx - Swap Technical Stats for Student Outcomes
**Current** (line 166-170):
```typescript
{ value: "RAG-Powered", label: "AI Accuracy" },
{ value: "3 Modes", label: "Learning Paths" },
{ value: "Real-time", label: "Feedback" }
```

**New**:
```typescript
{ value: "Every Answer", label: "Cites Its Source" },
{ value: "50+ Topics", label: "From ELEC3120" },
{ value: "PDF Export", label: "For Offline Study" }
```

---

## Part 2: How It Works - Already Strong, Minor Tweaks

### What's Good
- ChatGPT vs LearningPacer comparison (keep as-is)
- Source citation proof section (keep)
- Honest limitations section (keep)

### Changes

#### 2.1 Learning Journey Timeline - Add Flexibility Note
Students skip to Mock Exam mode during cram time. Acknowledge this.

**Add text after line 35**:
```typescript
// Add a note like: "Jump to any mode based on your needs - no strict order required"
```

#### 2.2 Consider moving LearningJourneyTimeline higher
It's currently at the bottom. The ChatGPT comparison should stay at top, but the journey should come before exam practice for logical flow.

---

## Part 3: Chat Mode - Guest Upload Optimization

### Problem
Guests can upload files to `guest/{filename}` but have no account - burning storage for transient sessions that will never be retrieved.

### Current Code (from attachmentService.ts based on ChatMode usage)
```typescript
const uploadResults = await uploadAttachments(attachments, userId);
```

When `userId` is null (guest), files still get uploaded.

### Solution Options

**Option A (Recommended)**: Disable file uploads for guests entirely
- Show tooltip: "Sign in to upload files"
- Prevents wasted storage

**Option B**: Use temporary session-based cleanup
- Store with TTL, auto-delete after 24 hours
- More complex, requires edge function

### Implementation (Option A)
In `ChatConversation.tsx` (the input component):
```typescript
// Disable attachment button if not authenticated
<Button 
  disabled={!isAuthenticated}
  title={!isAuthenticated ? "Sign in to upload files" : "Attach files"}
  ...
/>
```

---

## Part 4: Course Mode - Make Gating Optional

### Philosophy
You want to support, not force. The 80% mastery system is good for motivated students, but shouldn't block cramming students who need to skip ahead.

### Current Gating Logic (CourseMode.tsx, line 307-310)
```typescript
{!unlocked && (
  <span>Complete all lectures in Section {chapter.id - 1} to unlock</span>
)}
```

### New Approach: Visible but Skippable

**Add "Dev Mode" style toggle for all users (not just admin)**

Replace the locked section message with:
```typescript
{!unlocked && (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">
      <Lock className="w-4 h-4 inline mr-1" />
      Recommended: Complete Section {chapter.id - 1} first
    </span>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => handleUnitClick(chapter.id)}
    >
      Skip ahead anyway →
    </Button>
  </div>
)}
```

**Visual change**:
- Remove hard lock icon for sections 2+
- Show "recommended path" indicator instead
- Keep completion tracking visible

**Result**: Students see the intended path but can jump if needed during exam crunch.

---

## Part 5: Mock Exam Mode - Honest Loading State

### Problem
Fake progress bar that increments every 2 seconds regardless of actual backend progress.

### Current Code (line 82-91)
```typescript
useEffect(() => {
  if (isLoadingQuestions) {
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 95));  // Fake increments
    }, 2000);
    return () => clearInterval(interval);
  }
}, [isLoadingQuestions]);
```

### Solution: Replace with Honest Indeterminate State

```typescript
// Remove the fake progress effect entirely
// Replace with simple loading states:

{isLoadingQuestions && (
  <div className="space-y-4 text-center py-8">
    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
    <div className="space-y-2">
      <p className="font-medium">Generating your exam...</p>
      <p className="text-sm text-muted-foreground">
        This typically takes 30-60 seconds
      </p>
      {/* Show elapsed time instead of fake progress */}
      <p className="text-xs text-muted-foreground">
        Elapsed: {Math.floor(elapsedTime / 1000)}s
      </p>
    </div>
  </div>
)}
```

**Add elapsed time state**:
```typescript
const [elapsedTime, setElapsedTime] = useState(0);

useEffect(() => {
  if (isLoadingQuestions) {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - start);
    }, 1000);
    return () => clearInterval(interval);
  } else {
    setElapsedTime(0);
  }
}, [isLoadingQuestions]);
```

---

## Part 6: TestYourselfCard - Retry Limits

### Problem
Unlimited retries let students brute-force their way to 80% mastery without learning.

### Current Code (line 85-90)
```typescript
const handleRetry = () => {
  setSelectedOption(null);
  setHasSubmitted(false);
  setIsCorrect(false);
  setIsRetryAttempt(true);
};
```

### Solution: Limit to 3 Attempts Per Question

**Add state**:
```typescript
const [attemptCount, setAttemptCount] = useState(0);
const MAX_ATTEMPTS = 3;
```

**Update handleSubmit**:
```typescript
const handleSubmit = () => {
  if (!selectedOption) return;
  
  setAttemptCount(prev => prev + 1);
  const selectedIndex = selectedOption.charCodeAt(0) - 65;
  const correct = selectedIndex === question.correctIndex;
  setIsCorrect(correct);
  setHasSubmitted(true);
  onAnswer(correct, isRetryAttempt);
};
```

**Update retry button visibility**:
```typescript
{!isCorrect && attemptCount < MAX_ATTEMPTS && (
  <Button 
    variant="outline"
    onClick={handleRetry}
    className="w-full"
  >
    <RefreshCw className="mr-2 h-4 w-4" />
    Try Again ({MAX_ATTEMPTS - attemptCount} attempts left)
  </Button>
)}

{!isCorrect && attemptCount >= MAX_ATTEMPTS && (
  <p className="text-sm text-muted-foreground text-center">
    No more attempts. Review the explanation above.
  </p>
)}
```

**Reset attempts when page changes** (in useEffect):
```typescript
useEffect(() => {
  setSelectedOption(null);
  setHasSubmitted(false);
  setIsCorrect(false);
  setIsExpanded(false);
  setIsRetryAttempt(false);
  setAttemptCount(0);  // Reset on new page
}, [question?.question, pageNumber]);
```

---

## Part 7: CompactProgress.tsx - Clearer Mastery UI

### Current Display
Already updated to show "X/72 correct (69 more needed)"

### Enhancement: Add Encouraging Messaging

When close to completion (within 10):
```typescript
{remaining <= 10 && remaining > 0 && (
  <Badge variant="secondary" className="animate-pulse">
    Almost there! 🎯
  </Badge>
)}

{hasPassed && (
  <Badge variant="default" className="bg-green-600">
    ✓ Lecture Mastered
  </Badge>
)}
```

---

## Summary of Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `Landing.tsx` | Remove TechStack import | High |
| `TechStack.tsx` | DELETE file | High |
| `Hero.tsx` | Update stats to student outcomes | High |
| `PlatformIntro.tsx` | Replace jargon with benefits, remove code snippet | High |
| `ModesShowcase.tsx` | Rewrite feature lists in student language | High |
| `CTA.tsx` | Replace tech stats with outcomes | Medium |
| `ChatMode.tsx` or input component | Disable uploads for guests | Medium |
| `CourseMode.tsx` | Add "Skip ahead" option for locked sections | High |
| `MockExamMode.tsx` | Replace fake progress with elapsed timer | Medium |
| `TestYourselfCard.tsx` | Add 3-attempt retry limit | High |
| `CompactProgress.tsx` | Add encouraging badges near completion | Low |
| `HowItWorks.tsx` | Reorder sections, add flexibility note | Low |

---

## Implementation Order

1. **Phase 1 - Critical UX** (do first)
   - Delete TechStack.tsx
   - Rewrite PlatformIntro jargon
   - Add skip-ahead to CourseMode
   - Add retry limits to TestYourselfCard

2. **Phase 2 - Polish**
   - Update Hero and CTA stats
   - Fix Mock Exam loading state
   - Disable guest uploads

3. **Phase 3 - Minor**
   - CompactProgress encouragement
   - HowItWorks reordering

---

## Expected Outcomes

- Students see "Pass ELEC3120" messaging, not "RAG Architecture"
- Cramming students can skip to Mock Exam without frustration
- No brute-forcing the mastery system (3 attempts max)
- Honest loading states build trust
- No wasted storage on guest uploads
