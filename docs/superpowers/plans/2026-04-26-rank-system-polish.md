# Rank System Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin rank override schema-cache error, add a clickable rank gallery modal, and add level-up toast plus tier-up celebration overlay.

**Architecture:** Pure client-side polish on top of the existing rank system. No new tables, no new XP sources. Level-up detection happens in `UserProgressContext` by diffing snapshot levels. The rank gallery is a stateless dialog reading `rankDefinitions`. The tier-up overlay is a single global component triggered by a context-exposed event. The bug fix is a migration file relocation plus a manual SQL apply on the externalSupabase project.

**Tech Stack:** React 18 + TypeScript + Vite, shadcn/ui (Dialog, Button, Progress, Badge), Tailwind CSS 3, Framer Motion, sonner (toast), lucide-react (icons), Supabase (externalSupabase project ref `dpedzjzrlzvzqrzajrda`).

**Spec:** `docs/superpowers/specs/2026-04-26-rank-system-polish-design.md`

**Note on testing:** This project has no automated test suite. Verification per task is `npm run lint`, `npm run build`, and targeted manual testing in the browser. TypeScript strict mode is intentionally off — do not enable it.

---

## File Structure

### New files
- `src/components/rank/RankLadderDialog.tsx` — modal listing all 10 ranks with locked/current/unlocked state
- `src/components/rank/RankUpOverlay.tsx` — global animated overlay shown when crossing rank tiers
- `docs/sql/external-supabase/20260426021500_admin_rank_overrides.sql` — moved from `supabase/migrations/`, identical contents

### Edited files
- `src/components/rank/RankChip.tsx` — add optional `onClick` prop
- `src/components/rank/RankSummaryCard.tsx` — add "Level X of 10 in Bronze" tier progress line
- `src/contexts/UserProgressContext.tsx` — track previous level, fire toast/event on level changes, expose `rankUpEvent` + `dismissRankUp`
- `src/pages/Platform.tsx` — open dialog from chip click, render dialog
- `src/App.tsx` — render `<RankUpOverlay />` inside `UserProgressProvider`

### Removed files
- `supabase/migrations/20260426021500_admin_rank_overrides.sql` — replaced by the relocated copy

---

## Task 1: Relocate admin override migration to externalSupabase folder

**Files:**
- Create: `docs/sql/external-supabase/20260426021500_admin_rank_overrides.sql`
- Delete: `supabase/migrations/20260426021500_admin_rank_overrides.sql`

- [ ] **Step 1: Read the existing migration file**

Run: `Read supabase/migrations/20260426021500_admin_rank_overrides.sql`

Expected: 229 lines starting with `CREATE OR REPLACE FUNCTION public.is_current_user_admin()`. Capture full contents — they will be reused unchanged.

- [ ] **Step 2: Write the same contents to the externalSupabase folder**

Create `docs/sql/external-supabase/20260426021500_admin_rank_overrides.sql` containing the EXACT contents of the file from Step 1. Do not modify the SQL — the migration is correct, only its location was wrong.

- [ ] **Step 3: Delete the original file from supabase/migrations**

Run: `git rm supabase/migrations/20260426021500_admin_rank_overrides.sql`

Expected: file removed from working tree and staged for deletion.

- [ ] **Step 4: Stop and ask the user to apply the SQL**

Output to user (verbatim):

> Please apply this SQL to the externalSupabase project:
> 1. Open https://supabase.com/dashboard/project/dpedzjzrlzvzqrzajrda/sql/new
> 2. Paste the entire contents of `docs/sql/external-supabase/20260426021500_admin_rank_overrides.sql`
> 3. Click Run. You should see "Success. No rows returned".
> 4. Reply "applied" once done.

Wait for user confirmation before proceeding to Step 5.

- [ ] **Step 5: User verifies the fix in-app**

Ask the user to:
1. Sign in as an admin, enable dev mode, navigate to `/admin/ranks`.
2. Select any user, change Total XP, click "Save Override".
3. Confirm a green toast says "Saved override for {name}" and the `Override active` badge appears.
4. Click "Clear Override" and confirm a green toast says "Cleared override for {name}".

Wait for user to confirm the bug is fixed before committing.

- [ ] **Step 6: Commit**

