# Simulations Tab Redesign — Clean, Beginner-Friendly UI

**Date:** 2026-04-08
**Scope:** SimulationsMode and child components only. No other tabs touched.
**Goal:** Help HKUST ELEC3120 students learn networking concepts more efficiently by reducing cognitive overload and providing guided, scaffolded learning experiences.

---

## Core Principle

Separate **navigation** (choosing what to study) from **learning** (understanding a concept). These are two different cognitive modes that require two different UIs.

---

## Architecture

### State Model

`SimulationsMode` gains one state change:

```ts
const [activeSimulatorId, setActiveSimulatorId] = useState<string | null>(null);
```

- `null` → render `SimulationHub`
- `string` → render the focused simulator view via restructured `SimulationShell`

No routing changes. No URL params. Pure React state within the existing component.

### New Components

| Component | Purpose |
|---|---|
| `SimulationHub.tsx` | Landing page with hero banner + module cards |
| `ConceptGuide.tsx` | Numbered step sidebar inside simulator view |

### Modified Components

| Component | Change |
|---|---|
| `SimulationsMode.tsx` | Becomes a thin hub/simulator switcher |
| `SimulationShell.tsx` | Becomes the full simulator view layout (header + sidebar + canvas + toolbar) |
| `SimulatorToolbar.tsx` | Moves to bottom positioning within the shell |
| All 17 simulators | Each gains `conceptSteps` data + `currentStep`/`onStepChange` props |

### Unchanged

- `SimulationCanvas.tsx` — renders inside the new layout as-is
- `SimulatorToolbar.styles.ts` — button classes stay the same
- All non-simulation components

---

## View 1: Simulation Hub

### Hero Banner

Full-width card at top. Matches existing shell styling: `border-cyan-500/30 bg-cyan-950/40 rounded-xl`.

**Left side:** CSS-only geometric illustration representing protocol layers (stacked rounded rectangles with labels like "Data", "Protocol", "Protocol", "Gate" — matching the reference image aesthetic). Built with divs + Tailwind, no external images.

**Right side:**
- "Recommended Path" label (`text-xs uppercase tracking-wide text-slate-400`)
- "Start Your Journey: Packet Encapsulation" heading (`text-2xl font-bold`)
- One-line description: "Understand how data is formatted for network transmission."
- "Begin Simulation" CTA button (`bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-6 py-3 text-base font-semibold`)

Always points to `encapsulation` (first Introductory simulator). This is a fixed recommendation — no dynamic logic needed.

### Section Header

- "Explore Simulation Modules" heading (`text-xl font-bold`)
- Difficulty filter dropdown on the right, right-aligned
  - Options: "All Levels" (default), "Beginner", "Intermediate", "Advanced"
  - Maps `Beginner` → `Introductory`, `Intermediate` → `Intermediate`, `Advanced` → `Advanced` from existing `Difficulty` type
  - When filtered, module cards only show simulators matching that difficulty. If a module has no matching simulators, the card is hidden entirely.
  - Styled with `toolbarSelectClass` from existing styles

### Module Cards Grid

`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4`

One card per module (Foundations, Transport Layer, Network Layer, Link Layer). Each card:

**Visual:**
- `rounded-xl border border-slate-700/80 bg-slate-900/80 p-6`
- Hover: `hover:border-cyan-500/40` with subtle transition
- Top area: distinctive CSS icon using Tailwind (colored divs/shapes):
  - Foundations: layered stacked boxes (cyan)
  - Transport Layer: handshake / bidirectional arrows (green)
  - Network Layer: globe with arrow (amber)
  - Link Layer: chain link segments (purple)

**Content:**
- Module name as `text-lg font-semibold text-white`
- Difficulty badge below name: shows the **lowest** difficulty in the module (since this is beginner-oriented, show the entry point). Color-coded pill: `rounded-full px-2 py-0.5 text-xs font-medium`
  - Introductory: `bg-emerald-400/20 text-emerald-300`
  - Intermediate: `bg-amber-400/20 text-amber-300`
  - Advanced: `bg-red-400/20 text-red-300`
- One-line description from existing `moduleDescriptions`
- "Explore" button at bottom: `w-full border border-slate-600 rounded-lg py-2 text-sm text-slate-300 hover:text-white hover:border-slate-400`

**Expand Behavior:**
- Clicking "Explore" expands the card in-place (using React state, no routing) to reveal that module's simulators as a vertical list below the card description
- Expanded state: card grows taller, "Explore" label changes to "Collapse", simulator list fades in
- Each simulator item: name, difficulty dot, one-line summary, full-row clickable
- Clicking a simulator item calls `onSelect(sim.id)` — transitions to focused simulator view
- Only one module card can be expanded at a time (expanding one collapses others)

