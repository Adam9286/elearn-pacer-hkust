# Handoff: LearningPacer Landing Page Redesign

## Overview
This is a high-fidelity design prototype for the **LearningPacer** landing page — an AI-guided learning platform built for HKUST ELEC3120 (Computer Networks). The landing page has 7 sections: Hero, Credibility Strip, Four Modes, Proof/Stats, Simulation Showcase, Testimonial, and Final CTA.

## About the Design Files
The files in this bundle are **design references created in HTML/React/Babel** — prototypes showing exact intended look, layout, and interactive behavior. Your task is to **recreate these designs in the existing codebase** using:
- React 18 + TypeScript
- Vite
- Tailwind CSS v3
- shadcn/ui
- Framer Motion (for animations specified below)
- lucide-react (for icons)
- `@/` path aliases

File to implement: `src/pages/Landing.tsx` + component files under `src/components/landing/`.

## Fidelity
**High-fidelity.** Recreate pixel-perfectly. Colors, typography, spacing, border radii, animations, and copy are all final and must match the prototype exactly.

---

## Design Tokens

### Colors
```ts
// Use these as Tailwind arbitrary values or extend tailwind.config
bg:         '#030816'   // page background
bgAlt:      '#060d1f'   // alternate dark section bg
bgCard:     '#0f1720'   // mode card background
cyan:       '#22d3ee'   // primary accent (tailwind: cyan-400)
amber:      '#f97316'   // secondary accent (tailwind: orange-500)
green:      '#4ade80'   // course card accent (tailwind: green-400)
purple:     '#a78bfa'   // exam card accent (tailwind: violet-400)
white:      '#f0f4ff'   // primary text
muted:      '#6e82a4'   // secondary text
border:     'rgba(34,211,238,0.1)'
borderHover:'rgba(34,211,238,0.3)'
```

### Typography
```ts
// Display / headings
fontFamily: 'Inter Tight'  // weights: 400, 500, 600, 700, 800, 900
// Mono labels, captions, code
fontFamily: 'JetBrains Mono'  // weights: 400, 500, 600

// Load via Google Fonts:
// Inter Tight: 300,400,500,600,700,800,900
// JetBrains Mono: 400,500,600
```

### Spacing & Radii
```
Section vertical padding:  7rem (112px) top/bottom
Card border-radius:        16px
Card internal padding:     20px (24px in spec)
Card gap:                  24px
Max content width:         1400px (modes section), 1200px (sim section), 1100px (proof), 640px (CTA)
Page horizontal padding:   2.5rem (40px)
```

### Shadows & Glows
```css
/* Card hover glow — per accent color */
box-shadow: 0 20px 60px -20px {accentColor}4d;
/* CTA pulse */
@keyframes cyanPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,0) } 50% { box-shadow: 0 0 18px 4px rgba(34,211,238,0.35) } }
```

---

## Section-by-Section Spec

### 1. Navbar (`src/components/landing/Navbar.tsx`)

**Behavior:** Fixed top, transparent initially. On scroll > 40px: `bg-[#030816]/92 backdrop-blur-xl border-b border-[rgba(34,211,238,0.1)]`. Transition: 350ms.

**Layout:** `height: 58px`, flex row, space-between, `px-10`.