```bash
git add docs/sql/external-supabase/20260426021500_admin_rank_overrides.sql supabase/migrations/20260426021500_admin_rank_overrides.sql
git commit -m "fix(rank): relocate admin override migration to externalSupabase

The admin_set_user_rank_override function and user_rank_overrides table
were placed in supabase/migrations/ which targets the examSupabase
project. They belong on externalSupabase (auth/user data) where
rankService calls them. Move the migration to the externalSupabase
folder convention."
```

---

## Task 2: Add tier progress line to RankSummaryCard

**Files:**
- Modify: `src/components/rank/RankSummaryCard.tsx`

- [ ] **Step 1: Replace the rank name block with a version that includes tier progress**

In `src/components/rank/RankSummaryCard.tsx`, find this block (around lines 54-59):

```tsx
              <div className="space-y-1">
                <h3 className={cn("font-display font-semibold text-foreground", compact ? "text-xl" : "text-3xl")}>
                  Lv. {snapshot.level} {snapshot.rankName}
                </h3>
                <p className="text-sm text-muted-foreground">{snapshot.totalXp.toLocaleString()} XP</p>
              </div>
```

Replace with:

```tsx
              <div className="space-y-1">
                <h3 className={cn("font-display font-semibold text-foreground", compact ? "text-xl" : "text-3xl")}>
                  Lv. {snapshot.level} {snapshot.rankName}
                </h3>
                <p className="text-xs font-medium text-muted-foreground">
                  Level {snapshot.level - rank.minLevel + 1} of {rank.maxLevel - rank.minLevel + 1} in {rank.name}
                </p>
                <p className="text-sm text-muted-foreground">{snapshot.totalXp.toLocaleString()} XP</p>
              </div>
```

The variable `rank` is already defined at the top of the component via `getRankForId(snapshot.rankId)`.

- [ ] **Step 2: Lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no new errors.

- [ ] **Step 3: Manual visual check**

Open the app, sign in, click the user avatar to open Account Settings. The rank summary card now shows "Level X of Y in Bronze" (or whatever rank) below the rank name.

- [ ] **Step 4: Commit**

```bash
git add src/components/rank/RankSummaryCard.tsx
git commit -m "feat(rank): show tier progress on rank summary card

Add 'Level X of 10 in {rankName}' line so users immediately see how
far they are through their current rank tier."
```

---

## Task 3: Make RankChip clickable (add optional onClick prop)

**Files:**
- Modify: `src/components/rank/RankChip.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/components/rank/RankChip.tsx` with:

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRankForId, type UserRankSnapshot } from "@/utils/rankSystem";

interface RankChipProps {
  snapshot?: UserRankSnapshot | null;
  className?: string;
  size?: "sm" | "md";
  showRankName?: boolean;
  onClick?: () => void;
}

const RankChip = ({
  snapshot,
  className,
  size = "sm",
  showRankName = true,
  onClick,
}: RankChipProps) => {
  if (!snapshot) return null;

  const rank = getRankForId(snapshot.rankId);
  const iconWrapSize = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const iconSize = size === "md" ? "h-6 w-6" : "h-[18px] w-[18px]";

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-2 border-border/70 bg-background/50 px-2 py-1 text-muted-foreground",
        onClick && "cursor-pointer transition hover:border-primary/40 hover:bg-background/80 hover:text-foreground",
        className,
      )}
      title={`${snapshot.rankName} Level ${snapshot.level}${onClick ? " — view all ranks" : ""}`}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-white/10 bg-background/60 shadow-glow",
          iconWrapSize,
        )}
      >
        <img
          src={rank.icon}
          alt=""
          aria-hidden="true"
          className={cn("object-contain", iconSize)}
        />
      </span>
      <span className="font-semibold text-foreground">Lv. {snapshot.level}</span>
      {showRankName ? <span>{snapshot.rankName}</span> : null}
    </Badge>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="View all ranks"
      >
        {badgeContent}
      </button>
    );
  }

  return badgeContent;
};

export default RankChip;
```

Existing call sites that don't pass `onClick` (e.g. `AdminRanks.tsx`'s user list) keep their current passive-badge behavior.

- [ ] **Step 2: Lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/components/rank/RankChip.tsx
git commit -m "feat(rank): make RankChip optionally clickable

Add an onClick prop. When set, the chip renders as a button with hover
ring and focus ring, opening the way for the rank gallery dialog."
```

