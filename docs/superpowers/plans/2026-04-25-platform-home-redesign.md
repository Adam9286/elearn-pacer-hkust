# Platform Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the in-app "How It Works" tab, hard-redirect logged-in users from `/` to `/platform`, persist last-used mode to localStorage, and add a welcome panel above the platform tabs that surfaces a Resume CTA plus the relocated Learning Journey Timeline.

**Architecture:** Three coordinated frontend changes — (1) extract the existing `LearningJourneyTimeline` from `HowItWorks.tsx` into a reusable component with a `compact` variant, (2) build a new `PlatformWelcome` component that consumes it plus a Resume CTA, and (3) wire localStorage persistence and a Landing redirect so the user always lands back where they were. After integration, delete `HowItWorks.tsx`.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind, shadcn/ui, framer-motion, react-router-dom, Supabase (`externalSupabase` for auth via `UserProgressContext`).

**Testing posture:** This codebase has no unit/component test framework configured (no Vitest/Jest in `package.json`). Per CLAUDE.md, do not introduce one as part of unrelated work. Verification is via `npm run build`, `npm run lint`, and browser preview.

---

## File structure

**Create:**
- `src/components/platform/LearningJourneyTimeline.tsx` — extracted component with `compact?: boolean` prop
- `src/components/platform/PlatformWelcome.tsx` — welcome panel rendered above Tabs
- `src/utils/lastModeStorage.ts` — localStorage read/write helpers with mode-ID validation

**Modify:**
- `src/pages/Landing.tsx` — add auth-aware hard redirect for logged-in users
- `src/pages/Platform.tsx` — remove `HowItWorks` tab, integrate `PlatformWelcome`, persist `activeMode`

**Delete:**
- `src/components/HowItWorks.tsx` — after extraction

---

## Task 1: Extract `LearningJourneyTimeline` into its own file (no behavior change)

**Why first:** The timeline is currently embedded in `HowItWorks.tsx`. Extracting it before any deletion keeps the build green and lets later tasks import it cleanly.

**Files:**
- Create: `src/components/platform/LearningJourneyTimeline.tsx`
- Modify: `src/components/HowItWorks.tsx` (replace inline component with an import)

- [ ] **Step 1: Create the extracted component**

Create `src/components/platform/LearningJourneyTimeline.tsx` with the same code currently in `HowItWorks.tsx` lines 1–110, plus only the imports it actually uses. Default-export the component.

