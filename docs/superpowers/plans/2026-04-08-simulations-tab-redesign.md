# Simulations Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Simulations tab into a two-view architecture (hub landing + focused simulator) with a Concept Guide sidebar for scaffolded learning.

**Architecture:** `SimulationsMode` becomes a thin switcher between `SimulationHub` (discovery) and a restructured `SimulationShell` (focused learning). The hub shows module cards with difficulty filtering. The simulator view adds a `ConceptGuide` sidebar with auto-synced steps alongside the existing visualization. All 17 simulator components keep their internal logic but gain step-sync props.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, shadcn/ui, lucide-react icons. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-08-simulations-tab-redesign.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/simulations/SimulationHub.tsx` | Hub landing page: hero banner, difficulty filter, module cards grid with expand behavior |
| `src/components/simulations/ConceptGuide.tsx` | Vertical stepper sidebar: numbered steps with active/completed/future states, click-to-jump |
| `src/components/simulations/simulatorStepConfig.ts` | All 17 simulator `conceptSteps` arrays + shared types (`ConceptStep`, `SimulatorStepProps`) |

### Modified Files
| File | Change |
|------|--------|
| `src/components/SimulationsMode.tsx` | Replace accordion+shell layout with hub/simulator view switcher. Import hub + new config. |
| `src/components/simulations/SimulationShell.tsx` | Rewrite: header bar (exit+title) + ConceptGuide sidebar + workspace area + bottom toolbar slot |
| `src/components/simulations/SimulatorToolbar.tsx` | Change default styling from `border-b` top-bar to `border-t` bottom-bar. Add `stepCounter` prop. |
| All 17 simulator `.tsx` files | Accept optional `currentStep`/`onStepChange` props, sync internal step state bidirectionally |

### Unchanged Files
| File | Reason |
|------|--------|
| `src/components/simulations/SimulationCanvas.tsx` | Renders inside workspace area as-is |
| `src/components/simulations/SimulatorToolbar.styles.ts` | Button classes unchanged |
| `src/pages/Platform.tsx` | Still imports `SimulationsMode` the same way |

---

## Task 1: Create shared types and concept step data

**Files:**
- Create: `src/components/simulations/simulatorStepConfig.ts`

This task creates the data layer that the Concept Guide and simulators will consume. Doing this first means all subsequent tasks can import from one place.

- [ ] **Step 1: Create the file with types and all 17 simulator step configs**

```ts
// src/components/simulations/simulatorStepConfig.ts

export interface ConceptStep {
  title: string;
  description: string;
}

export interface SimulatorStepProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