---

## Task 4: Build RankLadderDialog component

**Files:**
- Create: `src/components/rank/RankLadderDialog.tsx`

- [ ] **Step 1: Create the dialog component**

Create `src/components/rank/RankLadderDialog.tsx` with:

```tsx
import { Check, Lock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getLevelProgressPercent,
  getRankForId,
  getXpForCurrentLevel,
  getXpToNextLevel,
  LEVEL_XP_STEP,
  MAX_LEVEL,
  rankDefinitions,
  XP_CAPS,
  XP_REWARDS,
  type RankDefinition,
  type UserRankSnapshot,
} from "@/utils/rankSystem";

interface RankLadderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: UserRankSnapshot | null;
}

type RankRowState = "locked" | "current" | "unlocked";

const getRowState = (rank: RankDefinition, currentLevel: number): RankRowState => {
  if (currentLevel >= rank.minLevel && currentLevel <= rank.maxLevel) return "current";
  if (currentLevel > rank.maxLevel) return "unlocked";
  return "locked";
};

const xpEarningTips = [
  { label: "Complete a lesson", value: `+${XP_REWARDS.completedLesson} XP` },
  { label: "Complete a section", value: `+${XP_REWARDS.completedSection} XP` },
  {
    label: "Quick practice (per attempt)",
    value: `+${XP_REWARDS.quickPracticeBase}–${XP_REWARDS.quickPracticeBase + 100} XP · cap ${XP_CAPS.quickPractice.toLocaleString()}`,
  },
  {
    label: "Exam simulation (per attempt)",
    value: `+${XP_REWARDS.examSimulation} XP · cap ${XP_CAPS.examSimulation.toLocaleString()}`,
  },
  {
    label: "Share a useful mock exam",
    value: `+${XP_REWARDS.sharedExam} XP · cap ${XP_CAPS.sharedExam.toLocaleString()}`,
  },
  {
    label: "Others use your shared exam",
    value: `+${XP_REWARDS.sharedExamUse} XP each · cap ${XP_CAPS.sharedExamUse.toLocaleString()}`,
  },
];

const RankLadderDialog = ({ open, onOpenChange, snapshot }: RankLadderDialogProps) => {
  const currentLevel = snapshot?.level ?? 0;
  const totalXp = snapshot?.totalXp ?? 0;
  const xpInLevel = getXpForCurrentLevel(totalXp);
  const xpToNext = getXpToNextLevel(totalXp);
  const levelProgress = getLevelProgressPercent(totalXp);
  const isMaxLevel = currentLevel >= MAX_LEVEL;
  const currentRank = snapshot ? getRankForId(snapshot.rankId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>Learning Ranks</DialogTitle>
          <DialogDescription>
            Earn XP by studying ELEC3120 — climb from Novice to Legend across {MAX_LEVEL} levels.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 px-6 py-4">
            {rankDefinitions.map((rank) => {
              const state = currentLevel > 0 ? getRowState(rank, currentLevel) : "locked";
              const isCurrent = state === "current";

              return (
                <div
                  key={rank.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl border p-3 transition",
                    isCurrent
                      ? "border-primary/50 bg-primary/5 shadow-glow"
                      : state === "unlocked"
                        ? "border-border/70 bg-background/40"
                        : "border-border/40 bg-background/20 opacity-70",
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0",
                      `bg-gradient-to-br ${rank.tone}`,
                      isCurrent ? "opacity-15" : "opacity-5",
                    )}
                  />
                  <div className="relative flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-background/60 shadow-glow",
                        state === "locked" && "grayscale",
                      )}
                    >
                      <img
                        src={rank.icon}
                        alt=""
                        aria-hidden="true"
                        className="h-9 w-9 object-contain"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{rank.name}</p>
                        {state === "current" ? (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            Current
                          </span>
                        ) : state === "unlocked" ? (
                          <Check className="h-4 w-4 text-emerald-400" aria-label="Unlocked" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" aria-label="Locked" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lv. {rank.minLevel} – {rank.maxLevel}
                      </p>

                      {isCurrent && currentRank ? (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              Level {currentLevel - rank.minLevel + 1} of{" "}
                              {rank.maxLevel - rank.minLevel + 1} in {rank.name}
                            </span>
                            <span>
                              {isMaxLevel
                                ? "Max level"
                                : `${xpInLevel}/${LEVEL_XP_STEP} XP this level`}
                            </span>
                          </div>
                          <Progress value={levelProgress} className="h-1.5" />
                          <p className="text-[11px] text-muted-foreground">
                            {isMaxLevel
                              ? "Legend complete"
                              : `${xpToNext} XP to Lv. ${currentLevel + 1}`}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border/60 bg-background/40 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              How to earn XP
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {xpEarningTips.map((tip) => (
                <li key={tip.label} className="flex items-start justify-between gap-3">
                  <span className="text-foreground">{tip.label}</span>
                  <span className="shrink-0 text-muted-foreground">{tip.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default RankLadderDialog;
```