**Left:** Logo mark (26×26px, border-radius 5px, gradient `from-[#22d3ee] to-[#0e7490]`, text "LP" in JetBrains Mono 10px weight-800 color #030816) + "LearningPacer" (Inter Tight 15px weight-800 tracking-tight white). Both `flex-shrink: 0`.

**Right:** Nav links ["Modes", "How It Works", "Sign In"] — Inter Tight 13px weight-500 color `#6e82a4`, hover → `#f0f4ff`, `white-space: nowrap`, 350ms transition. Gap between links: `1.75rem`. Then primary CTA button "Start Learning" — `bg-[#22d3ee] text-[#030816] px-4 py-1.5 rounded-md font-extrabold text-[13px] flex-shrink-0 white-space-nowrap hover:opacity-80`.

---

### 2. Hero (`src/components/landing/Hero.tsx`)

**Layout:** `position: relative`, `height: 100vh`, `min-height: 560px`, overflow hidden, flex column, justify-center.

**Video:**
- `src`: `/hero.mp4` (the new video file — copy `uploads/jimeng-2026-04-24-5729-COMPUTER NETWORKS hero video for a landi....mp4` to `public/hero.mp4`)
- `poster`: `/hero-poster.jpg`
- `autoPlay muted playsInline` — plays once, no loop, holds final frame
- `object-fit: cover`, `position: absolute inset-0 w-full h-full z-0`

**Overlays (stacked, position absolute inset-0):**
1. Letterbox top band: `top-0 left-0 right-0 h-[3.5vh] bg-black z-[2]`
2. Letterbox bottom band: `bottom-0 left-0 right-0 h-[3.5vh] bg-black z-[2]`
3. Radial vignette: `radial-gradient(ellipse 110% 100% at 60% 50%, transparent 30%, rgba(3,8,22,0.75) 80%, rgba(3,8,22,0.95) 100%)` z-[1]
4. L-R gradient: `linear-gradient(to right, rgba(3,8,22,0.92) 0%, rgba(3,8,22,0.6) 45%, rgba(3,8,22,0.05) 100%)` z-[1]
5. Bottom fade: `bottom-0 h-[180px] linear-gradient(to bottom, transparent, #030816)` z-[3]
6. Film grain: CSS `::after` pseudo with SVG feTurbulence noise at `opacity: 0.03`, `mix-blend-mode: overlay` z-[5]

**Content** (`position: relative z-[4] px-10 max-w-[680px] pt-[3.5vh]`):

**Supra-head:** JetBrains Mono 10px weight-500 tracking-[0.16em] uppercase color `#f97316`. Text: `ELEC3120 · COMPUTER NETWORKS · HKUST`. Animate in with opacity 0→1 + translateY 8px→0 at 500ms ease-out, triggered when `wordsIn` state is true.

**Headline animation:**
- Split headline into words: `['Every','click','travels','12,000','miles','—','and','you\'re','about','to']` (white) + `['understand','all','of','it.']` (cyan `#22d3ee`)
- Each word is a `<span>` with `display: inline`, animated from `opacity: 0, translateY: 10px` → visible with 400ms ease-out
- Stagger: 60ms delay per word index
- Trigger: `wordsIn` state set to true
- Font: Inter Tight, `clamp(1.9rem, 3.2vw, 3.25rem)`, weight-900, line-height 1.1, tracking `-0.04em`, margin-bottom `0.75rem`

**`wordsIn` trigger logic:**
```ts
useEffect(() => {
  const fallback = setTimeout(() => setWordsIn(true), 800); // always fires
  const v = videoRef.current;
  if (!v) return () => clearTimeout(fallback);
  const fn = () => { clearTimeout(fallback); setTimeout(() => setWordsIn(true), 300); };
  v.addEventListener('canplay', fn, { once: true });
  return () => clearTimeout(fallback);
}, []);
```

**Subtitle:** `clamp(0.9rem, 1.2vw, 1.05rem)` weight-400 line-height 1.6 color `#6e82a4` max-w `440px` mb `1.25rem`. Animate in at 500ms delay 700ms.
Text: `"Four AI-guided learning modes built on your actual syllabus. Pass the exam by understanding what's really happening."`

**CTAs** (flex row, gap `0.875rem`, flex-wrap):
1. **Primary:** "Start Learning" — `bg-[#22d3ee] text-[#030816] px-7 py-3 rounded-lg font-extrabold text-[15px] tracking-tight white-space-nowrap`. Add `animation: cyanPulse 2.5s ease-in-out infinite` (keyframe: box-shadow pulses cyan glow). Hover: opacity 0.87 + translateY(-2px).
2. **Ghost:** "Watch the Walkthrough" — transparent bg, `border border-white/20 rounded-lg px-5 py-3 font-semibold text-[14px]`. Left side: animated play icon with a `playPing` ring animation (`@keyframes playPing { 0% { transform: scale(1); opacity: 0.6 } 100% { transform: scale(1.7); opacity: 0 } }` on an absolute border ring). Hover: border-white/40 + translateY(-2px).

**Scroll chevron:** `position absolute bottom-[5vh] left-1/2 -translate-x-1/2 z-[4]` color `rgba(240,244,255,0.28)`. Animation: `bob 2.2s ease-in-out infinite` (`translateY 0 → 7px → 0`). Hides when `scrollY > 60px`.

---

### 3. Credibility Strip (`src/components/landing/CredStrip.tsx`)

Thin bar directly below hero. `border-b border-[rgba(34,211,238,0.1)] bg-white/[0.01] py-3.5 px-10 flex items-center gap-5`.

**Left:** HKUST crest — 28×28px SVG placeholder with `rx=4 fill=rgba(34,211,238,0.08) stroke=rgba(34,211,238,0.2)` and "HK" text in JetBrains Mono 10px cyan. Replace with actual HKUST logo SVG if available.

**Divider:** `w-px h-5 bg-[rgba(34,211,238,0.1)]`

**Text:** JetBrains Mono 10px tracking-[0.14em] uppercase color `rgba(138,154,184,0.5)`.
Content: `"Built for ELEC3120 · Computer Networks · Spring 2026 cohort"`

---

### 4. Modes Showcase (`src/components/landing/ModesShowcase.tsx`)

**Section:** `py-28 px-10 relative overflow-hidden`. Behind grid: `position absolute` radial glow `radial-gradient(ellipse, rgba(34,211,238,0.04), transparent 70%)` 800×400px centered.

**Heading block** (max-w `1400px` mx-auto):
- Kicker: JetBrains Mono 10px tracking-[0.15em] uppercase `#f97316` mb `0.875rem`
- H2: Inter Tight `clamp(2rem, 4.5vw, 4.5rem)` weight-600 tracking-tight white lh 1.0 mb `0.625rem`. Text: `"Everything you need\nto ace ELEC3120."`
- Subtitle: 1rem `#6e82a4` max-w `420px` lh 1.6 mb `3.5rem`

**Grid:** CSS Grid. Classes: `grid grid-cols-4 gap-6` at `min-width: 1280px`, `grid-cols-2` at tablet, `grid-cols-1` at mobile.

**Card base styles:**
```css
background: #0f1720;
border: 1px solid rgba(34,211,238, 0.1);
border-radius: 16px;
min-height: 420px;
display: flex; flex-direction: column;
overflow: hidden;
transition: border-color 240ms ease-out, transform 240ms ease-out, box-shadow 240ms ease-out;
```
**Card hover:**
```css
border-color: {accentColor}66;  /* 40% opacity */
transform: translateY(-2px);
box-shadow: 0 20px 60px -20px {accentColor}4d;
```

**Card header** (`p-5 pb-3.5 flex items-center gap-2.5`):
- Icon box: 32×32px `rounded-lg` bg `{accentColor}14` border `{accentColor}22`, centered icon (18×18px lucide, stroke `{accentColor}`)
- Title: Inter Tight 13px weight-700 tracking-tight white `white-space: nowrap overflow-hidden text-ellipsis`
- Three dots: `ml-auto flex gap-1` — three 4×4px circles `bg-white/10 rounded-full`
- Gradient divider below header: `h-px bg-gradient-to-r from-{accentColor}/[0.13] via-white/[0.025] to-transparent`

**Card footer** (`p-3 px-5 border-t border-white/[0.04] bg-white/[0.01]`):
- Description text: 12px `#6e82a4` lh 1.5

#### Card 1 — AI Chat Tutor (accent: `#22d3ee`)
Icon: `MessageSquare` from lucide-react

**Body** (flex column, gap 12px, p-5, overflow hidden):

Student bubble:
- Avatar: 24×24 circle `bg-white/[0.06] border border-white/10` text "Y" 10px weight-700 `rgba(240,244,255,0.5)`
- Bubble: `bg-white/[0.05] border border-white/[0.07]` rounded `4px 12px 12px 12px` p `9px 12px` text 12px `rgba(240,244,255,0.75)` lh 1.5
- Content: `"Why does TCP use sliding window for reliability?"`

AI bubble:
- Avatar: 24×24 circle `bg-[#22d3ee]/15 border border-[#22d3ee]/25` text "AI" JetBrains Mono 8px weight-700 `#22d3ee`
- Bubble: `bg-[#22d3ee]/[0.05] border border-[#22d3ee]/[0.12]` rounded `4px 12px 12px 12px` p `9px 12px`
- Text 12px `rgba(240,244,255,0.8)` lh 1.6 mb 8px: `"LearningPacer AI: TCP uses a sliding window to efficiently utilize the network while ensuring reliable delivery. Multiple packets can be in-flight simultaneously without waiting for individual ACKs — up to the window size."`
- On card hover: append blinking cursor `▋` in cyan after the text (css `animation: pulse 0.7s infinite`)
- Citation chip: `inline-flex items-center gap-1.5 bg-[#22d3ee]/[0.08] border border-[#22d3ee]/15 rounded px-2 py-0.5`
  - Link icon (lucide `Link` 10px `#22d3ee`) + JetBrains Mono 10px cyan: `"Cited: Kurose & Ross, Ch. 3.7"`

Input bar (`mt-auto flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2`):
- Placeholder text 12px `rgba(240,244,255,0.2)` flex-1: `"Ask anything…"`
- Send button: 22×22 circle `bg-[#22d3ee]` with arrow-right icon `stroke-[#030816]`

#### Card 2 — Guided Lessons (accent: `#4ade80`)
Icon: `BookOpen` from lucide-react, stroke `#4ade80`

**Body** (p-5, flex column):

Section label: JetBrains Mono 10px `#4ade80` tracking-[0.12em] uppercase mb 12px: `"Transport Layer"`

Course rows (6 rows, `py-1.5 border-b border-white/[0.04]`):
```
State icon (24px flex-shrink-0):
  done  → "✓" in #22d3ee
  active→ "▶" in #4ade80
  locked→ "🔒" in rgba(240,244,255,0.18)
  none  → "" in rgba(240,244,255,0.25)
Label (12px weight-400/600 for active):
  done   → rgba(240,244,255,0.85)
  active → rgba(240,244,255,0.85) weight-600
  locked → rgba(240,244,255,0.30)
  none   → rgba(240,244,255,0.30)
Progress bar (if pct > 0 and not locked):
  44px wide, 3px tall, bg white/7, bar color:
    done   → #22d3ee
    active → #4ade80
  + pct label JetBrains Mono 10px right-aligned
```

Row data:
| ID    | Label                     | State  | Pct |
|-------|---------------------------|--------|-----|
| 3.1a  | 3.1 TCP Reliability       | done   | 87  |
| 3.1b  | 3.1 Sliding Window        | active | 62  |
| 3.2   | 3.2 Sequence Numbers      | none   | 0   |
| 3.3   | 3.3 ACK Strategies        | none   | 0   |
| 3.4   | 3.4 Retransmission (RTO)  | locked | 0   |
| 3.5   | 3.5 Congestion Control    | none   | 0   |

**On hover:** animate active row's progress bar from 20% → 62% over ~600ms.

Bottom progress bar (mt 14px):
- Label flex row: JetBrains Mono 11px `rgba(240,244,255,0.3)` "Course progress" + `#f97316` "62%" right
- Bar: 3px tall, `bg-gradient-to-r from-[#22d3ee] to-[#f97316]` at 62% width, bg `white/[0.06]`

#### Card 3 — Simulations (accent: `#f97316`)
Icon: `Zap` from lucide-react, stroke `#f97316`

**Body** (p-5, flex column):

Column headers (grid 3-col `1fr 32px 1fr` gap-1 mb 10px):
- "Sender" and "Receiver": 11px weight-700 `rgba(240,244,255,0.5)` centered, `bg-white/[0.04] rounded-lg py-1`

Sequence arrows (6 rows, gap-1):
```
Direction →: [line spanning left col] [label centered] [empty right col]
Direction ←: [empty left col]         [label centered] [line spanning right col]

Line: h-px bg-white/12, on active: bg = accentColor of that step
Label: JetBrains Mono 10px weight-600, inactive: rgba(240,244,255,0.4), active: step accent
Active moving dot: absolute 6×6px circle on the line with glow box-shadow

Opacity: active or past steps = 1.0; future steps = 0.25
```

Steps (cycle through on hover, 700ms interval):
| Step | Dir | Label      | Color    |
|------|-----|------------|----------|
| 0    | →   | SYN        | #22d3ee  |
| 1    | ←   | SYN-ACK    | #4ade80  |
| 2    | →   | ACK        | #22d3ee  |
| 3    | →   | DATA (1–4) | #f97316  |
| 4    | ←   | ACK (5)    | #4ade80  |
| 5    | →   | DATA (5–8) | #f97316  |

**Controls** (mt-auto pt-3 border-t border-white/[0.05] flex items-center gap-2):
- "Speed 1.0x" label JetBrains Mono 11px `rgba(240,244,255,0.3)` flex-1
- Pause button: `bg-[#f97316]/[0.08] border border-[#f97316]/20 rounded px-3 py-1 text-[#f97316]` JetBrains Mono 11px — shows "▶ Play" when not hovered, "⏸ Pause" on hover
- Reset button: `bg-white/[0.04] border border-white/[0.07] rounded px-2.5 py-1 text-white/30` JetBrains Mono 11px "↺"

#### Card 4 — Mock Exams (accent: `#a78bfa`)
Icon: `ClipboardList` from lucide-react, stroke `#a78bfa`

**Body** (p-5, flex column):

Row 1: JetBrains Mono 10px `#a78bfa` tracking-[0.10em] uppercase mb 10px: `"Q12 of 20"`

Question: 12px weight-500 `rgba(240,244,255,0.85)` lh 1.55 mb 12px:
`"In TCP, which of the following best describes the purpose of the congestion window (cwnd)?"`

Options (4 rows, gap-1.5):
Each: `flex items-start gap-2 px-2.5 py-1.75 rounded-md cursor-pointer border transition-all duration-240`

Option data:
| Letter | Text                                                    | Correct |
|--------|---------------------------------------------------------|---------|
| A      | Ensure reliable delivery of packets in order            | No      |
| B      | Control the sender's rate based on network congestion   | Yes ✓   |
| C      | Handle out-of-order packet reassembly                   | No      |
| D      | Manage source and destination port numbers              | No      |

Option default state (unselected): `border-white/[0.06] bg-transparent`
Option selected correct: `border-[#22d3ee]/25 bg-[#22d3ee]/[0.05]` — radio dot `bg-[#22d3ee]`, text `rgba(240,244,255,0.9)`, ✓ icon `#22d3ee`
Option selected wrong: `border-[#f97316]/25 bg-[#f97316]/[0.05]` — radio dot `bg-[#f97316]`, text `rgba(240,244,255,0.9)`

Radio circle: 18×18px circle border `1.5px`, inner dot 7×7px
Letter label: JetBrains Mono 10px (accent color if selected)
Text: 12px

**Pre-selected state:** Option B is pre-selected (correct) by default.
**On hover:** correct answer highlight pulses (opacity oscillates 0.05 → 0.12) at 900ms interval.

Score ring (mt-auto pt-2.5 border-t border-white/[0.05] flex items-center justify-end gap-2.5):
- Text: JetBrains Mono 11px `#22d3ee` "✓ Correct"
- Ring: 44×44px SVG — outer circle `stroke-white/[0.05]`, inner arc `stroke-[#22d3ee]` at `92%` fill, stroke-dasharray/offset technique, rotate -90deg. Center text: Inter Tight 11px weight-800 `#22d3ee` "92%"
- When wrong answer selected: ring drops to 30%, color switches to `#f97316`

---

### 5. Proof / Stats (`src/components/landing/ProofSection.tsx`)

**Section:** `py-20 px-10 border-t border-b border-[rgba(34,211,238,0.1)] bg-white/[0.01] relative overflow-hidden`. Add `<AmbientNetwork>` canvas absolutely positioned at opacity 0.06.

**Heading block** (max-w `1100px` mx-auto, text-center):
- Kicker: JetBrains Mono 10px `#f97316` tracking uppercase mb `0.8rem`: `"PROVEN RESULTS"`
- H2: Inter Tight `clamp(1.75rem, 3vw, 2.75rem)` weight-900 tracking-tight white mb `0.5rem`: `"Built to help you actually understand."`
- Subtitle: `0.95rem` `#6e82a4` mb `3rem`: `"Real results from real ELEC3120 students."`

**Stats grid:** CSS Grid, 4 columns, `gap-px bg-[rgba(34,211,238,0.1)] rounded-xl overflow-hidden border border-[rgba(34,211,238,0.1)]`

Each stat cell: `bg-[#030816] text-center p-8`
- Ring SVG (position absolute top-2 right-2 opacity-0.18, 52×52px): circle `r=20` stroke `accentColor` at `pct%` fill via dasharray/dashoffset
- **Count-up number:** Use `IntersectionObserver` to trigger count animation on scroll-into-view. RAF loop from 0 → final value over 1200ms. Inter Tight `2.25rem` weight-900 tracking-tight color `accentColor`
- Label: 13px weight-600 white
- Sub: JetBrains Mono 10px `#6e82a4`

| Stat  | Label              | Sub              | Color   | Ring |
|-------|--------------------|------------------|---------|------|
| 87%   | Practice Score     | avg. improvement | #22d3ee | 87   |
| 92%   | Concepts Mastered  | of syllabus      | #f97316 | 92   |
| 4,812 | Students Helped    | ELEC3120 learners| #22d3ee | —    |
| 50K+  | Questions Answered | by AI Tutor      | #f97316 | —    |

Footer note: JetBrains Mono 10px `rgba(138,154,184,0.35)` tracking text-center mt `1.25rem`:
`"ELEC3120 Spring 2026 · Week 9 of 13 · Data updated daily"`

---

### 6. Simulation Showcase (`src/components/landing/SimulationShowcase.tsx`)

**Section:** `py-24 px-10 bg-[#060d1f] border-t border-[rgba(34,211,238,0.1)] relative overflow-hidden`. Add `<AmbientNetwork>` at opacity 0.05.

**Layout:** max-w `1200px` mx-auto. Grid `grid-cols-[260px_1fr]` gap `2.75rem`.

**Left column:**
- Kicker + H2 + body text + bullet list + "Explore all simulations →" button (same pattern as spec above)
- H2: `"Simulations that make concepts click."` at `clamp(1.9rem, 3.5vw, 3rem)` weight-900

**Right column — Simulation panel:**

Panel container: `border border-[rgba(34,211,238,0.1)] rounded-xl overflow-hidden bg-[#060d1f]/85`

Panel header (`flex items-center justify-between px-3.5 py-2.5 border-b border-[rgba(34,211,238,0.1)] bg-white/[0.015]`):
- Traffic lights: 3 circles 9×9px colors `#ff5f57 #febc2e #28c840` opacity 0.65
- Title: JetBrains Mono 10px `rgba(240,244,255,0.4)` "TCP Sliding Window Simulation" + badge "Lab 2.2" `bg-[#22d3ee]/[0.07] text-[#22d3ee]/40 px-1.5 py-0.5 rounded text-[9px]`
- Controls: Speed `<select>` styled dark + Pause/Play button `bg-[#22d3ee]/[0.07] border-[#22d3ee]/18 text-[#22d3ee]` + Reset button

Panel body (`grid grid-cols-[1fr_130px]`):
- Canvas area (`aspect-video relative`): HTML5 Canvas running a packet routing visualization (see below)
- Stats sidebar (`p-3.5 border-l border-[rgba(34,211,238,0.1)] flex flex-col gap-3 justify-center`): 4 stats updating in real time

**Canvas visualization (packet routing):**
7 nodes: Client (0.1, 0.5), Router A (0.3, 0.25), Router B (0.3, 0.75), Router C (0.55, 0.15), Switch (0.55, 0.5), Router D (0.55, 0.85), Server (0.85, 0.5) — positions as fractions of canvas size.

Edges: src→r1, src→r2, r1→r3, r1→r4, r2→r4, r2→r5, r3→dst, r4→dst, r5→dst.

3 animated packets with radial glow:
- Path A: src→r1→r3→dst, color `#22d3ee`, speed 0.003
- Path B: src→r2→r4→dst, color `#f97316`, speed 0.0025, offset 0.33
- Path C: src→r1→r4→dst, color `#818cf8`, speed 0.0035, offset 0.66

Draw each packet as: radial glow (r=13) + solid dot (r=3.5). Edges as `rgba(34,211,238,0.11)` 1px lines. Nodes as circle strokes with labels below.

"Live" badge: absolute top-2 left-2, `bg-[#030816]/75 backdrop-blur px-2 py-1 rounded`, green dot + "LIVE" JetBrains Mono 8px.

Stats (updating every ~55 frames): Packets Sent, ACKs Received, Throughput (Mbps), RTT (ms). Labels JetBrains Mono 8px `#6e82a4`, values Inter Tight 15px weight-800 white.

**Thumbnail strip** (4-col grid, gap-2, mt-2):
| Lab   | Title                     | Active |
|-------|---------------------------|--------|
| Lab 1.1 | Routing & Shortest Path | Yes (cyan border) |
| Lab 2.2 | UDP vs TCP              | No    |
| Lab 3.3 | Congestion Control      | No    |
| Lab 4.4 | DNS Resolution          | No    |

Each: `border rounded-lg px-3 py-2.5 cursor-pointer`. Active: `border-[#22d3ee]/22 bg-[#22d3ee]/[0.04]`, inactive: `border-[rgba(34,211,238,0.1)] bg-white/[0.025]`. Hover → active style. Lab label JetBrains Mono 8px `#f97316`. Title 10px weight-600.

---

### 7. Testimonial

**Section:** `py-16 px-10 border-t border-[rgba(34,211,238,0.1)] text-center`

Centered, max-w `560px` mx-auto.

Quote: `1.2rem` weight-500 `rgba(240,244,255,0.8)` lh 1.6 font-style italic mb `1.25rem` tracking `-0.01em`:
`'"The TCP simulation made everything click in 10 minutes that three weeks of lectures couldn't."'`

Attribution (flex items-center justify-center gap-2.5):
- Avatar: 34×34 circle `bg-[#22d3ee]/12 border border-[#22d3ee]/20` "K" 12px weight-700 `#22d3ee`
- Name: Inter Tight 13px weight-700 white: "Kai L."
- Role: JetBrains Mono 11px `#6e82a4`: "ELEC3120, HKUST · Spring 2026"

---

### 8. Final CTA (`src/components/landing/CTA.tsx`)

**Section:** `py-32 px-10 text-center relative overflow-hidden`

Backgrounds (absolute):
1. Animated radial: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,211,238,0.055), transparent 70%)` with `animation: drift 8s ease-in-out infinite`
2. Amber accent: `radial-gradient(ellipse 30% 30% at 30% 70%, rgba(249,115,22,0.025), transparent 60%)`

Content (max-w `620px` mx-auto, position relative z-10):
- Kicker: JetBrains Mono 10px `#f97316` tracking uppercase mb `1rem`: `"READY?"`
- H2: Inter Tight `clamp(2rem, 4.5vw, 3.75rem)` weight-900 tracking-tight white lh 1.0 mb `1rem`: `"From packets to mastery."`
- Subtitle: 1rem `#6e82a4` mb `2.25rem` lh 1.6: `"Join thousands of HKUST ELEC3120 students learning smarter with AI, simulations, and exams."`
- CTA button: same primary style + cyanPulse animation. Text: `"Start learning now →"`. mt-auto.
- Below: two trust chips JetBrains Mono 11px `#6e82a4`: `"✓ Free for HKUST students"` + `"✓ No credit card required"`