export const conceptStepsById: Record<string, ConceptStep[]> = {
  encapsulation: [
    { title: 'Application Data', description: 'The application generates raw data to send across the network.' },
    { title: 'Transport Header', description: 'TCP/UDP header is prepended with port numbers and sequence info.' },
    { title: 'Network Header', description: 'IP header is added with source and destination addresses.' },
    { title: 'Link Frame', description: 'Ethernet frame wraps everything with MAC addresses and a trailer.' },
  ],
  'dns-resolution': [
    { title: 'Client Query', description: 'Your device asks its local DNS resolver to look up a domain name.' },
    { title: 'Root Referral', description: 'The root server refers the resolver to the correct TLD nameserver.' },
    { title: 'TLD Referral', description: 'The TLD nameserver points to the authoritative server for the domain.' },
    { title: 'Authoritative Answer', description: 'The authoritative server returns the actual IP address.' },
  ],
  subnetting: [
    { title: 'Enter CIDR Block', description: 'Specify an IP address and prefix length (e.g., 192.168.1.0/24).' },
    { title: 'Compute Ranges', description: 'Calculate network address, broadcast address, and usable host range.' },
    { title: 'Verify Host Count', description: 'Confirm 2^(32-prefix) - 2 usable hosts match your plan.' },
  ],
  'tcp-handshake': [
    { title: 'SYN (Synchronize)', description: 'The client sends a SYN packet with a sequence number to initiate the connection.' },
    { title: 'SYN-ACK (Synchronize-Acknowledge)', description: 'The server responds with its own sequence number and acknowledges the client\'s SYN.' },
    { title: 'ACK (Acknowledge)', description: 'The client confirms the server\'s sequence number. Connection established.' },
  ],
  'sliding-window': [
    { title: 'Window Initialization', description: 'Sender sets window size determining how many packets can be in-flight.' },
    { title: 'Packet Transmission', description: 'Packets are sent up to the window limit without waiting for individual ACKs.' },
    { title: 'ACK Reception', description: 'As ACKs return, the window slides forward, allowing new packets to be sent.' },
    { title: 'Window Full', description: 'When the window is full, the sender must wait for ACKs before sending more.' },
  ],
  'gbn-sr': [
    { title: 'Normal Transmission', description: 'Both protocols send packets within the send window.' },
    { title: 'Loss Event', description: 'A packet is lost in transit, creating a gap in the sequence.' },
    { title: 'GBN Retransmission', description: 'Go-Back-N resends the lost packet and ALL subsequent packets.' },
    { title: 'SR Retransmission', description: 'Selective Repeat resends ONLY the lost packet, buffering out-of-order arrivals.' },
  ],
  cwnd: [
    { title: 'Slow Start', description: 'CWND grows exponentially, doubling each RTT until ssthresh is reached.' },
    { title: 'Congestion Avoidance', description: 'CWND grows linearly, adding ~1 MSS per RTT to probe for bandwidth.' },
    { title: 'Triple Duplicate ACK', description: 'Three duplicate ACKs trigger Fast Retransmit; ssthresh = CWND/2, enter Fast Recovery.' },
    { title: 'Timeout', description: 'No ACKs at all. ssthresh = CWND/2, CWND resets to 1 MSS, back to Slow Start.' },
  ],
  'pipe-ack-clocking': [
    { title: 'Pipe Model', description: 'Bandwidth x Delay = how many bytes the network path can hold in transit.' },
    { title: 'Filling the Pipe', description: 'Sender ramps up until the pipe is full. Efficient use matches BDP exactly.' },
    { title: 'ACK Clocking', description: 'In steady state, each ACK arrival triggers the next send — self-clocking at the bottleneck rate.' },
  ],
  lpm: [
    { title: 'Destination Lookup', description: 'A packet arrives with a destination IP. The router checks its forwarding table.' },
    { title: 'Binary Comparison', description: 'Multiple table entries may match. Each is compared bit-by-bit against the destination.' },
    { title: 'Longest Match Wins', description: 'The entry with the most matching prefix bits determines the next-hop.' },
  ],
  arp: [
    { title: 'ARP Request', description: "Sender broadcasts 'Who has IP X?' to FF:FF:FF:FF:FF:FF on the LAN." },
    { title: 'ARP Reply', description: 'The owner of that IP responds with a unicast reply containing its MAC address.' },
    { title: 'Cache Update', description: 'Sender stores the IP-to-MAC mapping in its ARP cache for future frames.' },
  ],
  dijkstra: [
    { title: 'Initialize Source', description: 'Set distance to source = 0, all others = infinity. Add source to visited set.' },
    { title: 'Relax Neighbors', description: 'For the current node, update distances to all unvisited neighbors.' },
    { title: 'Select Minimum', description: 'Choose the unvisited node with the smallest tentative distance.' },
    { title: 'Repeat Until Done', description: 'Continue until all nodes are visited. The shortest path tree is complete.' },
  ],
  'distance-vector': [
    { title: 'Initialize Tables', description: 'Each router knows only the cost to its direct neighbors.' },
    { title: 'Exchange Vectors', description: 'Routers send their full distance vectors to neighbors each round.' },
    { title: 'Bellman-Ford Update', description: 'Each router updates its table: min(current cost, neighbor cost + link cost).' },
    { title: 'Convergence or Loop', description: 'Tables stabilize (converge) or, after a link failure, count-to-infinity may occur.' },
  ],
  mpls: [
    { title: 'Label Push (Ingress)', description: 'Ingress router classifies the packet and pushes an MPLS label onto the stack.' },
    { title: 'Label Swap (Transit)', description: 'Transit routers swap the label using their LFIB and forward to the next hop.' },
    { title: 'Label Pop (Egress)', description: 'Egress router pops the label and forwards the packet using normal IP routing.' },
  ],
  'learning-switch': [
    { title: 'Unknown Destination', description: "A frame arrives. The switch doesn't know where the destination lives, so it floods." },
    { title: 'Source Learning', description: 'The switch records the source MAC and the port it arrived on in its MAC table.' },
    { title: 'Known Forwarding', description: 'Future frames to that MAC are forwarded only to the learned port. No flooding.' },
  ],
  stp: [
    { title: 'Root Election', description: 'All switches claim to be root. The one with the lowest Bridge ID wins.' },
    { title: 'Root Port Selection', description: 'Each non-root switch picks its port with the lowest cost path to root.' },
    { title: 'Designated Ports', description: 'Each LAN segment gets one designated port (lowest cost to root). Others are blocked.' },
    { title: 'Topology Change', description: 'If a link fails, STP reconverges by re-electing and unblocking backup ports.' },
  ],
  'wireless-association': [
    { title: 'Scanning', description: 'Device performs periodic 5ms synchronization scans across available channels.' },
    { title: 'Association', description: 'Device selects the base station with strongest signal and sends an association request.' },
    { title: 'Handover', description: 'If signal degrades below threshold, device re-scans and associates with a better AP.' },
  ],
  'queue-management': [
    { title: 'Arrival', description: 'Packets from multiple flows arrive at the router\'s output queue.' },
    { title: 'FIFO Scheduling', description: 'First-In First-Out serves packets in arrival order. Bursty flows dominate.' },
    { title: 'Round-Robin / WFQ', description: 'Flows get separate queues. RR alternates; WFQ weights by flow priority.' },
    { title: 'Drop-Tail', description: 'When the buffer is full, new arrivals are dropped. This can cause synchronized loss.' },
  ],
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/components/simulations/simulatorStepConfig.ts`
Expected: No errors (this is a pure data file with no imports beyond types).

- [ ] **Step 3: Commit**

```bash
git add src/components/simulations/simulatorStepConfig.ts
git commit -m "feat(simulations): add concept step data and shared types for all 17 simulators"
```

---

## Task 2: Build the ConceptGuide component

**Files:**
- Create: `src/components/simulations/ConceptGuide.tsx`

The vertical stepper sidebar that shows numbered steps with three visual states (active, completed, future). Clicking a step fires `onStepChange`. This is a presentational component with no internal state.

- [ ] **Step 1: Create ConceptGuide.tsx**

```tsx
// src/components/simulations/ConceptGuide.tsx
import { useEffect, useRef } from 'react';
import type { ConceptStep } from './simulatorStepConfig';

interface ConceptGuideProps {
  title: string;
  summary: string;
  learningFocus: string;
  steps: ConceptStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const ConceptGuide = ({
  title,
  summary,
  learningFocus,
  steps,
  currentStep,
  onStepChange,
}: ConceptGuideProps) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentStep]);

  return (
    <aside className="w-[300px] xl:w-[340px] flex-none bg-slate-900/60 border-r border-white/10 p-5 overflow-y-auto">
      <h3 className="text-base font-semibold text-white mb-4">
        Concept Guide: {title}
      </h3>

      {/* Intro section — replaces old mission briefing */}
      <div className="mb-5 space-y-2">
        <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
        <div className="rounded-md bg-cyan-900/20 px-3 py-2">
          <p className="text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">Focus: </span>
            {learningFocus}
          </p>
        </div>
      </div>

      {/* Vertical stepper */}
      <div className="relative">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;

          return (
            <button
              key={idx}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onStepChange(idx)}
              className="flex w-full items-start gap-3 text-left py-2 group"
            >
              {/* Dot + connecting line */}
              <div className="relative flex flex-col items-center">
                {/* Dot */}
                <div
                  className={
                    isActive
                      ? 'w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]'
                      : isCompleted
                        ? 'w-3 h-3 rounded-full bg-slate-500'
                        : 'w-3 h-3 rounded-full border-2 border-slate-600'
                  }
                />
                {/* Connecting line (skip for last step) */}
                {idx < steps.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 min-h-[24px] ${
                      isActive
                        ? 'bg-cyan-400/40'
                        : isCompleted
                          ? 'bg-slate-600'
                          : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="min-w-0 pb-2">
                <span
                  className={
                    isActive
                      ? 'text-sm font-semibold text-white'
                      : isCompleted
                        ? 'text-sm font-medium text-slate-400'
                        : 'text-sm text-slate-500 group-hover:text-slate-400'
                  }
                >
                  {idx + 1}. {step.title}
                </span>
                {isActive && (
                  <p className="text-sm text-slate-300 leading-relaxed mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/simulations/ConceptGuide.tsx
git commit -m "feat(simulations): add ConceptGuide vertical stepper sidebar component"
```

---

## Task 3: Build the SimulationHub component

**Files:**
- Create: `src/components/simulations/SimulationHub.tsx`

The discovery landing page with hero banner, difficulty filter, and expandable module cards.

- [ ] **Step 1: Create SimulationHub.tsx**

```tsx
// src/components/simulations/SimulationHub.tsx
import { useState } from 'react';
import { Boxes, ArrowLeftRight, Globe, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ComponentType } from 'react';

type ModuleName = 'Foundations' | 'Transport Layer' | 'Network Layer' | 'Link Layer';
type Difficulty = 'Introductory' | 'Intermediate' | 'Advanced';
type FilterLevel = 'all' | 'Introductory' | 'Intermediate' | 'Advanced';

interface SimulatorConfig {
  id: string;
  label: string;
  module: ModuleName;
  difficulty: Difficulty;
  summary: string;
}

interface SimulationHubProps {
  simulators: SimulatorConfig[];
  moduleOrder: ModuleName[];
  moduleDescriptions: Record<ModuleName, string>;
  onSelect: (id: string) => void;
}

const moduleIcons: Record<ModuleName, ComponentType<{ className?: string }>> = {
  Foundations: Boxes,
  'Transport Layer': ArrowLeftRight,
  'Network Layer': Globe,
  'Link Layer': Link2,
};

const moduleIconColors: Record<ModuleName, string> = {
  Foundations: 'text-cyan-400',
  'Transport Layer': 'text-emerald-400',
  'Network Layer': 'text-amber-400',
  'Link Layer': 'text-purple-400',
};

const moduleCardBorderHover: Record<ModuleName, string> = {
  Foundations: 'hover:border-cyan-500/40',
  'Transport Layer': 'hover:border-emerald-500/40',
  'Network Layer': 'hover:border-amber-500/40',
  'Link Layer': 'hover:border-purple-500/40',
};

const difficultyBadgeClass: Record<Difficulty, string> = {
  Introductory: 'bg-emerald-400/20 text-emerald-300',
  Intermediate: 'bg-amber-400/20 text-amber-300',
  Advanced: 'bg-red-400/20 text-red-300',
};

const difficultyFilterLabels: Record<FilterLevel, string> = {
  all: 'All Levels',
  Introductory: 'Beginner',
  Intermediate: 'Intermediate',
  Advanced: 'Advanced',
};

const difficultyDotClass: Record<Difficulty, string> = {
  Introductory: 'bg-emerald-400',
  Intermediate: 'bg-amber-400',
  Advanced: 'bg-red-400',
};

function getLowestDifficulty(sims: SimulatorConfig[]): Difficulty {
  const order: Difficulty[] = ['Introductory', 'Intermediate', 'Advanced'];
  for (const d of order) {
    if (sims.some(s => s.difficulty === d)) return d;
  }
  return 'Introductory';
}

export const SimulationHub = ({
  simulators,
  moduleOrder,
  moduleDescriptions,
  onSelect,
}: SimulationHubProps) => {
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [expandedModule, setExpandedModule] = useState<ModuleName | null>(null);

  const filteredByModule = (module: ModuleName) => {
    const moduleSims = simulators.filter(s => s.module === module);
    if (filter === 'all') return moduleSims;
    return moduleSims.filter(s => s.difficulty === filter);
  };

  const visibleModules = moduleOrder.filter(m => filteredByModule(m).length > 0);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          {/* CSS illustration — stacked protocol layers */}
          <div className="flex-none flex flex-col items-center gap-1.5 w-[160px]">
            {['Data', 'Protocol', 'Protocol', 'Gate'].map((label, i) => (
              <div
                key={i}
                className={`flex items-center justify-center rounded-md border text-xs font-medium w-full py-1.5 ${
                  i === 0
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                    : i === 3
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-500/40 bg-slate-600/20 text-slate-300'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Text content */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
              Recommended Path
            </p>
            <h2 className="text-2xl font-bold text-white mb-2">
              Start Your Journey: Packet Encapsulation
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              Understand how data is formatted for network transmission.
            </p>
            <button
              type="button"
              onClick={() => onSelect('encapsulation')}
              className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-6 py-3 text-base font-semibold transition-colors"
            >
              Begin Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Section header + filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Explore Simulation Modules</h2>
        <select
          value={filter}
          onChange={e => {
            setFilter(e.target.value as FilterLevel);
            setExpandedModule(null);
          }}
          className="h-9 rounded-md border border-white/10 bg-gray-950/40 px-3 text-sm text-slate-200 shadow-none outline-none transition-colors hover:border-white/20 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
        >
          {(Object.keys(difficultyFilterLabels) as FilterLevel[]).map(level => (
            <option key={level} value={level}>
              {difficultyFilterLabels[level]}
            </option>
          ))}
        </select>
      </div>

      {/* Module cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {visibleModules.map(module => {
          const moduleSims = filteredByModule(module);
          const Icon = moduleIcons[module];
          const isExpanded = expandedModule === module;
          const lowestDiff = getLowestDifficulty(moduleSims);

          return (
            <div
              key={module}
              className={`rounded-xl border border-slate-700/80 bg-slate-900/80 p-6 transition-colors ${moduleCardBorderHover[module]}`}
            >
              {/* Icon */}
              <div className="mb-4 flex justify-center">
                <div className={`w-16 h-16 rounded-xl bg-slate-800/80 flex items-center justify-center ${moduleIconColors[module]}`}>
                  <Icon className="w-8 h-8" />
                </div>
              </div>

              {/* Name + badge */}
              <h3 className="text-lg font-semibold text-white text-center">{module}</h3>
              <div className="flex justify-center mt-1.5 mb-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyBadgeClass[lowestDiff]}`}>
                  {lowestDiff === 'Introductory' ? 'Beginner' : lowestDiff}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-300 text-center mb-4">
                {moduleDescriptions[module]}
              </p>

              {/* Explore / Collapse button */}
              <button
                type="button"
                onClick={() => setExpandedModule(isExpanded ? null : module)}
                className="w-full flex items-center justify-center gap-1.5 border border-slate-600 rounded-lg py-2 text-sm text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
              >
                {isExpanded ? 'Collapse' : 'Explore'}
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Expanded simulator list */}
              {isExpanded && (
                <div className="mt-4 space-y-1 border-t border-slate-700/60 pt-3">
                  {moduleSims.map(sim => (
                    <button
                      key={sim.id}
                      type="button"
                      onClick={() => onSelect(sim.id)}
                      className="w-full flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-800/60"
                    >
                      <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${difficultyDotClass[sim.difficulty]}`} />
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-slate-200">{sim.label}</span>
                        <span className="block text-sm text-slate-400 leading-relaxed">{sim.summary}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/simulations/SimulationHub.tsx
git commit -m "feat(simulations): add SimulationHub landing page with hero banner and module cards"
```

---

## Task 4: Update SimulatorToolbar for bottom positioning

**Files:**
- Modify: `src/components/simulations/SimulatorToolbar.tsx`

Change the default bar styling from top-border to bottom-border, and add an optional step counter that the shell can display.

- [ ] **Step 1: Update SimulatorToolbar.tsx**

Replace the entire component in `src/components/simulations/SimulatorToolbar.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SimulatorToolbarProps {
  label?: string;
  status?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  stepCounter?: { current: number; total: number };
}

export const SimulatorToolbar = ({
  label,
  status,
  hint,
  children,
  className,
  stepCounter,
}: SimulatorToolbarProps) => {
  return (
    <div className={cn('w-full border-t border-white/10 bg-gray-800/40 px-4 py-3', className)}>
      {(label || status) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {label && (
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              {label}
            </span>
          )}
          {status && <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">{status}</div>}
        </div>
      )}

      <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', (label || status) && 'mt-3')}>
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
        {stepCounter && (
          <span className="text-sm text-slate-400 whitespace-nowrap">
            Step {stepCounter.current} / {stepCounter.total}
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
};
```

The key changes:
- `border-b` → `border-t` (top border → bottom border)
- Added `stepCounter` prop that renders "Step X / Y" on the right
- Wrapped `children` in a flex container for consistent button grouping

- [ ] **Step 2: Verify the file compiles and existing simulators still work**

Run: `npx tsc --noEmit`
Expected: No errors. The `stepCounter` prop is optional, so all existing usages remain valid.

- [ ] **Step 3: Commit**

```bash
git add src/components/simulations/SimulatorToolbar.tsx
git commit -m "feat(simulations): update SimulatorToolbar to bottom positioning with optional step counter"
```

---

## Task 5: Rewrite SimulationShell as the focused simulator layout

**Files:**
- Modify: `src/components/simulations/SimulationShell.tsx`

Transform from a simple mission-briefing card wrapper into the full simulator view layout: header bar with Exit button, ConceptGuide sidebar on the left, workspace area on the right.

- [ ] **Step 1: Rewrite SimulationShell.tsx**

Replace the entire file `src/components/simulations/SimulationShell.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConceptGuide } from './ConceptGuide';
import type { ConceptStep } from './simulatorStepConfig';

interface SimulationShellProps {
  title: string;
  category: string;
  summary: string;
  learningFocus: string;
  conceptSteps: ConceptStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onExit: () => void;
  children: ReactNode;
}

export const SimulationShell = ({
  title,
  category,
  summary,
  learningFocus,
  conceptSteps,
  currentStep,
  onStepChange,
  onExit,
  children,
}: SimulationShellProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center gap-4 border-b border-white/10 bg-slate-900/60 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onExit}
          className="border-slate-600 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Exit
        </Button>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-xs font-medium text-cyan-400/80">{category}</p>
        </div>
      </div>

      {/* Main content: sidebar + workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Concept Guide sidebar — hidden below xl, shown on desktop */}
        <div className="hidden xl:block">
          <ConceptGuide
            title={title}
            summary={summary}
            learningFocus={learningFocus}
            steps={conceptSteps}
            currentStep={currentStep}
            onStepChange={onStepChange}
          />
        </div>

        {/* Simulation workspace */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Workspace header */}
          <div className="px-6 pt-5 mb-4">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Interactive Simulation Workspace
            </span>
          </div>

          {/* Simulator content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile step indicator — shown below xl */}
      <div className="xl:hidden flex items-center gap-2 px-4 py-2 border-t border-white/10 bg-slate-900/40">
        {conceptSteps.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onStepChange(idx)}
            className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
              idx === currentStep
                ? 'bg-cyan-400 text-slate-900'
                : idx < currentStep
                  ? 'bg-slate-500 text-white'
                  : 'border-2 border-slate-600 text-slate-500'
            }`}
          >
            {idx + 1}
          </button>
        ))}
        <span className="ml-2 text-xs text-slate-400">
          {currentStep >= 0 && currentStep < conceptSteps.length
            ? conceptSteps[currentStep].title
            : ''}
        </span>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: Compilation errors in `SimulationsMode.tsx` because it still uses the old `SimulationShell` props. This is expected — we fix that in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/components/simulations/SimulationShell.tsx
git commit -m "feat(simulations): rewrite SimulationShell as focused simulator layout with ConceptGuide sidebar"
```

---

## Task 6: Rewrite SimulationsMode as the hub/simulator switcher

**Files:**
- Modify: `src/components/SimulationsMode.tsx`

Replace the entire accordion-based layout with a switcher: `null` renders `SimulationHub`, a string ID renders the focused simulator via `SimulationShell`.

- [ ] **Step 1: Rewrite SimulationsMode.tsx**

Replace the entire file `src/components/SimulationsMode.tsx` with:

```tsx
import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import { SimulationHub } from './simulations/SimulationHub';
import { SimulationShell } from './simulations/SimulationShell';
import { conceptStepsById } from './simulations/simulatorStepConfig';
import { ArpSimulator } from './simulations/ArpSimulator';
import { CwndSimulator } from './simulations/CwndSimulator';
import { DijkstraSimulator } from './simulations/DijkstraSimulator';
import { DistanceVectorSimulator } from './simulations/DistanceVectorSimulator';
import { DnsResolutionSimulator } from './simulations/DnsResolutionSimulator';
import { EncapsulationSimulator } from './simulations/EncapsulationSimulator';
import { GbnSrSimulator } from './simulations/GbnSrSimulator';
import { PipeAckClockingSimulator } from './simulations/PipeAckClockingSimulator';
import { SlidingWindowSimulator } from './simulations/SlidingWindowSimulator';
import { LearningSwitchSimulator } from './simulations/LearningSwitchSimulator';
import { LpmSimulator } from './simulations/LpmSimulator';
import { MplsSimulator } from './simulations/MplsSimulator';
import { QueueManagementSimulator } from './simulations/QueueManagementSimulator';
import { StpSimulator } from './simulations/StpSimulator';
import { SubnettingCalculator } from './simulations/SubnettingCalculator';
import { TcpHandshakeSimulator } from './simulations/TcpHandshakeSimulator';
import { WirelessAssociationSimulator } from './simulations/WirelessAssociationSimulator';

type ModuleName = 'Foundations' | 'Transport Layer' | 'Network Layer' | 'Link Layer';
type Difficulty = 'Introductory' | 'Intermediate' | 'Advanced';
type Checkpoint = 'Project Checkpoint 2' | 'Project Checkpoint 3' | 'Project Checkpoint 4' | null;

interface SimulatorConfig {
  id: string;
  label: string;
  module: ModuleName;
  difficulty: Difficulty;
  lectureRef: string;
  checkpointRel: Checkpoint;
  summary: string;
  learningFocus: string;
  component: ComponentType;
}

const moduleOrder: ModuleName[] = ['Foundations', 'Transport Layer', 'Network Layer', 'Link Layer'];

const moduleDescriptions: Record<ModuleName, string> = {
  Foundations: 'Build baseline packet and naming intuition.',
  'Transport Layer': 'Master connection setup and reliable delivery.',
  'Network Layer': 'Study forwarding, routing, and path selection.',
  'Link Layer': 'Understand LAN switching, loop control, wireless sync, and queueing.',
};

const simulators: SimulatorConfig[] = [
  {
    id: 'encapsulation',
    label: 'Packet Encapsulation',
    module: 'Foundations',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: Layered Internet Architecture and PDUs',
    checkpointRel: null,
    summary: 'Watch headers and trailers being added and removed across protocol layers.',
    learningFocus: 'Map PDU transformations from application data to on-the-wire frames.',
    component: EncapsulationSimulator,
  },
  {
    id: 'dns-resolution',
    label: 'DNS Resolution',
    module: 'Foundations',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: DNS Resolution, Caching, and Referrals',
    checkpointRel: null,
    summary: 'Follow recursive and iterative DNS query flow from client to authoritative server.',
    learningFocus: 'Understand referral chains and cached responses in domain lookup.',
    component: DnsResolutionSimulator,
  },
  {
    id: 'subnetting',
    label: 'Subnetting Calculator',
    module: 'Foundations',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: IPv4 Addressing and CIDR Subnetting',
    checkpointRel: 'Project Checkpoint 2',
    summary: 'Compute CIDR-based subnet ranges, host counts, and masks for common network plans.',
    learningFocus: 'Build confidence translating between prefix length and address capacity.',
    component: SubnettingCalculator,
  },
  {
    id: 'tcp-handshake',
    label: 'TCP Handshake',
    module: 'Transport Layer',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: TCP Connection Setup and Teardown',
    checkpointRel: 'Project Checkpoint 2',
    summary: 'Step through SYN, SYN-ACK, and ACK exchange to establish a reliable session.',
    learningFocus: 'Understand sequence/acknowledgment roles in connection setup.',
    component: TcpHandshakeSimulator,
  },
  {
    id: 'sliding-window',
    label: 'Sliding Window',
    module: 'Transport Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: Reliable Data Transfer Window Mechanics',
    checkpointRel: 'Project Checkpoint 2',
    summary: 'Visualize sender and receiver windows while packets and ACKs move through the link.',
    learningFocus: 'Understand in-flight limits, window movement, and throughput implications.',
    component: SlidingWindowSimulator,
  },
  {
    id: 'gbn-sr',
    label: 'Go-Back-N vs Selective Repeat',
    module: 'Transport Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: Reliable Data Transfer (GBN and SR)',
    checkpointRel: 'Project Checkpoint 2',
    summary: 'Compare retransmission strategies when losses happen within a shared send window.',
    learningFocus: 'See why SR buffers out-of-order packets while GBN resends a larger range.',
    component: GbnSrSimulator,
  },
  {
    id: 'cwnd',
    label: 'TCP Reno State Machine',
    module: 'Transport Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: TCP Reno (Slow Start, CA, Fast Recovery)',
    checkpointRel: 'Project Checkpoint 3',
    summary: 'Observe how congestion window growth reacts to clean links and packet loss events.',
    learningFocus: 'Contrast slow start, congestion avoidance, Triple-DupACK recovery, and timeout reset.',
    component: CwndSimulator,
  },
  {
    id: 'pipe-ack-clocking',
    label: 'BDP Pipe and ACK Clocking',
    module: 'Transport Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: BDP, Pipe Model, and ACK Clocking',
    checkpointRel: 'Project Checkpoint 3',
    summary: 'Model pipe volume using BDP and observe ACK-paced steady-state transmission.',
    learningFocus: 'Contrast efficient pipe filling with harmful queue filling under transient overload.',
    component: PipeAckClockingSimulator,
  },
  {
    id: 'lpm',
    label: 'Longest Prefix Match',
    module: 'Network Layer',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: Router Forwarding and Binary Prefix Matching',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Use binary prefix comparison to choose the most specific route among multiple matches.',
    learningFocus: 'Understand why longest matching prefix determines forwarding next-hop.',
    component: LpmSimulator,
  },
  {
    id: 'arp',
    label: 'ARP Broadcast and Cache',
    module: 'Network Layer',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: ARP Resolution on a LAN',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Broadcast "Who has IP X?" with FF:FF:FF:FF:FF:FF and observe the unicast reply from the owner.',
    learningFocus: 'See how IP-to-MAC resolution works and why senders cache resolved MAC addresses.',
    component: ArpSimulator,
  },
  {
    id: 'dijkstra',
    label: 'Dijkstra Shortest Path',
    module: 'Network Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: Link-State Routing and SPF (OSPF)',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Track shortest path discovery on weighted network graphs step-by-step.',
    learningFocus: 'Connect SPF decisions to router forwarding table outcomes.',
    component: DijkstraSimulator,
  },
  {
    id: 'distance-vector',
    label: 'Distance Vector (RIP)',
    module: 'Network Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: Distance Vector, Count-to-Infinity, Poison Reverse',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Run lock-step RIP-style updates and observe count-to-infinity after link failure.',
    learningFocus: 'See how Poison Reverse mitigates simple loops and compare to OSPF behavior.',
    component: DistanceVectorSimulator,
  },
  {
    id: 'mpls',
    label: 'MPLS Label Switching',
    module: 'Network Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: MPLS Virtual Circuits and Label Swapping',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Follow a one-way LSP as ingress pushes, transit swaps, and egress pops MPLS labels.',
    learningFocus: 'Understand virtual-circuit forwarding using LFIB label/interface mappings instead of prefix lookup.',
    component: MplsSimulator,
  },
  {
    id: 'learning-switch',
    label: 'Learning Switch',
    module: 'Link Layer',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: Ethernet Learning Bridges and Flooding',
    checkpointRel: null,
    summary: 'Observe MAC-table learning, flooding for unknown destinations, and filtering to a learned output port.',
    learningFocus: 'Understand why source learning enables efficient unicast forwarding after initial floods.',
    component: LearningSwitchSimulator,
  },
  {
    id: 'stp',
    label: 'Spanning Tree Protocol',
    module: 'Link Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: STP Root Election and Loop Mitigation',
    checkpointRel: null,
    summary: 'Elect a root bridge, block loop-causing links, and recompute after root-link failure.',
    learningFocus: 'See how STP turns a looped physical topology into a loop-free logical tree.',
    component: StpSimulator,
  },
  {
    id: 'wireless-association',
    label: 'Wireless Association',
    module: 'Link Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: Wireless Association and 5ms Synchronization Scan',
    checkpointRel: null,
    summary: 'Simulate 5ms synchronization scans and base-station association/handover decisions.',
    learningFocus: 'Understand periodic scan timing and decision thresholds for stable association.',
    component: WirelessAssociationSimulator,
  },
  {
    id: 'queue-management',
    label: 'Queue Management',
    module: 'Link Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: FIFO, RR/WFQ Scheduling, and Drop-Tail',
    checkpointRel: 'Project Checkpoint 3',
    summary: 'Compare FIFO, Round-Robin, and WFQ with drop-tail buffering under multi-flow load.',
    learningFocus: 'Relate fairness, burst drops, and queue occupancy to transport-layer behavior.',
    component: QueueManagementSimulator,
  },
];

const SimulationsMode = () => {
  const [activeSimulatorId, setActiveSimulatorId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const activeConfig = activeSimulatorId
    ? simulators.find(sim => sim.id === activeSimulatorId) ?? null
    : null;

  const conceptSteps = activeConfig
    ? conceptStepsById[activeConfig.id] ?? []
    : [];

  const handleSelect = useCallback((id: string) => {
    setActiveSimulatorId(id);
    setCurrentStep(0);
  }, []);

  const handleExit = useCallback(() => {
    setActiveSimulatorId(null);
    setCurrentStep(0);
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Hub view
  if (!activeConfig) {
    return (
      <SimulationHub
        simulators={simulators}
        moduleOrder={moduleOrder}
        moduleDescriptions={moduleDescriptions}
        onSelect={handleSelect}
      />
    );
  }

  // Focused simulator view
  const SimComponent = activeConfig.component;

  return (
    <SimulationShell
      title={activeConfig.label}
      category={activeConfig.module}
      summary={activeConfig.summary}
      learningFocus={activeConfig.learningFocus}
      conceptSteps={conceptSteps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onExit={handleExit}
    >
      <SimComponent />
    </SimulationShell>
  );
};

export default SimulationsMode;
```

- [ ] **Step 2: Verify the entire project compiles**

Run: `npx tsc --noEmit`
Expected: No errors. All simulator components are still rendered with no props (they haven't been migrated yet), and that's fine because `SimulatorStepProps` fields are optional.

- [ ] **Step 3: Verify dev server starts and the simulations tab loads**

Run: `npm run dev`
Navigate to the simulations tab. Expected:
- Hub view loads with hero banner, module cards, difficulty filter
- Clicking "Begin Simulation" or a simulator in an expanded card opens the focused view
- Exit button returns to hub
- Concept Guide sidebar shows on the left (desktop) or step dots (mobile)
- Simulator renders in the workspace area

- [ ] **Step 4: Commit**

```bash
git add src/components/SimulationsMode.tsx
git commit -m "feat(simulations): rewrite SimulationsMode as hub/simulator view switcher"
```

---

## Task 7: Migrate step-based simulators (batch 1 — TcpHandshake, Encapsulation, DnsResolution)

**Files:**
- Modify: `src/components/simulations/TcpHandshakeSimulator.tsx`
- Modify: `src/components/simulations/EncapsulationSimulator.tsx`
- Modify: `src/components/simulations/DnsResolutionSimulator.tsx`

These three simulators already use `currentStep` internally and have the most direct mapping to concept steps. The migration pattern is:

1. Accept optional `SimulatorStepProps`
2. When `onStepChange` is provided, call it whenever internal step changes
3. When external `currentStep` changes, sync internal state

Since each simulator manages complex internal state beyond just a step number (scenarios, auto-play timers, packet states), we **do not** lift step state out. Instead, we add a `useEffect` that calls `onStepChange` when the internal step changes, creating one-way sync from simulator → ConceptGuide. The ConceptGuide click-to-jump will be wired in a later task once all simulators are migrated.

- [ ] **Step 1: Update TcpHandshakeSimulator**

At the top of `src/components/simulations/TcpHandshakeSimulator.tsx`, add after the existing imports:

```ts
import type { SimulatorStepProps } from './simulatorStepConfig';
```

Change the component signature from:

```ts
export const TcpHandshakeSimulator = () => {
```

To:

```ts
export const TcpHandshakeSimulator = ({ onStepChange }: SimulatorStepProps) => {
```

Add a `useEffect` after the existing state declarations (after line ~289) to sync step changes outward:

```ts
useEffect(() => {
  if (onStepChange && currentStep >= 0) {
    onStepChange(currentStep);
  }
}, [currentStep, onStepChange]);
```

- [ ] **Step 2: Update EncapsulationSimulator**

At the top of `src/components/simulations/EncapsulationSimulator.tsx`, add after the existing imports:

```ts
import type { SimulatorStepProps } from './simulatorStepConfig';
```

Change the component signature from:

```ts
export const EncapsulationSimulator = () => {
```

To:

```ts
export const EncapsulationSimulator = ({ onStepChange }: SimulatorStepProps) => {
```

Add a `useEffect` after the existing state declarations to sync step changes outward:

```ts
useEffect(() => {
  if (onStepChange) {
    onStepChange(currentStep);
  }
}, [currentStep, onStepChange]);
```

- [ ] **Step 3: Update DnsResolutionSimulator**

At the top of `src/components/simulations/DnsResolutionSimulator.tsx`, add after the existing imports:

```ts
import type { SimulatorStepProps } from './simulatorStepConfig';
```

Change the component signature from:

```ts
export const DnsResolutionSimulator = () => {
```

To:

```ts
export const DnsResolutionSimulator = ({ onStepChange }: SimulatorStepProps) => {
```

Add a `useEffect` after the existing state declarations to sync step changes outward:

```ts
useEffect(() => {
  if (onStepChange && currentStep >= 0) {
    onStepChange(currentStep);
  }
}, [currentStep, onStepChange]);
```

- [ ] **Step 4: Verify all three compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/simulations/TcpHandshakeSimulator.tsx src/components/simulations/EncapsulationSimulator.tsx src/components/simulations/DnsResolutionSimulator.tsx
git commit -m "feat(simulations): wire step sync for TcpHandshake, Encapsulation, DnsResolution"
```

---

## Task 8: Migrate step-based simulators (batch 2 — Dijkstra, GbnSr, SlidingWindow)

**Files:**
- Modify: `src/components/simulations/DijkstraSimulator.tsx`
- Modify: `src/components/simulations/GbnSrSimulator.tsx`
- Modify: `src/components/simulations/SlidingWindowSimulator.tsx`

Same pattern as Task 7. Dijkstra uses `currentStep`, GbnSr and SlidingWindow use `step`.

- [ ] **Step 1: Update DijkstraSimulator**

Add import at top:
```ts
import type { SimulatorStepProps } from './simulatorStepConfig';
```

Change signature:
```ts
export const DijkstraSimulator = ({ onStepChange }: SimulatorStepProps) => {
```

Add useEffect after state declarations:
```ts
useEffect(() => {
  if (onStepChange) {
    // Map internal algorithm steps to concept guide steps (4 phases)
    // Dijkstra has many internal steps; map to phase: 0=init, 1=relax, 2=select, 3=done
    const phase = currentStep === 0 ? 0
      : currentStep >= snapshots.length - 1 ? 3
      : currentStep % 2 === 1 ? 1 : 2;
    onStepChange(phase);
  }
}, [currentStep, onStepChange, snapshots.length]);
```

- [ ] **Step 2: Update GbnSrSimulator**

Add import at top:
```ts
import type { SimulatorStepProps } from './simulatorStepConfig';
```

Change signature:
```ts
export const GbnSrSimulator = ({ onStepChange }: SimulatorStepProps) => {
```

Add useEffect after state declarations:
```ts
useEffect(() => {
  if (onStepChange) {
    // Map internal step count to concept phases: 0=normal, 1=loss, 2=gbn-retx, 3=sr-retx
    // Simplified: early steps = normal, losses trigger phase 1, retransmits trigger 2-3
    const phase = step === 0 ? 0 : step <= 2 ? 0 : step <= 4 ? 1 : step <= 6 ? 2 : 3;
    onStepChange(phase);
  }
}, [step, onStepChange]);
```

- [ ] **Step 3: Update SlidingWindowSimulator**

Add import at top:
```ts
import type { SimulatorStepProps } from './simulatorStepConfig';
```

Change signature:
```ts
export const SlidingWindowSimulator = ({ onStepChange }: SimulatorStepProps) => {
```

Add useEffect after state declarations:
```ts
useEffect(() => {
  if (onStepChange) {
    // Map internal steps to concept phases: 0=init, 1=transmit, 2=ack, 3=full
    const phase = step === 0 ? 0 : step <= 3 ? 1 : step <= 6 ? 2 : 3;
    onStepChange(phase);
  }
}, [step, onStepChange]);
```

- [ ] **Step 4: Verify all three compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/simulations/DijkstraSimulator.tsx src/components/simulations/GbnSrSimulator.tsx src/components/simulations/SlidingWindowSimulator.tsx
git commit -m "feat(simulations): wire step sync for Dijkstra, GbnSr, SlidingWindow"
```

---

## Task 9: Migrate remaining simulators (batch 3 — event-driven and parameter-driven)

**Files:**
- Modify: `src/components/simulations/ArpSimulator.tsx`
- Modify: `src/components/simulations/CwndSimulator.tsx`
- Modify: `src/components/simulations/DistanceVectorSimulator.tsx`
- Modify: `src/components/simulations/LearningSwitchSimulator.tsx`
- Modify: `src/components/simulations/LpmSimulator.tsx`
- Modify: `src/components/simulations/MplsSimulator.tsx`
- Modify: `src/components/simulations/PipeAckClockingSimulator.tsx`
- Modify: `src/components/simulations/QueueManagementSimulator.tsx`
- Modify: `src/components/simulations/StpSimulator.tsx`
- Modify: `src/components/simulations/SubnettingCalculator.tsx`
- Modify: `src/components/simulations/WirelessAssociationSimulator.tsx`

These simulators are either event-driven (ARP, LearningSwitch), parameter-driven (Subnetting, LPM, PipeAckClocking), or have their own step systems (DistanceVector, MPLS, STP, CWND, QueueManagement, WirelessAssociation). For all of them, the migration is the same minimal pattern: accept optional `SimulatorStepProps`, do NOT wire `onStepChange` yet. The concept guide for these will show static educational steps.

- [ ] **Step 1: Add SimulatorStepProps to all 11 remaining simulators**

For each of these 11 files, add the import and update the signature. The pattern is identical for each:

Add import at top:
```ts
import type { SimulatorStepProps } from './simulatorStepConfig';
```

Change from `export const XxxSimulator = () => {` to `export const XxxSimulator = ({ onStepChange }: SimulatorStepProps) => {`

Files and their exact current signatures to change:

- `ArpSimulator.tsx`: `export const ArpSimulator = () => {` → `export const ArpSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `CwndSimulator.tsx`: `export const CwndSimulator = () => {` → `export const CwndSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `DistanceVectorSimulator.tsx`: `export const DistanceVectorSimulator = () => {` → `export const DistanceVectorSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `LearningSwitchSimulator.tsx`: `export const LearningSwitchSimulator = () => {` → `export const LearningSwitchSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `LpmSimulator.tsx`: `export const LpmSimulator = () => {` → `export const LpmSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `MplsSimulator.tsx`: `export const MplsSimulator = () => {` → `export const MplsSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `PipeAckClockingSimulator.tsx`: `export const PipeAckClockingSimulator = () => {` → `export const PipeAckClockingSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `QueueManagementSimulator.tsx`: `export const QueueManagementSimulator = () => {` → `export const QueueManagementSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `StpSimulator.tsx`: `export const StpSimulator = () => {` → `export const StpSimulator = ({ onStepChange }: SimulatorStepProps) => {`
- `SubnettingCalculator.tsx`: `export const SubnettingCalculator = () => {` → `export const SubnettingCalculator = ({ onStepChange }: SimulatorStepProps) => {`
- `WirelessAssociationSimulator.tsx`: `export const WirelessAssociationSimulator = () => {` → `export const WirelessAssociationSimulator = ({ onStepChange }: SimulatorStepProps) => {`

- [ ] **Step 2: Verify all compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/simulations/ArpSimulator.tsx src/components/simulations/CwndSimulator.tsx src/components/simulations/DistanceVectorSimulator.tsx src/components/simulations/LearningSwitchSimulator.tsx src/components/simulations/LpmSimulator.tsx src/components/simulations/MplsSimulator.tsx src/components/simulations/PipeAckClockingSimulator.tsx src/components/simulations/QueueManagementSimulator.tsx src/components/simulations/StpSimulator.tsx src/components/simulations/SubnettingCalculator.tsx src/components/simulations/WirelessAssociationSimulator.tsx
git commit -m "feat(simulations): add SimulatorStepProps to remaining 11 simulators"
```

---

## Task 10: Wire step sync from SimulationsMode to simulators

**Files:**
- Modify: `src/components/SimulationsMode.tsx`

Now that all simulators accept `onStepChange`, pass the callback from `SimulationsMode` so the ConceptGuide tracks along.

- [ ] **Step 1: Update the simulator rendering in SimulationsMode**

In `src/components/SimulationsMode.tsx`, change the line:

```tsx
      <SimComponent />
```

To:

```tsx
      <SimComponent onStepChange={handleStepChange} />
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Test in browser**

Run: `npm run dev`
Navigate to simulations → open TCP Handshake. Click Play or Step:
- The Concept Guide sidebar should highlight the current step
- Clicking a step in the guide should (not yet) jump the simulation — that's the click-to-jump feature

- [ ] **Step 4: Commit**

```bash
git add src/components/SimulationsMode.tsx
git commit -m "feat(simulations): wire onStepChange from SimulationsMode to all simulator components"
```

---

## Task 11: Full build verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run ESLint**

Run: `npm run lint`
Expected: No new errors introduced by our changes.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run preview`
Test these flows:
1. Hub loads with hero banner, 4 module cards, difficulty filter
2. Filter to "Beginner" — only shows modules with Introductory simulators
3. Click "Explore" on Foundations — expands to show 3 simulators
4. Click "Packet Encapsulation" — focused view loads with Concept Guide
5. Click Play — simulation runs, Concept Guide step highlights track along
6. Click Exit — returns to hub
7. Click "Begin Simulation" on hero banner — opens Encapsulation
8. Resize to mobile width — Concept Guide sidebar collapses to step dots

- [ ] **Step 5: Commit any lint/build fixes if needed**

If any issues were found and fixed in steps 1-3:
```bash
git add -u
git commit -m "fix(simulations): address lint and build issues from redesign"
```