- [ ] **Step 2: Lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed. The component is not yet rendered anywhere — that happens in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/components/rank/RankLadderDialog.tsx
git commit -m "feat(rank): add RankLadderDialog gallery component

Stateless dialog listing all 10 ranks with locked/current/unlocked
states. Current rank row expands with progress bar and XP-to-next
text. Footer shows the XP earning rates pulled from rankSystem
constants."
```

---

## Task 5: Wire RankLadderDialog into Platform header

**Files:**
- Modify: `src/pages/Platform.tsx`

- [ ] **Step 1: Add the import for RankLadderDialog and useState**

Open `src/pages/Platform.tsx`. Near the existing `import RankChip from "@/components/rank/RankChip";` (line 13), add:

```tsx
import RankLadderDialog from "@/components/rank/RankLadderDialog";
```

Verify `useState` is already imported from React at the top of the file (it is — Platform.tsx already uses several hooks). If not, add it.

- [ ] **Step 2: Add dialog open state**

Inside the `Platform` component body, alongside the other `useState` calls, add:

```tsx
const [rankDialogOpen, setRankDialogOpen] = useState(false);
```

- [ ] **Step 3: Wire the chip to open the dialog**

Find the existing `RankChip` call (around lines 101-105):

```tsx
                  <RankChip
                    snapshot={rankSnapshot}
                    showRankName={false}
                    className="hidden bg-background/70 md:inline-flex"
                  />
```

Replace with:

```tsx
                  <RankChip
                    snapshot={rankSnapshot}
                    showRankName={false}
                    className="hidden bg-background/70 md:inline-flex"
                    onClick={() => setRankDialogOpen(true)}
                  />
```

- [ ] **Step 4: Render the dialog**

At the bottom of the JSX returned by `Platform` (just before the final closing tag of the component's outermost element), add:

```tsx
      <RankLadderDialog
        open={rankDialogOpen}
        onOpenChange={setRankDialogOpen}
        snapshot={rankSnapshot}
      />
```

If you can't easily identify the right closing tag, place this inside the same wrapper `<div>` that contains the header and main, before its closing `</div>`. The dialog is portaled by Radix so absolute positioning doesn't matter.

- [ ] **Step 5: Lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 6: Manual test**

Run `npm run dev`. Sign in. On the Platform page:
1. Click the rank chip in the header. The Learning Ranks dialog opens.
2. Confirm all 10 ranks are listed in order (Novice → Legend).
3. Confirm your current rank shows the `Current` pill, progress bar, and "Level X of Y in {rank}" text.
4. Confirm ranks below your current level show a green check, ranks above show a lock icon.
5. Confirm the "How to earn XP" section at the bottom lists all six XP sources with correct values.
6. Toggle dark/light mode and confirm both look right.
7. Click outside the dialog or press Escape — it closes.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Platform.tsx
git commit -m "feat(rank): open rank ladder gallery from header chip

Clicking the rank chip on the Platform page now opens the
RankLadderDialog showing all 10 ranks, current progress, and XP
earning rates."
```

---

## Task 6: Track level changes in UserProgressContext

**Files:**
- Modify: `src/contexts/UserProgressContext.tsx`

- [ ] **Step 1: Add the new imports**

Open `src/contexts/UserProgressContext.tsx`. Update imports at the top:

Replace:

```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { externalSupabase } from "@/lib/externalSupabase";
import { User } from "@supabase/supabase-js";
import { chapters } from "@/data/courseContent";
import {
  getDisplayNameFromEmail,
  refreshMyRankSnapshot,
} from "@/services/rankService";
import type { UserRankSnapshot } from "@/utils/rankSystem";
```

