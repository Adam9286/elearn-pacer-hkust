# Rank System Polish — Design

**Date:** 2026-04-26
**Scope:** Lean polish of existing rank system. Three deliverables:
1. Fix `admin_set_user_rank_override` schema-cache error.
2. Add a clickable rank gallery (modal) showing all 10 ranks.
3. Add level-up toast + tier-up celebration overlay, plus tier progress label on the rank summary card.

No new XP sources, no leaderboards, no achievements. Existing rank/XP rules are unchanged.

---

## Goals

- Motivate students by making rank progress visible, legible, and rewarding without distracting from ELEC3120 learning.
- Keep the UI clean — additions are read-only references and small celebrations, not new navigation surfaces.
- Fix the admin override bug so dev-mode rank tooling works end-to-end again.

## Non-goals

- Daily streaks, achievement badges, leaderboards. (Rejected scope per user — risk of feature creep on an FYP project.)
- New XP sources or rebalancing of existing XP/caps.
- Server-side level-up event tracking. Detection is client-side only.
- A dedicated `/ranks` route. The gallery lives in a modal.

---

## 1. Bug fix: `admin_set_user_rank_override` schema cache error

### Root cause

The migration file `supabase/migrations/20260426021500_admin_rank_overrides.sql` was placed in the `supabase/migrations/` directory, which per `CLAUDE.md` targets the **examSupabase** project (`oqgotlmztpvchkipslnc` — embeddings, textbooks, exam data).

However, `src/services/rankService.ts` calls `admin_set_user_rank_override` (and the other override RPCs) on the **externalSupabase** client (auth/user data, project ref `dpedzjzrlzvzqrzajrda`). The function and `user_rank_overrides` table never existed on externalSupabase, so PostgREST returns `PGRST202` "Could not find the function ... in the schema cache".

The companion file `docs/sql/external-supabase/20260426_learning_rank_system.sql` (which created `user_rank_snapshots` and `refresh_my_rank_snapshot`) was correctly placed and applied to externalSupabase. The override migration just landed in the wrong directory.

### Fix

1. **Relocate** the migration file:
   - From: `supabase/migrations/20260426021500_admin_rank_overrides.sql`
   - To: `docs/sql/external-supabase/20260426021500_admin_rank_overrides.sql`
   - Rationale: matches the convention used for the original rank system SQL. The `supabase/migrations/` directory is reserved for examSupabase; externalSupabase migrations are tracked in `docs/sql/external-supabase/` and applied manually via the Supabase dashboard SQL editor.
2. **Apply** the SQL on externalSupabase via the Supabase dashboard SQL editor (`https://supabase.com/dashboard/project/dpedzjzrlzvzqrzajrda/sql/new`). The user runs it manually — no Supabase MCP is configured for the externalSupabase project, and adding one for a one-shot fix is unnecessary friction.
3. **Verify**: reload `/admin/ranks`, select a user, save an override, confirm no error toast and that `Override active` badge appears.

The SQL contents do not change — the existing migration is correct, it was just applied to the wrong project. After the move, the file remains idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, policy guards inside `DO $$` blocks).

### Risks

- **None to existing data.** The migration creates a new table (`user_rank_overrides`) and four functions (`is_current_user_admin`, `admin_list_users_for_rank_management`, `admin_set_user_rank_override`, `admin_clear_user_rank_override`). It does not modify any existing table or row.
- **`is_current_user_admin` already exists** on externalSupabase implicitly via the existing admin role checks? Need to verify before applying — if a `public.is_current_user_admin()` already exists with a different signature, `CREATE OR REPLACE` will succeed but might shadow expectations. Mitigation: the implementation file checks `user_roles` table which is the same source of truth used elsewhere, so behavior is consistent.

---

## 2. Rank gallery modal

### UX