### Responsive

- Mobile: single column, hero banner stacks vertically, cards fill width
- Tablet (md): 2-column card grid
- Desktop (xl): 4-column card grid

---

## View 2: Focused Simulator

Entered by selecting a simulator from the hub. The entire SimulationsMode area becomes the simulator view — no hub content visible.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  [Exit]          TCP Handshake Simulation            │
├───────────────┬─────────────────────────────────────┤
│               │                                     │
│ Concept Guide │  Interactive Simulation Workspace    │
│               │                                     │
│ ● 1. SYN     │  ┌─────────────────────────────┐    │
│   The client  │  │                             │    │
│   sends a SYN │  │   Existing simulator         │    │
│   packet...   │  │   visualization renders      │    │
│               │  │   here unchanged             │    │
│ ○ 2. SYN-ACK │  │                             │    │
│               │  └─────────────────────────────┘    │
│ ○ 3. ACK     │                                     │
│               │                                     │
├───────────────┴─────────────────────────────────────┤
│          ▶ Play   ▶| Step   ↺ Reset    Step 1 / 3  │
└─────────────────────────────────────────────────────┘
```

### Header Bar

- Full width, `border-b border-white/10 bg-slate-900/60 px-4 py-3`
- Left: "Exit" button (`variant="outline" border-slate-600 text-slate-300 hover:text-white`) — calls `setActiveSimulatorId(null)`
- Center/right: Simulator title (`text-xl font-bold text-white`)

### Concept Guide Sidebar (`ConceptGuide.tsx`)

**Container:** `w-[300px] xl:w-[340px] flex-none bg-slate-900/60 border-r border-white/10 p-5 overflow-y-auto`

**Heading:** "Concept Guide: {title}" (`text-base font-semibold text-white mb-4`)

**Intro section** (above steps): The existing `summary` and `learningFocus` from SimulatorConfig, rendered as:
- Summary in `text-sm text-slate-300 leading-relaxed`
- Learning focus in a subtle box: `rounded-md bg-cyan-900/20 px-3 py-2 text-sm`
- This replaces the old "Mission Briefing" card — same content, integrated into the guide

**Steps:** Vertical stepper with connecting line.

Each step has three visual states:

1. **Active step:**
   - Filled cyan dot (`w-3 h-3 rounded-full bg-cyan-400`) with subtle glow
   - `border-l-2 border-cyan-400` connecting line
   - Title: `text-sm font-semibold text-white`
   - Description expanded: `text-sm text-slate-300 leading-relaxed mt-1`

2. **Completed step:**
   - Filled slate dot (`w-3 h-3 rounded-full bg-slate-500`)
   - `border-l-2 border-slate-600` connecting line
   - Title: `text-sm font-medium text-slate-400`
   - Description collapsed (title only)

3. **Future step:**
   - Hollow dot (`w-3 h-3 rounded-full border-2 border-slate-600`)
   - `border-l-2 border-slate-700` connecting line
   - Title: `text-sm text-slate-500`
   - Description hidden

**Interaction:**
- Clicking any step calls `onStepChange(index)` — the simulator jumps to that state
- As simulation auto-plays, the simulator calls back with the current step, and the guide auto-scrolls to track

**Props:**
```ts
interface ConceptGuideProps {
  title: string;
  summary: string;
  learningFocus: string;
  steps: ConceptStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
}
```

### Simulation Workspace (Right Side)

- Takes remaining width via `flex-1 min-w-0`
- "Interactive Simulation Workspace" label at top: `text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 mb-4 px-6 pt-5`
- `SimulationCanvas` renders inside with its existing styling
- Existing simulator components render their visualization here unchanged

### Bottom Toolbar

`SimulatorToolbar` repositioned to the bottom of the full simulator view:
- `border-t border-white/10 bg-gray-800/40 px-4 py-3`
- Center-aligned button group: Play, Step, Reset
- Right side: step counter "Step {current} / {total}" (`text-sm text-slate-400`)
- Buttons use existing classes from `SimulatorToolbar.styles.ts`

**Render ownership:** `SimulationShell` renders the toolbar container (positioning, border, background). Each simulator passes its control buttons as a render prop or children to the shell. This way the shell owns layout but simulators own their specific controls (some have dropdowns, toggles, etc. beyond Play/Step/Reset). The shell adds the step counter automatically from `currentStep` / `totalSteps`.

### Responsive (Simulator View)

- Desktop (xl+): side-by-side layout as shown
- Tablet/mobile (below xl): Concept Guide collapses to a horizontal step indicator above the canvas (just numbered dots showing progress), with a "Show Guide" toggle that slides it in as an overlay. This keeps the canvas full-width on smaller screens.

---

## Concept Steps Per Simulator

Each simulator defines its pedagogical steps. These map to the simulator's internal progression.

### Foundations

**Packet Encapsulation** (4 steps)
1. Application Data — "The application generates raw data to send across the network."
2. Transport Header — "TCP/UDP header is prepended with port numbers and sequence info."
3. Network Header — "IP header is added with source and destination addresses."
4. Link Frame — "Ethernet frame wraps everything with MAC addresses and a trailer."

**DNS Resolution** (4 steps)
1. Client Query — "Your device asks its local DNS resolver to look up a domain name."
2. Root Referral — "The root server refers the resolver to the correct TLD nameserver."
3. TLD Referral — "The TLD nameserver points to the authoritative server for the domain."
4. Authoritative Answer — "The authoritative server returns the actual IP address."

**Subnetting Calculator** (3 steps)
1. Enter CIDR Block — "Specify an IP address and prefix length (e.g., 192.168.1.0/24)."
2. Compute Ranges — "Calculate network address, broadcast address, and usable host range."
3. Verify Host Count — "Confirm 2^(32-prefix) - 2 usable hosts match your plan."

### Transport Layer

**TCP Handshake** (3 steps)
1. SYN (Synchronize) — "The client sends a SYN packet with a sequence number to initiate the connection."
2. SYN-ACK (Synchronize-Acknowledge) — "The server responds with its own sequence number and acknowledges the client's SYN."
3. ACK (Acknowledge) — "The client confirms the server's sequence number. Connection established."

**Sliding Window** (4 steps)
1. Window Initialization — "Sender sets window size determining how many packets can be in-flight."
2. Packet Transmission — "Packets are sent up to the window limit without waiting for individual ACKs."
3. ACK Reception — "As ACKs return, the window slides forward, allowing new packets to be sent."
4. Window Full — "When the window is full, the sender must wait for ACKs before sending more."

**Go-Back-N vs Selective Repeat** (4 steps)
1. Normal Transmission — "Both protocols send packets within the send window."
2. Loss Event — "A packet is lost in transit, creating a gap in the sequence."
3. GBN Retransmission — "Go-Back-N resends the lost packet and ALL subsequent packets."
4. SR Retransmission — "Selective Repeat resends ONLY the lost packet, buffering out-of-order arrivals."

**TCP Reno State Machine** (4 steps)
1. Slow Start — "CWND grows exponentially, doubling each RTT until ssthresh is reached."
2. Congestion Avoidance — "CWND grows linearly, adding ~1 MSS per RTT to probe for bandwidth."
3. Triple Duplicate ACK — "Three duplicate ACKs trigger Fast Retransmit; ssthresh = CWND/2, enter Fast Recovery."
4. Timeout — "No ACKs at all. ssthresh = CWND/2, CWND resets to 1 MSS, back to Slow Start."

**BDP Pipe and ACK Clocking** (3 steps)
1. Pipe Model — "Bandwidth x Delay = how many bytes the network path can hold in transit."
2. Filling the Pipe — "Sender ramps up until the pipe is full. Efficient use matches BDP exactly."
3. ACK Clocking — "In steady state, each ACK arrival triggers the next send — self-clocking at the bottleneck rate."

### Network Layer

**Longest Prefix Match** (3 steps)
1. Destination Lookup — "A packet arrives with a destination IP. The router checks its forwarding table."
2. Binary Comparison — "Multiple table entries may match. Each is compared bit-by-bit against the destination."
3. Longest Match Wins — "The entry with the most matching prefix bits determines the next-hop."

**ARP Broadcast and Cache** (3 steps)
1. ARP Request — "Sender broadcasts 'Who has IP X?' to FF:FF:FF:FF:FF:FF on the LAN."
2. ARP Reply — "The owner of that IP responds with a unicast reply containing its MAC address."
3. Cache Update — "Sender stores the IP-to-MAC mapping in its ARP cache for future frames."

**Dijkstra Shortest Path** (4 steps)
1. Initialize Source — "Set distance to source = 0, all others = infinity. Add source to visited set."
2. Relax Neighbors — "For the current node, update distances to all unvisited neighbors."
3. Select Minimum — "Choose the unvisited node with the smallest tentative distance."
4. Repeat Until Done — "Continue until all nodes are visited. The shortest path tree is complete."

**Distance Vector (RIP)** (4 steps)
1. Initialize Tables — "Each router knows only the cost to its direct neighbors."
2. Exchange Vectors — "Routers send their full distance vectors to neighbors each round."
3. Bellman-Ford Update — "Each router updates its table: min(current cost, neighbor cost + link cost)."
4. Convergence or Loop — "Tables stabilize (converge) or, after a link failure, count-to-infinity may occur."

**MPLS Label Switching** (3 steps)
1. Label Push (Ingress) — "Ingress router classifies the packet and pushes an MPLS label onto the stack."
2. Label Swap (Transit) — "Transit routers swap the label using their LFIB and forward to the next hop."
3. Label Pop (Egress) — "Egress router pops the label and forwards the packet using normal IP routing."

### Link Layer

**Learning Switch** (3 steps)
1. Unknown Destination — "A frame arrives. The switch doesn't know where the destination lives, so it floods."
2. Source Learning — "The switch records the source MAC and the port it arrived on in its MAC table."
3. Known Forwarding — "Future frames to that MAC are forwarded only to the learned port. No flooding."

**Spanning Tree Protocol** (4 steps)
1. Root Election — "All switches claim to be root. The one with the lowest Bridge ID wins."
2. Root Port Selection — "Each non-root switch picks its port with the lowest cost path to root."
3. Designated Ports — "Each LAN segment gets one designated port (lowest cost to root). Others are blocked."
4. Topology Change — "If a link fails, STP reconverges by re-electing and unblocking backup ports."

**Wireless Association** (3 steps)
1. Scanning — "Device performs periodic 5ms synchronization scans across available channels."
2. Association — "Device selects the base station with strongest signal and sends an association request."
3. Handover — "If signal degrades below threshold, device re-scans and associates with a better AP."

**Queue Management** (4 steps)
1. Arrival — "Packets from multiple flows arrive at the router's output queue."
2. FIFO Scheduling — "First-In First-Out serves packets in arrival order. Bursty flows dominate."
3. Round-Robin / WFQ — "Flows get separate queues. RR alternates; WFQ weights by flow priority."
4. Drop-Tail — "When the buffer is full, new arrivals are dropped. This can cause synchronized loss."

---

## Simulator Integration Contract

### New Props for Simulators

Each simulator component's signature changes from:
```ts
// Before
export const TcpHandshakeSimulator = () => { ... }
```

To:
```ts
// After
interface SimulatorStepProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const TcpHandshakeSimulator = ({ currentStep, onStepChange }: SimulatorStepProps) => { ... }
```

### Migration Strategy

Since there are 17 simulators, migration is incremental:

1. Add `SimulatorStepProps` as optional props with defaults (`currentStep = 0`)
2. Each simulator's internal step/phase state syncs bidirectionally with the prop
3. Simulators that already track steps (TCP Handshake, Encapsulation, GBN-SR) need minimal wiring
4. Complex simulators (Dijkstra, Distance Vector) map their algorithm phases to the concept steps

### ConceptSteps Data Location

Each simulator's `conceptSteps` array lives in the `simulators` config in `SimulationsMode.tsx`, alongside the existing metadata:

```ts
{
  id: 'tcp-handshake',
  label: 'TCP Handshake',
  // ...existing fields...
  conceptSteps: [
    { title: 'SYN (Synchronize)', description: 'The client sends a SYN packet...' },
    { title: 'SYN-ACK (Synchronize-Acknowledge)', description: 'The server responds...' },
    { title: 'ACK (Acknowledge)', description: 'The client confirms...' },
  ],
}
```

This keeps all simulator metadata centralized and avoids spreading config across 18 files.

---

## Styling Rules

All new components follow existing CLAUDE.md conventions:

- Primary action buttons: `bg-cyan-600 hover:bg-cyan-500 text-white`
- Secondary buttons: `variant="outline" border-slate-600 text-slate-300`
- Canvas border: `border-slate-700/80`
- Section backgrounds: `bg-slate-800/60`
- Card backgrounds: `bg-slate-900/80`
- Text: `text-sm text-slate-300` for body, never `text-xs text-muted-foreground`
- Color-coded status indicators keep their semantic `/20` opacity
- Dark mode support via `dark:` prefix where needed
- Icons from `lucide-react` only
- Imports use `@/` path alias

---

## What Is NOT Changing

- No other tabs (Chat, Course, Mock Exam, Feedback, How It Works)
- No routing (still pure tab state)
- No new dependencies
- Individual simulator visualizations (SVG, canvas, DOM) stay identical
- `SimulationCanvas` component untouched
- `SimulatorToolbar.styles.ts` button classes untouched
- Supabase clients, n8n webhooks, auth — nothing outside simulations