With:

```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { toast } from "sonner";
import { externalSupabase } from "@/lib/externalSupabase";
import { User } from "@supabase/supabase-js";
import { chapters } from "@/data/courseContent";
import {
  getDisplayNameFromEmail,
  refreshMyRankSnapshot,
} from "@/services/rankService";
import { getRankForLevel, type RankId, type UserRankSnapshot } from "@/utils/rankSystem";
```

- [ ] **Step 2: Add the RankUpEvent type and extend the context interface**

Just below the `UserProgress` interface (near the top of the file), add:

```tsx
export interface RankUpEvent {
  rankId: RankId;
  rankName: string;
  level: number;
  triggeredAt: number;
}
```

Then update the `UserProgressContextType` interface to add two new fields:

```tsx
interface UserProgressContextType {
  user: User | null;
  progress: UserProgress[];
  loading: boolean;
  authResolved: boolean;
  rankSnapshot: UserRankSnapshot | null;
  rankLoading: boolean;
  rankUpEvent: RankUpEvent | null;
  dismissRankUp: () => void;
  devMode: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  setDevMode: (enabled: boolean) => void;
  getChapterProgress: (chapterId: number) => UserProgress | undefined;
  isChapterUnlocked: (chapterId: number) => boolean;
  isSectionComplete: (chapterId: number) => boolean;
  getLessonsCompleted: (chapterId: number) => number;
  getTotalLessons: (chapterId: number) => number;
  markLessonComplete: (chapterId: number, lessonId: string) => Promise<{ success?: boolean; error?: string }>;
  markLessonIncomplete: (chapterId: number, lessonId: string) => Promise<{ success?: boolean; error?: string }>;
  refreshRank: () => Promise<UserRankSnapshot | null>;
  refetch: () => Promise<void>;
}
```

- [ ] **Step 3: Add state and ref for level tracking**

In the `UserProgressProvider` component, add the following alongside the existing `useState` calls (near the top of the component):

```tsx
  const previousLevelRef = useRef<number | null>(null);
  const [rankUpEvent, setRankUpEvent] = useState<RankUpEvent | null>(null);

  const dismissRankUp = useCallback(() => {
    setRankUpEvent(null);
  }, []);
```

- [ ] **Step 4: Replace `refreshRank` with a level-aware version**

Find the existing `refreshRank` function (around lines 98-116):

```tsx
  const refreshRank = useCallback(async () => {
    if (!user) {
      setRankSnapshot(null);
      setRankLoading(false);
      return null;
    }

    setRankLoading(true);
    try {
      const snapshot = await refreshMyRankSnapshot(
        user.id,
        getDisplayNameFromEmail(user.email),
      );
      setRankSnapshot(snapshot);
      return snapshot;
    } finally {
      setRankLoading(false);
    }
  }, [user]);
```

Replace with:

```tsx
  const refreshRank = useCallback(async () => {
    if (!user) {
      setRankSnapshot(null);
      setRankLoading(false);
      previousLevelRef.current = null;
      return null;
    }

    setRankLoading(true);
    try {
      const snapshot = await refreshMyRankSnapshot(
        user.id,
        getDisplayNameFromEmail(user.email),
      );

      const previousLevel = previousLevelRef.current;
      const newLevel = snapshot.level;

      if (previousLevel !== null && newLevel > previousLevel) {
        const previousRank = getRankForLevel(previousLevel);
        const newRank = getRankForLevel(newLevel);

        toast.success(`Level Up! Lv. ${newLevel} ${snapshot.rankName}`, {
          description: "Keep going — every chapter earns XP.",
        });

        if (previousRank.id !== newRank.id) {
          setRankUpEvent({
            rankId: newRank.id,
            rankName: newRank.name,
            level: newLevel,
            triggeredAt: Date.now(),
          });
        }
      }

      previousLevelRef.current = newLevel;
      setRankSnapshot(snapshot);
      return snapshot;
    } finally {
      setRankLoading(false);
    }
  }, [user]);
```

- [ ] **Step 5: Reset previousLevelRef on sign-out**

Find the `onAuthStateChange` block (around lines 72-83):

```tsx
    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthResolved(true);
      if (session?.user) {
        setTimeout(() => checkAdminRole(session.user.id), 0);
      } else {
        setIsAdmin(false);
        setAdminLoading(false);
        setRankSnapshot(null);
        setDevModeState(false);
      }
    });
```

