# Platform Home Redesign — Design Spec

**Date:** 2026-04-25
**Status:** Draft, awaiting user review

## Problem

The in-app "How It Works" tab is filler for the target user (busy HKUST ELEC3120 students). It mixes two unrelated jobs into one tab:

1. **Marketing content** for a logged-in audience that has already converted (ChatGPT vs LearningPacer comparison, citation guarantee, limitations disclosure).
2. **Progress tracking** (Learning Journey Timeline) buried where engaged users won't find it.

Separately, returning users hit the full marketing landing page on every visit to `/`, with no hard redirect or personalization. The platform also doesn't remember the last-used mode — every fresh visit to `/platform` drops them in Chat regardless of where they were last working.

## Goals

- Remove the "How It Works" tab from the in-app tab strip.
- Eliminate repetitive landing-page friction for returning users.
- Make `/platform` feel like a true "home" — surfaces motivation (progress) and last activity (resume CTA).
- Persist last-used mode so reload / re-open returns the user to where they were.
- Preserve the existing landing page in full for first-time visitors and shareable URLs.

## Non-goals

- No redesign of the landing page hero or `ModesShowcase` content.
- No new analytics, recommendations, or "what's new" announcement system.
- No changes to the modes themselves (Chat, Course, Exam, Simulations, Compare).
- No changes to authentication.

---

## Architecture changes

Three coordinated changes:

1. **Delete the "How It Works" tab** from [Platform.tsx](src/pages/Platform.tsx). Remove the `info` tab trigger, content slot, and `HowItWorks` import.
2. **Add a hard redirect** in [Landing.tsx](src/pages/Landing.tsx): if a logged-in user hits `/`, redirect to `/platform`. Logged-out users see the landing page unchanged.
3. **Add a welcome panel** at the top of [Platform.tsx](src/pages/Platform.tsx), above the tab strip, containing a "Resume" CTA and a relocated, compact Learning Journey Timeline.

Plus one supporting change:

4. **Persist `activeMode`** to `localStorage` so the resume CTA and tab state both reflect the user's actual last activity.

---

## Component-level changes

### 1. `src/pages/Landing.tsx` — auth-aware redirect