---

### 9. Footer

`border-t border-[rgba(34,211,238,0.1)] py-7 px-10 flex items-center justify-between flex-wrap gap-4`

- Left: Logo mark (20×20) + "LearningPacer" Inter Tight 13px weight-800 `rgba(240,244,255,0.45)`
- Center: links ["Privacy", "Contact", "GitHub"] — 12px `#6e82a4` hover white
- Right: JetBrains Mono 11px `rgba(138,154,184,0.35)` — `"© 2026 LearningPacer · HKUST ELEC3120"`

---

## Animations Summary

| Animation       | Duration | Easing    | Trigger         |
|-----------------|----------|-----------|-----------------|
| Scroll reveal   | 550ms    | ease-out  | IntersectionObserver (threshold 0.1) |
| Stagger delay   | +80ms/card | —       | On reveal       |
| Word-by-word    | 400ms    | ease-out  | `wordsIn` state, 60ms stagger per word |
| Count-up        | 1200ms   | linear RAF| IntersectionObserver (threshold 0.3) |
| Card hover lift | 240ms    | ease-out  | mouseenter      |
| cyanPulse glow  | 2500ms   | ease-in-out | always        |
| playPing ring   | 2000ms   | ease-out  | always          |
| chevronBob      | 2200ms   | ease-in-out | always        |
| drift (CTA bg)  | 8000ms   | ease-in-out | always        |
| Reduced motion  | disable all | —      | `@media (prefers-reduced-motion: reduce)` |