Replace with:

```tsx
    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthResolved(true);
      if (session?.user) {
        setTimeout(() => checkAdminRole(session.user.id), 0);
      } else {
        setIsAdmin(false);
        setAdminLoading(false);
        setRankSnapshot(null);
        setDevModeState(false);
        previousLevelRef.current = null;
        setRankUpEvent(null);
      }
    });
```

- [ ] **Step 6: Expose the new fields in the context value**

Find the `value` object near the bottom of the provider (around lines 258-278):

```tsx
  const value: UserProgressContextType = {
    user,
    progress,
    loading,
    authResolved,
    rankSnapshot,
    rankLoading,
    devMode,
    isAdmin,
    adminLoading,
    setDevMode,
    getChapterProgress,
    isChapterUnlocked,
    isSectionComplete,
    getLessonsCompleted,
    getTotalLessons,
    markLessonComplete,
    markLessonIncomplete,
    refreshRank,
    refetch: fetchProgress
  };
```

Replace with:

```tsx
  const value: UserProgressContextType = {
    user,
    progress,
    loading,
    authResolved,
    rankSnapshot,
    rankLoading,
    rankUpEvent,
    dismissRankUp,
    devMode,
    isAdmin,
    adminLoading,
    setDevMode,
    getChapterProgress,
    isChapterUnlocked,
    isSectionComplete,
    getLessonsCompleted,
    getTotalLessons,
    markLessonComplete,
    markLessonIncomplete,
    refreshRank,
    refetch: fetchProgress
  };
```

- [ ] **Step 7: Lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 8: Commit**

```bash
git add src/contexts/UserProgressContext.tsx
git commit -m "feat(rank): emit level-up toast and tier-up event from context

Track previous snapshot level via a ref. After each refreshRank, if
the level increased, fire a sonner toast. If the rank tier also
changed, set rankUpEvent for the (incoming) RankUpOverlay to display.
The first refresh after auth is the silent baseline."
```

---

## Task 7: Build RankUpOverlay component

**Files:**
- Create: `src/components/rank/RankUpOverlay.tsx`

- [ ] **Step 1: Create the overlay component**

Create `src/components/rank/RankUpOverlay.tsx` with:

```tsx
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useUserProgress } from "@/contexts/UserProgressContext";
import { cn } from "@/lib/utils";
import { getRankForId } from "@/utils/rankSystem";

const AUTO_DISMISS_MS = 3000;

const RankUpOverlay = () => {
  const { rankUpEvent, dismissRankUp } = useUserProgress();

  useEffect(() => {
    if (!rankUpEvent) return;
    const timeoutId = window.setTimeout(() => {
      dismissRankUp();
    }, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timeoutId);
  }, [rankUpEvent, dismissRankUp]);

  return (
    <AnimatePresence>
      {rankUpEvent ? (
        <motion.div
          key={rankUpEvent.triggeredAt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/40 backdrop-blur-sm"
          onClick={dismissRankUp}
          role="presentation"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/95 px-10 py-8 text-center shadow-glow"
            onClick={(event) => event.stopPropagation()}
          >
            <RankUpContent rankUpEvent={rankUpEvent} />
            <button
              type="button"
              onClick={dismissRankUp}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-border/70 bg-background/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:bg-background/90 hover:text-foreground"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

interface RankUpContentProps {
  rankUpEvent: NonNullable<ReturnType<typeof useUserProgress>["rankUpEvent"]>;
}

const RankUpContent = ({ rankUpEvent }: RankUpContentProps) => {
  const rank = getRankForId(rankUpEvent.rankId);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-25",
          `bg-gradient-to-br ${rank.tone}`,
        )}
      />
      <div className="relative flex flex-col items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Rank Up
        </p>
        <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-background/40 shadow-glow">
          <img
            src={rank.icon}
            alt={`${rank.name} rank icon`}
            className="h-24 w-24 object-contain"
          />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-3xl font-semibold text-foreground">
            {rank.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            You reached Level {rankUpEvent.level}.
          </p>
        </div>
      </div>
    </>
  );
};

export default RankUpOverlay;
```