At the top of the component, read `user` from `UserProgressContext` (the existing auth source per `CLAUDE.md`'s rule that auth uses `externalSupabase`). If `user` is present and auth has finished loading, `useNavigate` to `/platform` with `replace: true` so the landing page does not stay in browser history.

Loading state: while `loading` is true, render nothing (or the existing initial state). Do not flash the marketing page before redirecting.

Escape hatch: a small "About" link in the platform footer (or header) lets a logged-in user navigate to `/?marketing=1` (or similar) which bypasses the redirect, in case they want to share or revisit the landing page. Implementation detail to confirm during planning — possibly just rely on opening `/` in a new incognito tab and skip the in-app link entirely.

### 2. `src/pages/Platform.tsx` — welcome panel and tab cleanup

**Remove:**
- `import HowItWorks from "@/components/HowItWorks"` (line 10)
- The `info` entry in `overflowModes` (line 34)
- The `info` tab trigger and the `<TabsContent value="info">` slot (around lines 195–216 and 242–244)

**Add:** a `<PlatformWelcome />` component rendered above the `<Tabs>` block. It shows:
- A heading: "Welcome back, [first name]" (fall back to "Welcome back" when no name is on the profile).
- A primary "Resume [Mode Name]" button that sets `activeMode` to the persisted last-used mode (default "chat" on first visit).
- A compact Learning Journey Timeline (extracted from `HowItWorks.tsx`).

The welcome panel is sticky-on-scroll? **No** — let it scroll out of the way once the user is working in a tab.

The welcome panel hides itself if the user has no progress AND no last-used mode is persisted, so first-time logged-in users aren't shown an empty progress timeline. Show only the resume CTA in that case (or hide entirely and let the user pick a tab).

### 3. `src/components/platform/PlatformWelcome.tsx` — new file

New component. Reads:
- `user` and `progress` from `UserProgressContext`.
- Last-used mode from `localStorage` (key: `lp.lastMode`).

Renders:
- Greeting header.
- Resume CTA → calls a prop callback `onResume(mode)` so `Platform.tsx` can flip `activeMode`.
- `<LearningJourneyTimelineCompact />` — a slimmer variant of the existing Learning Journey Timeline. Either lift the existing component into a shared file and add a `compact` prop, or extract a separate compact version. Decision: lift and parameterize — fewer duplicated branches.

### 4. `src/components/HowItWorks.tsx` — partial extraction, then deletion

The Learning Journey Timeline component lives inside `HowItWorks.tsx` today. Move it to its own file (e.g. `src/components/platform/LearningJourneyTimeline.tsx`) so it can be imported by `PlatformWelcome.tsx` without pulling in the rest of `HowItWorks`. Once the timeline is extracted, delete `HowItWorks.tsx` entirely.

The other sections (`ComparisonSection`, `SourceProofSection`, `ExamPracticeSection`, `LimitationsSection`) are deleted with the file. The trust messaging they carried lives on the landing page already (see `ModesShowcase`, `ProofSection`); no migration needed unless a quick audit shows the landing page is missing the ChatGPT-comparison framing — defer that audit to the implementation plan.

### 5. Mode persistence — `localStorage`

In `Platform.tsx`:
- On mount, read `localStorage.getItem("lp.lastMode")`. Use it as `initialMode` if `location.state?.mode` is not set, falling back to `"chat"` if neither is set.
- In a `useEffect` keyed on `activeMode`, write the new value to `localStorage`.
- Treat `info` as an invalid persisted value (since the tab is being removed) — if it is read, fall back to `"chat"` to avoid landing on a deleted tab.

Storage key: `lp.lastMode`. Schema: a single string matching one of the valid mode IDs.

---

## Data flow

```
Visit /
  ├── logged-out → Landing page renders normally
  └── logged-in  → useEffect → navigate("/platform", { replace: true })

Visit /platform
  ├── read localStorage["lp.lastMode"] → fallback "chat"
  ├── PlatformWelcome renders above tabs
  │     ├── "Resume <mode>" button → onResume(mode) → setActiveMode(mode)
  │     └── LearningJourneyTimeline (compact)
  └── Tabs render below; setActiveMode → useEffect → write localStorage
```

## Error handling

- `localStorage` read failure (privacy mode, quota): swallow and fall back to `"chat"`.
- `localStorage` write failure: swallow silently. Persistence is a UX nicety, not a correctness requirement.
- Auth still loading on `/`: render nothing until `loading === false`, then either redirect or show the landing page. Avoids the marketing page flashing for logged-in users.

## Testing

This codebase does not enforce a testing standard for UI changes. Manual verification path:

1. Visit `/` while logged out → see full landing page.
2. Log in, then visit `/` → redirected to `/platform` immediately (no hero flash).
3. On `/platform`, see welcome panel with Resume CTA and progress timeline.
4. Switch to Course tab → reload page → tab returns to Course (not Chat).
5. Click "Resume" with last mode = Course → tab switches to Course.
6. Confirm "How It Works" tab is gone from the tab strip.
7. Confirm landing page still renders for logged-out users via incognito window.

---

## Migration / cleanup

- Delete `src/components/HowItWorks.tsx` after extracting the Learning Journey Timeline.
- Delete the import in `Platform.tsx`.
- The Learning Journey Timeline becomes a real component file under `src/components/platform/`.
- No database changes. No API changes.

## Out-of-scope follow-ups (not part of this work)

- A smart "next step" recommendation in the welcome panel (e.g. "You've finished 5 lessons since your last mock exam — try one now"). Defer until there's data to make the recommendation accurate.
- "What's new" announcements in the welcome panel. Defer until there's something to announce.
- Reinforcing the citation guarantee as a per-message badge inside Chat. Worth doing eventually but not part of the home-redesign scope.