All Framer Motion: use `<MotionConfig reducedMotion="user">` at the root. Use `whileInView` + `viewport={{ once: true }}` for scroll reveals. Use `animate`/`initial` for word-by-word. Use CSS `animation:` for always-on keyframe loops (cyanPulse, bob, playPing).

---

## File Structure

```
src/
  pages/
    Landing.tsx              ← top-level, assembles all sections
  components/
    landing/
      Navbar.tsx
      Hero.tsx
      CredStrip.tsx
      ModesShowcase.tsx
        ChatCard.tsx
        CourseCard.tsx
        SimCard.tsx
        ExamCard.tsx
      ProofSection.tsx
        StatCell.tsx
        AmbientNetwork.tsx   ← reused canvas component
      SimulationShowcase.tsx
      Testimonial.tsx
      CTA.tsx
      Footer.tsx
```

## Assets
- Hero video: copy `uploads/jimeng-2026-04-24-5729-COMPUTER NETWORKS hero video for a landi....mp4` → `public/hero.mp4`
- Hero poster: generate a still from the video → `public/hero-poster.jpg`
- HKUST crest: source official SVG or use the placeholder in the design

## Reference File
`Landing Page.html` in this folder is the complete interactive prototype. Open it in a browser to see every interaction, animation, and exact layout. All component logic and rendering is in the `<script type="text/babel">` block — it's readable JSX you can reference directly for implementation details.