- [ ] **Step 2: Lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed. The overlay is not yet mounted — that happens in Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/components/rank/RankUpOverlay.tsx
git commit -m "feat(rank): add RankUpOverlay celebration component

Global animated overlay shown when crossing a rank tier. Framer
Motion spring scale-in, click anywhere or wait 3 s to dismiss. Pulls
the active event from UserProgressContext."
```

---

## Task 8: Mount RankUpOverlay in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import the overlay**

In `src/App.tsx`, after the existing `import { UserProgressProvider } from "@/contexts/UserProgressContext";` line, add:

```tsx
import RankUpOverlay from "@/components/rank/RankUpOverlay";
```

- [ ] **Step 2: Render the overlay inside UserProgressProvider**

Replace the current `App` component:

```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProgressProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/platform/lesson/:lessonId" element={<Lesson />} />
            <Route path="/admin/review-slides" element={<AdminReviewSlides />} />
            <Route path="/admin/ranks" element={<AdminRanks />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProgressProvider>
  </QueryClientProvider>
);
```

With:

```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProgressProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RankUpOverlay />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/platform/lesson/:lessonId" element={<Lesson />} />
            <Route path="/admin/review-slides" element={<AdminReviewSlides />} />
            <Route path="/admin/ranks" element={<AdminRanks />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProgressProvider>
  </QueryClientProvider>
);
```

- [ ] **Step 3: Lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 4: Manual end-to-end test (level-up toast + tier-up overlay)**

Run `npm run dev`. Sign in as an admin in dev mode.

Test 1 — silent baseline (no spurious overlay on load):
1. Refresh the Platform page. Confirm NO toast and NO overlay appear on initial load.

Test 2 — same-tier level up (toast only):
1. Open `/admin/ranks`. Select your own user.
2. Set Total XP to `0`. Save Override. (You're now Lv. 1 Novice.)
3. Set Total XP to `200`. Save Override. (You're now Lv. 3 Novice.)
4. Confirm a toast appears: "Level Up! Lv. 3 Novice".
5. Confirm NO overlay appears (still in Novice tier).

Test 3 — tier crossing (toast + overlay):
1. From `/admin/ranks`, set Total XP to `1000`. Save Override.
2. Confirm toast appears: "Level Up! Lv. 11 Bronze".
3. Confirm the overlay appears with the Bronze icon, "Rank Up" headline, "Bronze", "You reached Level 11."
4. Wait 3 s — overlay auto-dismisses.
5. Trigger again with XP `2000` (Lv. 21 Silver). This time, click the overlay or the Continue button to dismiss early. Confirm it dismisses.

Test 4 — XP decrease does not celebrate:
1. From `/admin/ranks`, set Total XP back to `0`. Save Override.
2. Confirm NO toast and NO overlay appear.

Test 5 — passive callsites still work:
1. On `/admin/ranks`, the user list shows passive `RankChip` badges (no `onClick`). Confirm clicking them does nothing — they're not interactive.

If any test fails, fix the issue and re-run. Do not commit until all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(rank): mount RankUpOverlay globally

Renders the celebration overlay once at the app shell so it can fire
from any page after a rank tier crossing."
```

---

## Task 9: Final verification pass

- [ ] **Step 1: Re-run the bug fix verification**

Confirm `/admin/ranks` Save and Clear Override still work end-to-end with no errors. (This guards against any regression from later tasks touching `UserProgressContext`.)

- [ ] **Step 2: Re-run the rank gallery verification**

Click the rank chip on Platform header. Confirm dialog opens, all ranks render correctly, current rank's progress is accurate.

- [ ] **Step 3: Re-run the level-up + tier-up verification**

Use admin override to cross a tier boundary one more time. Confirm both toast and overlay fire. Confirm the rank chip in the header updates to the new rank without a page refresh.

- [ ] **Step 4: Smoke test core flows**

To make sure the context changes didn't break anything:
1. Complete a lesson in Course Mode. Confirm the lesson marks complete and XP refreshes.
2. Sign out and back in. Confirm no spurious toast/overlay on the new session's first load.

- [ ] **Step 5: Final lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 6: Confirm completion with the user**

Report the work complete. Mention the two commits the user must apply manually:
- The SQL migration (already applied in Task 1).
- All other changes are committed to the feature branch.

If any verification step failed, fix and create a follow-up commit. Do not declare done until everything passes.