```tsx
import { BookOpen, MessageSquare, Target, Brain, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { chapters } from "@/data/courseContent";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const LearningJourneyTimeline = () => {
  const { progress, user } = useUserProgress();
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
  const completedLessons = progress.reduce((acc, p) => acc + (p.lessons_completed?.length || 0), 0);
  const sectionsCompleted = chapters.filter((ch) => {
    const chProgress = progress.find((p) => p.chapter_id === ch.id);
    return chProgress && (chProgress.lessons_completed?.length || 0) >= ch.lessons.length;
  }).length;

  const getCurrentStep = () => {
    if (!user) return 0;
    if (sectionsCompleted === chapters.length) return 4;
    if (completedLessons >= Math.ceil(totalLessons * 0.5)) return 2;
    if (completedLessons >= 1) return 1;
    return 0;
  };

  const currentStep = getCurrentStep();

  const journeySteps = [
    { step: 1, title: "Ask Questions", description: "Use AI chat to explore any topic", icon: MessageSquare },
    { step: 2, title: "Master Units", description: `${completedLessons}/${totalLessons} lessons completed`, icon: BookOpen },
    { step: 3, title: "Practice Exams", description: "Test your knowledge with mock exams", icon: Target },
    { step: 4, title: "Ace ELEC3120", description: "You're ready for the final exam!", icon: Brain },
  ];

  return (
    <Card className="glass-card shadow-lg border-2 overflow-hidden">
      <CardHeader className="gradient-hero text-white">
        <CardTitle className="text-2xl">Your Learning Journey</CardTitle>
        <CardDescription className="text-white/80">
          {user ? `${Math.round((completedLessons / totalLessons) * 100)}% complete` : "Sign in to track your progress"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8 pb-6" ref={ref}>
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
          <motion.div
            className="absolute left-8 top-0 w-0.5 bg-gradient-to-b from-accent via-primary to-accent origin-top"
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: currentStep / 4 } : { scaleY: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            style={{ height: "100%" }}
          />
          <div className="space-y-8">
            {journeySteps.map((item, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  className="relative flex items-start gap-6 pl-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.5, delay: 0.2 + idx * 0.15 }}
                >
                  <div className="relative z-10 flex-shrink-0">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isCompleted
                          ? "bg-accent border-accent shadow-[0_0_20px_rgba(var(--accent),0.5)]"
                          : isCurrent
                          ? "bg-primary/20 border-primary"
                          : "bg-muted border-muted-foreground/30"
                      }`}
                      animate={isCurrent ? {
                        boxShadow: ["0 0 0 0 rgba(var(--primary), 0.4)", "0 0 0 10px rgba(var(--primary), 0)"]
                      } : {}}
                      transition={isCurrent ? { duration: 1.5, repeat: Infinity, ease: "easeOut" } : {}}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-accent-foreground" />
                      ) : (
                        <Icon className={`w-6 h-6 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                    </motion.div>
                  </div>
                  <div className={`flex-1 pt-2 ${!isCompleted && !isCurrent ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <h4 className={`font-semibold text-lg ${isCompleted ? "text-accent" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                        {item.title}
                      </h4>
                      {isCompleted && <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">Complete</Badge>}
                      {isCurrent && <Badge className="bg-primary/20 text-primary text-xs animate-pulse">Current</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningJourneyTimeline;
```

- [ ] **Step 2: Replace the inline component in `HowItWorks.tsx` with an import**

In `src/components/HowItWorks.tsx`:

- Delete the `LearningJourneyTimeline` definition (lines 9–110 of the original).
- Add `import LearningJourneyTimeline from "@/components/platform/LearningJourneyTimeline";` to the imports.
- Remove `BookOpen, MessageSquare, Target, Brain` from the lucide-react import line if no other section in this file uses them. (`MessageSquare`, `Target`, `Brain` are used elsewhere in this file too — only remove `BookOpen` if unused.)
- Leave the rest of `HowItWorks.tsx` intact for now (still rendered on the `info` tab).

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds, no TS errors.

Run: `npm run lint`
Expected: no new lint errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/platform/LearningJourneyTimeline.tsx src/components/HowItWorks.tsx
git commit -m "Extract LearningJourneyTimeline into its own component"
```

---

## Task 2: Add a `compact` prop to `LearningJourneyTimeline`

**Why:** The welcome panel needs a denser version that does not dominate above-the-fold space. Same data and animation, smaller chrome.

**Files:**
- Modify: `src/components/platform/LearningJourneyTimeline.tsx`

- [ ] **Step 1: Add the prop and a compact-variant render**

Replace the component signature and JSX with the following:

```tsx
type LearningJourneyTimelineProps = {
  compact?: boolean;
};

const LearningJourneyTimeline = ({ compact = false }: LearningJourneyTimelineProps) => {
  // ...existing hook + computation code unchanged...

  const headerClass = compact ? "py-3 px-4" : "";
  const titleClass = compact ? "text-base" : "text-2xl";
  const descClass = compact ? "text-xs text-white/80" : "text-white/80";
  const contentClass = compact ? "pt-4 pb-4" : "pt-8 pb-6";
  const stepSpacing = compact ? "space-y-4" : "space-y-8";
  const dotSize = compact ? "w-8 h-8" : "w-12 h-12";
  const dotIconSize = compact ? "w-4 h-4" : "w-6 h-6";
  const titleSize = compact ? "text-sm" : "text-lg";
  const descSize = compact ? "text-xs" : "text-sm";
  const railLeft = compact ? "left-6" : "left-8";

  return (
    <Card className="glass-card shadow-lg border-2 overflow-hidden">
      <CardHeader className={`gradient-hero text-white ${headerClass}`}>
        <CardTitle className={titleClass}>Your Learning Journey</CardTitle>
        <CardDescription className={descClass}>
          {user ? `${Math.round((completedLessons / totalLessons) * 100)}% complete` : "Sign in to track your progress"}
        </CardDescription>
      </CardHeader>
      <CardContent className={contentClass} ref={ref}>
        <div className="relative">
          <div className={`absolute ${railLeft} top-0 bottom-0 w-0.5 bg-muted-foreground/20`} />
          <motion.div
            className={`absolute ${railLeft} top-0 w-0.5 bg-gradient-to-b from-accent via-primary to-accent origin-top`}
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: currentStep / 4 } : { scaleY: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            style={{ height: "100%" }}
          />
          <div className={stepSpacing}>
            {journeySteps.map((item, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  className="relative flex items-start gap-6 pl-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.5, delay: 0.2 + idx * 0.15 }}
                >
                  <div className="relative z-10 flex-shrink-0">
                    <motion.div
                      className={`${dotSize} rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isCompleted
                          ? "bg-accent border-accent shadow-[0_0_20px_rgba(var(--accent),0.5)]"
                          : isCurrent
                          ? "bg-primary/20 border-primary"
                          : "bg-muted border-muted-foreground/30"
                      }`}
                      animate={isCurrent ? {
                        boxShadow: ["0 0 0 0 rgba(var(--primary), 0.4)", "0 0 0 10px rgba(var(--primary), 0)"]
                      } : {}}
                      transition={isCurrent ? { duration: 1.5, repeat: Infinity, ease: "easeOut" } : {}}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className={`${dotIconSize} text-accent-foreground`} />
                      ) : (
                        <Icon className={`${dotIconSize} ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                    </motion.div>
                  </div>
                  <div className={`flex-1 pt-1 ${!isCompleted && !isCurrent ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <h4 className={`font-semibold ${titleSize} ${isCompleted ? "text-accent" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                        {item.title}
                      </h4>
                      {isCompleted && <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">Complete</Badge>}
                      {isCurrent && <Badge className="bg-primary/20 text-primary text-xs animate-pulse">Current</Badge>}
                    </div>
                    <p className={`${descSize} text-muted-foreground mt-1`}>{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

The default `compact = false` means the existing call site in `HowItWorks.tsx` keeps working unchanged.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/LearningJourneyTimeline.tsx
git commit -m "Add compact variant to LearningJourneyTimeline"
```

---

## Task 3: Create localStorage utility for last-used mode

**Why:** Centralize the storage key, the allowed-mode allowlist, and the error-swallowing behavior so the rest of the code does not have to think about it.

**Files:**
- Create: `src/utils/lastModeStorage.ts`

- [ ] **Step 1: Create the utility module**

Create `src/utils/lastModeStorage.ts`:

```ts
const STORAGE_KEY = "lp.lastMode";

export const PLATFORM_MODES = [
  "chat",
  "compare",
  "course",
  "exam",
  "simulations",
  "feedback",
] as const;

export type PlatformTabId = (typeof PLATFORM_MODES)[number];

const isValidMode = (value: string | null): value is PlatformTabId => {
  return value !== null && (PLATFORM_MODES as readonly string[]).includes(value);
};

export const readLastMode = (): PlatformTabId | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isValidMode(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const writeLastMode = (mode: string): void => {
  if (!isValidMode(mode)) return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Quota or privacy mode — persistence is a UX nicety, not required.
  }
};
```

Notes:
- `info` is intentionally NOT in `PLATFORM_MODES`. If a previous build wrote `info` to storage, `readLastMode` returns `null` and the caller falls back to `"chat"`.
- `feedback` IS included so the panel does not lose state if the user was last on Feedback. It is a real tab, just hidden in the overflow menu.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/lastModeStorage.ts
git commit -m "Add lastMode localStorage utility"
```

---

## Task 4: Create the `PlatformWelcome` component

**Why:** Encapsulate the welcome-panel UI so `Platform.tsx` stays readable. This task creates the component but does not wire it in yet.

**Files:**
- Create: `src/components/platform/PlatformWelcome.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/platform/PlatformWelcome.tsx`:

```tsx
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { platformModeSummaries, type PlatformModeId } from "@/data/platformContent";
import LearningJourneyTimeline from "@/components/platform/LearningJourneyTimeline";
import type { PlatformTabId } from "@/utils/lastModeStorage";

type PlatformWelcomeProps = {
  resumeMode: PlatformTabId;
  onResume: (mode: PlatformTabId) => void;
};

const getDisplayName = (user: ReturnType<typeof useUserProgress>["user"]): string | null => {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = meta.first_name ?? meta.full_name ?? meta.name;
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim().split(/\s+/)[0];
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return null;
};

const PlatformWelcome = ({ resumeMode, onResume }: PlatformWelcomeProps) => {
  const { user, progress } = useUserProgress();

  if (!user) return null;

  const displayName = getDisplayName(user);
  const greeting = displayName ? `Welcome back, ${displayName}` : "Welcome back";

  const completedLessons = progress.reduce(
    (acc, p) => acc + (p.lessons_completed?.length || 0),
    0,
  );
  const hasProgress = completedLessons > 0;

  // Cast is safe: resumeMode comes from PLATFORM_MODES which is a subset of PlatformModeId | "feedback".
  const isCoreMode = (mode: PlatformTabId): mode is PlatformModeId =>
    mode in platformModeSummaries;
  const resumeLabel = isCoreMode(resumeMode)
    ? platformModeSummaries[resumeMode].label
    : "Feedback";

  return (
    <Card className="mb-4 border-border bg-card/60">
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-stretch">
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {greeting}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Pick up where you left off
            </h2>
          </div>
          <Button
            onClick={() => onResume(resumeMode)}
            className="self-start gap-2"
          >
            Resume {resumeLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        {hasProgress && (
          <div className="flex-1 md:max-w-md">
            <LearningJourneyTimeline compact />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformWelcome;
```

Behavior summary:
- Returns `null` if `user` is not signed in (defensive — `Platform.tsx` already requires auth context, but this avoids rendering empty state if logic ever changes).
- Greeting prefers `user_metadata.first_name`, falls back to `full_name`/`name`, falls back to email local-part, falls back to "Welcome back".
- Hides the timeline when the user has zero completed lessons (avoids showing an empty progress widget to brand-new users).
- Renders side-by-side on `md+`, stacked on mobile.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds. The component is unused at this point but should still type-check.

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/PlatformWelcome.tsx
git commit -m "Add PlatformWelcome component"
```

---

## Task 5: Integrate `PlatformWelcome` and persist `activeMode` in `Platform.tsx`

**Why:** Wire the welcome panel into the page and start writing/reading `lp.lastMode` on tab change.

**Files:**
- Modify: `src/pages/Platform.tsx`

- [ ] **Step 1: Add imports**

In `src/pages/Platform.tsx`, add to the existing import block:

```tsx
import PlatformWelcome from "@/components/platform/PlatformWelcome";
import { readLastMode, writeLastMode, PLATFORM_MODES, type PlatformTabId } from "@/utils/lastModeStorage";
```

- [ ] **Step 2: Replace the `initialMode` / `activeMode` setup**

Replace the existing block (around lines 39–48):

```tsx
const initialMode = (location.state as { mode?: string })?.mode || "chat";
const [activeMode, setActiveMode] = useState(initialMode);
const [tipIndex, setTipIndex] = useState(0);

useEffect(() => {
  if (location.state?.mode) {
    setActiveMode(location.state.mode);
  }
}, [location.state]);
```

With:

```tsx
const isValidTab = (value: string | undefined | null): value is PlatformTabId => {
  return value !== null && value !== undefined && (PLATFORM_MODES as readonly string[]).includes(value);
};

// `initialMode` is pinned at mount via a lazy useState initializer so the
// welcome panel's "Resume X" label always reflects the user's last-session
// activity, not whichever tab they are currently viewing.
const [initialMode] = useState<PlatformTabId>(() => {
  const fromNav = (location.state as { mode?: string } | null)?.mode;
  if (isValidTab(fromNav)) return fromNav;
  return readLastMode() ?? "chat";
});
const [activeMode, setActiveMode] = useState<PlatformTabId>(initialMode);
const [tipIndex, setTipIndex] = useState(0);

useEffect(() => {
  const nextMode = (location.state as { mode?: string } | null)?.mode;
  if (isValidTab(nextMode)) {
    setActiveMode(nextMode);
  }
}, [location.state]);

useEffect(() => {
  writeLastMode(activeMode);
}, [activeMode]);
```

Notes:
- `initialMode` uses a lazy `useState` initializer so it is computed exactly once at mount and never updates again. This is what gets passed to `PlatformWelcome` so the "Resume X" button keeps representing the user's last-session mode even after they click around.
- `activeMode` starts equal to `initialMode` and then tracks tab clicks.
- The `Tabs` component already calls `setActiveMode` on user click; the new effect persists each change.

- [ ] **Step 3: Cast the Tabs `onValueChange` so TypeScript accepts the narrowed type**

Find the existing `<Tabs value={activeMode} onValueChange={setActiveMode} className="space-y-4">` (line 140) and change `onValueChange` to:

```tsx
onValueChange={(value) => setActiveMode(value as PlatformTabId)}
```

- [ ] **Step 4: Render `PlatformWelcome` above the Tabs block**

Find the line that opens `<Tabs value={activeMode} ...>` (around line 140). Immediately above it (and below `<StudyToolsStrip />`), add:

```tsx
<PlatformWelcome resumeMode={initialMode} onResume={(mode) => setActiveMode(mode)} />
```

Pass `initialMode` (pinned) rather than `activeMode` so the Resume CTA stays anchored to the user's last-session mode rather than tracking whichever tab they are currently on.

- [ ] **Step 5: Verify the build and lint**

Run: `npm run build`
Expected: succeeds.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Manual browser verification**

Start the dev server (use `preview_start` if running through Claude Code preview tooling, or `npm run dev` locally). Sign in, then:
1. Visit `/platform` — confirm the welcome panel appears above the tab strip.
2. Click "Resume Chat" — confirm the Chat tab activates.
3. Switch to the Course tab. Reload the page. Confirm the page returns to Course (welcome panel now says "Resume Course").
4. Open DevTools → Application → Local Storage. Confirm `lp.lastMode` reflects the active tab.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Platform.tsx
git commit -m "Integrate PlatformWelcome and persist last-used mode"
```

---

## Task 6: Remove the "How It Works" tab from `Platform.tsx`

**Why:** With progress relocated to the welcome panel, the in-app "How It Works" tab has nothing left to do.

**Files:**
- Modify: `src/pages/Platform.tsx`

- [ ] **Step 1: Remove the import**

Delete this line from `src/pages/Platform.tsx`:

```tsx
import HowItWorks from "@/components/HowItWorks";
```

Also remove `Info` from the lucide-react import on line 2 if no other use remains in this file (search the file for `Info` to confirm).

- [ ] **Step 2: Remove `info` from `overflowModes`**

Change line 34 from:

```tsx
const overflowModes = ["info", "feedback"];
```

to:

```tsx
const overflowModes = ["feedback"];
```

- [ ] **Step 3: Remove the "How It Works" dropdown menu item**

Delete the `DropdownMenuItem` block for `info` (around lines 194–203):

```tsx
<DropdownMenuItem
  onSelect={() => setActiveMode("info")}
  className={cn(
    "gap-2 focus:bg-accent/15 focus:text-foreground",
    activeMode === "info" && "bg-accent/15 text-foreground",
  )}
>
  <Info className="h-4 w-4" />
  <span>How It Works</span>
</DropdownMenuItem>
```

- [ ] **Step 4: Remove the `<TabsContent value="info">` slot**

Delete this block (around lines 242–244):

```tsx
<TabsContent value="info" className="mt-3">
  <HowItWorks />
</TabsContent>
```

- [ ] **Step 5: Verify the build and lint**

Run: `npm run build`
Expected: succeeds.

Run: `npm run lint`
Expected: no new errors. If lint complains about an unused `Info` import, remove it.

- [ ] **Step 6: Manual browser verification**

Reload `/platform`. Open the overflow `…` menu — confirm "How It Works" is gone and only "Feedback" remains. Confirm no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Platform.tsx
git commit -m "Remove How It Works tab from platform"
```

---

## Task 7: Hard-redirect logged-in users from `/` to `/platform`

**Why:** Eliminate the repetitive marketing page for returning users. Logged-out users still see the full landing page.

**Files:**
- Modify: `src/pages/Landing.tsx`

- [ ] **Step 1: Add the redirect logic**

Replace the entire contents of `src/pages/Landing.tsx` with:

```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";

import CredStrip from "@/components/landing/CredStrip";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import ModesShowcase from "@/components/landing/ModesShowcase";
import Navbar from "@/components/landing/Navbar";
import ProofSection from "@/components/landing/ProofSection";
import SimulationShowcase from "@/components/landing/SimulationShowcase";
import Testimonial from "@/components/landing/Testimonial";
import { useUserProgress } from "@/contexts/UserProgressContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useUserProgress();

  useEffect(() => {
    if (!loading && user) {
      navigate("/platform", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || user) {
    // Avoid flashing the marketing page while auth resolves or just before redirect.
    return null;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={{
          minHeight: "100vh",
          background: "#030816",
          color: "#f0f4ff",
          fontFamily: "'Inter Tight', sans-serif",
          WebkitFontSmoothing: "antialiased",
          overflowX: "hidden",
        }}
      >
        <Navbar />
        <main>
          <Hero />
          <CredStrip />
          <ModesShowcase />
          <ProofSection />
          <SimulationShowcase />
          <Testimonial />
          <CTA />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
};

export default Landing;
```

Behavior summary:
- While auth is resolving (`loading === true`), render `null` to avoid a flash of the marketing page.
- Once `loading === false`, if `user` exists, redirect to `/platform` (with `replace` so the back button does not loop).
- Logged-out users see the unchanged landing page.

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build`
Expected: succeeds.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Manual browser verification**

In a logged-out incognito window, visit `/`. Confirm the full landing page renders.

In a logged-in window, visit `/`. Confirm an immediate redirect to `/platform` (no hero flash). Confirm the URL bar shows `/platform`.

Sign out from `/platform`. Confirm the existing sign-out flow still navigates back to `/` and that the landing page renders correctly post-sign-out (auth state should now be `loading=false, user=null`).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "Hard-redirect logged-in users from landing to platform"
```

---

## Task 8: Delete `HowItWorks.tsx`

**Why:** Nothing imports it after Task 6. Removing it cleans up the codebase.

**Files:**
- Delete: `src/components/HowItWorks.tsx`

- [ ] **Step 1: Confirm zero remaining imports**

Run: `grep -r "HowItWorks" src/`
Expected: zero results (or only the file itself listing).

If anything else references `HowItWorks`, stop and resolve it before deletion.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/HowItWorks.tsx
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: succeeds.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove HowItWorks component"
```

---

## Self-review checklist (run after the plan finishes executing)

- [ ] All eight tasks committed individually.
- [ ] `/` redirects logged-in users to `/platform`; logged-out users still see the landing page.
- [ ] `/platform` shows the welcome panel above the tabs for signed-in users.
- [ ] The "How It Works" entry no longer appears in the overflow `…` menu.
- [ ] Switching tabs and reloading restores the same tab on next visit.
- [ ] `localStorage` key `lp.lastMode` reflects the current tab.
- [ ] No console errors on `/` (signed-out), `/platform` (signed-in), or sign-out flow.
- [ ] `src/components/HowItWorks.tsx` no longer exists; `src/components/platform/LearningJourneyTimeline.tsx` does.

## Out-of-scope (deliberate)

- Smart "next step" recommendations in the welcome panel.
- "What's new" announcements.
- Reinforcing citations as per-message badges in Chat.
- Any landing-page redesign beyond the redirect.
- Adding a unit-test framework.