- Trigger: clicking the existing `RankChip` (header chip on `Platform.tsx`) opens a shadcn `Dialog`.
- Title: "Learning Ranks".
- Body: vertical list of all 10 ranks (Novice → Legend), top to bottom. Each row contains:
  - Rank icon (32–40px, circular bg matching `tone` gradient at low opacity).
  - Rank name + level range ("Lv. 11 – 20").
  - State indicator on the right:
    - **Locked** (rank is above current): dim text, lock icon (`lucide-react` `Lock`).
    - **Current** (the user's current rank): expanded with progress bar + "Level X of 10 in {RankName}" + "Y/100 XP this level" + "Z XP to next level".
    - **Unlocked** (rank is below current): full color, check icon (`lucide-react` `Check`).
- Footer: a compact "How to earn XP" list, derived from `XP_REWARDS` and `XP_CAPS` constants. Format:
  - Complete a lesson — +100 XP
  - Complete a section — +250 XP
  - Quick practice — +100–200 XP each (cap 3,000)
  - Exam simulation — +100 XP each (cap 1,000)
  - Share a useful mock exam — +150 XP each (cap 1,500)
  - Others using your shared exam — +25 XP each (cap 500)
- Uses `cn` + Tailwind. No new variants needed; reuses existing card/badge/progress styling. Light/dark mode compatible (existing `tone` gradients work in both).

### Component contract

```ts
// src/components/rank/RankLadderDialog.tsx
interface RankLadderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: UserRankSnapshot | null; // current user; null = show gallery without progress
}
```

Stateless w.r.t. rank data — pure read of `rankDefinitions` + the passed snapshot.

### RankChip change

`RankChip.tsx` becomes interactive when given an `onClick` prop. Default behavior (no `onClick`) keeps it a passive badge so existing call sites (e.g. `AdminRanks.tsx`'s user list) don't suddenly become clickable.

```ts
interface RankChipProps {
  snapshot?: UserRankSnapshot | null;
  className?: string;
  size?: "sm" | "md";
  showRankName?: boolean;
  onClick?: () => void; // NEW — when set, renders as a button with hover ring
}
```

`Platform.tsx` (the only header callsite) wires `onClick` to open the dialog and renders `<RankLadderDialog>` alongside.

---

## 3. Level-up toast + tier-up overlay

### Detection (client-side, in `UserProgressContext`)

After every successful `refreshRank`, compare the previous snapshot's `level` to the new snapshot's `level`:

| Old → New | Same rank tier? | Effect |
|---|---|---|
| level unchanged | n/a | nothing |
| level increased, same rank tier | yes | `toast.success` only |
| level increased, crossed rank tier | no | `toast.success` AND enqueue rank-up overlay event |
| level decreased (admin override) | n/a | nothing (no negative celebration; admin tooling only) |

Tier comparison: `getRankForLevel(oldLevel).id !== getRankForLevel(newLevel).id`.

The first refresh after page load is the **baseline** — no toast/overlay. Implementation: track `previousLevelRef` initialized to `null`; only fire effects once `previousLevelRef.current !== null && newLevel > previousLevelRef.current`.

### Toast format

```
Level Up — Lv. 12 Bronze
+XP earned · keep going
```

Uses `sonner` (already in stack). Default variant. Auto-dismiss.

### Rank-up overlay

```ts
// src/components/rank/RankUpOverlay.tsx
interface RankUpEvent {
  rankId: RankId;
  rankName: string;
  level: number;
}

interface RankUpOverlayProps {
  event: RankUpEvent | null;
  onDismiss: () => void;
}
```

- Centered fixed overlay with backdrop blur (low opacity — non-blocking).
- Framer Motion: scale `0.6 → 1`, opacity `0 → 1`, ease out, ~300ms.
- Auto-dismiss after 3000ms; click anywhere to dismiss earlier.
- Content: rank icon (large, 96–128px), "Rank Up!" headline, new rank name + level, subtle gradient background using the rank's `tone`.
- Only one overlay at a time. If two refreshes back-to-back somehow produce two tier-ups (unrealistic but defensive), the latest wins — the previous one is cleared.

### Wiring

`UserProgressContext` exposes:
```ts
rankUpEvent: RankUpEvent | null;
dismissRankUp: () => void;
```

`<RankUpOverlay>` is mounted once at the top of `App.tsx` (or directly inside `UserProgressProvider`), reading from context. It's a global UI affordance, not per-page.

---

## 4. RankSummaryCard tier progress

Add one line beneath the rank name in `RankSummaryCard.tsx`:

```
Level 4 of 10 in Bronze
```

Computed as: `(snapshot.level - rank.minLevel + 1)` of `(rank.maxLevel - rank.minLevel + 1)`. For the max rank (Legend, levels 91–100), the line still works — at level 100 it reads "Level 10 of 10 in Legend".

No new props; purely additive rendering.

---

## File-level change list

### New files
- `src/components/rank/RankLadderDialog.tsx`
- `src/components/rank/RankUpOverlay.tsx`
- `docs/sql/external-supabase/20260426021500_admin_rank_overrides.sql` (moved from `supabase/migrations/`)

### Edited files
- `src/components/rank/RankChip.tsx` — add optional `onClick` prop, render as `button` when set.
- `src/components/rank/RankSummaryCard.tsx` — add tier progress line.
- `src/contexts/UserProgressContext.tsx` — track previous level, emit toast + rank-up event on level transitions, expose `rankUpEvent` + `dismissRankUp`.
- `src/pages/Platform.tsx` — wire `RankChip onClick` → opens `RankLadderDialog`. Render dialog.
- `src/App.tsx` — render `<RankUpOverlay>` at the top level (inside `UserProgressProvider`).

### Deleted files
- `supabase/migrations/20260426021500_admin_rank_overrides.sql` (moved, not deleted in the destructive sense — its replacement at `docs/sql/external-supabase/` is identical).

---

## Testing plan

Manual verification (no automated tests; the project's TypeScript strict mode is intentionally off and there's no test suite for context).

1. **Bug fix verification:**
   - Apply SQL on externalSupabase via dashboard.
   - As admin in dev mode, navigate to `/admin/ranks`, save an override, confirm success toast and `Override active` badge.
   - Clear override, confirm normal progression resumes.

2. **Rank gallery:**
   - Click rank chip in Platform header. Dialog opens.
   - Confirm all 10 ranks listed in order, with correct lock/current/unlocked states based on current level.
   - Confirm current rank shows progress bar and "Level X of 10 in {Rank}" text.
   - Confirm "How to earn XP" list renders with correct values.
   - Test in light and dark mode.
   - Test on small screen (mobile width) — modal should remain readable.

3. **Level-up toast:**
   - Use admin override to set XP to 99 (just below level 2). Refresh.
   - Use override to set XP to 100. Confirm toast: "Level Up — Lv. 2 Novice".
   - No tier-up overlay (Novice 1 → Novice 2 stays in same tier).

4. **Rank-up overlay:**
   - Set XP to 999 (Lv. 10 Novice). Refresh.
   - Set XP to 1000 (Lv. 11 Bronze). Confirm overlay appears with Bronze icon, dismisses after 3s, click-to-dismiss works.
   - Confirm toast also fires.

5. **No regressions:**
   - First page load after sign-in: no spurious toast/overlay.
   - Dev mode override that *lowers* XP: no celebration.
   - `RankChip` in `AdminRanks.tsx` user list (no `onClick`) remains a passive badge.

---

## Open questions

None. All scope locked in conversation:
- Lean polish (option A), not full gamification.
- Modal-based gallery (option A), not dedicated page.
- Toast + tier-up overlay (option B), not silent or toast-only.
- Easy path for SQL fix (manual dashboard apply), no MCP setup.
