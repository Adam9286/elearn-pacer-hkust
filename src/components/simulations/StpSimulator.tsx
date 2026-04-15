import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarDangerButtonClass,
  toolbarGhostButtonClass,
  toolbarPrimaryButtonClass,
  toolbarSecondaryButtonClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

type SwitchId = 'S1' | 'S2' | 'S3' | 'S4';

interface StpSwitchState {
  rootId: number;
  costToRoot: number;
  parent: SwitchId | '-';
  changed: boolean;
}

type StpStateMap = Record<SwitchId, StpSwitchState>;

interface Link {
  id: string;
  a: SwitchId;
  b: SwitchId;
  cost: number;
  active: boolean;
}

interface RoundComputation {
  nextState: StpStateMap;
  updates: string[];
}

interface SimulatorState {
  round: number;
  switches: StpStateMap;
  links: Link[];
  updates: string[];
  failureEvents: string[];
  converged: boolean;
}

const SWITCH_IDS: SwitchId[] = ['S1', 'S2', 'S3', 'S4'];

const BRIDGE_ID: Record<SwitchId, number> = {
  S1: 10,
  S2: 20,
  S3: 30,
  S4: 40,
};

const BASE_LINKS: Link[] = [
  { id: 'L12', a: 'S1', b: 'S2', cost: 1, active: true },
  { id: 'L23', a: 'S2', b: 'S3', cost: 1, active: true },
  { id: 'L34', a: 'S3', b: 'S4', cost: 1, active: true },
  { id: 'L41', a: 'S4', b: 'S1', cost: 1, active: true },
  { id: 'L24', a: 'S2', b: 'S4', cost: 1, active: true },
];

const initialSwitchState = (): StpStateMap => {
  const state = {} as StpStateMap;
  for (const id of SWITCH_IDS) {
    state[id] = {
      rootId: BRIDGE_ID[id],
      costToRoot: 0,
      parent: '-',
      changed: false,
    };
  }
  return state;
};

const activeNeighbors = (switchId: SwitchId, links: Link[]) =>
  links
    .filter((link) => link.active && (link.a === switchId || link.b === switchId))
    .map((link) => ({
      neighbor: link.a === switchId ? link.b : link.a,
      cost: link.cost,
    }));

const findRootSwitch = (state: StpStateMap): SwitchId =>
  SWITCH_IDS.reduce((best, current) => {
    const currentRoot = state[current].rootId;
    const bestRoot = state[best].rootId;
    if (currentRoot < bestRoot) return current;
    if (currentRoot === bestRoot && BRIDGE_ID[current] < BRIDGE_ID[best]) return current;
    return best;
  }, 'S1');

const compareCandidate = (
  left: { rootId: number; cost: number; senderBridgeId: number },
  right: { rootId: number; cost: number; senderBridgeId: number }
) => {
  if (left.rootId !== right.rootId) return left.rootId < right.rootId;
  if (left.cost !== right.cost) return left.cost < right.cost;
  return left.senderBridgeId < right.senderBridgeId;
};

const computeElectionRound = (current: StpStateMap, links: Link[]): RoundComputation => {
  const next = {} as StpStateMap;
  const updates: string[] = [];

  for (const sw of SWITCH_IDS) {
    const currentInfo = current[sw];
    let best = {
      rootId: currentInfo.rootId,
      cost: currentInfo.costToRoot,
      senderBridgeId: currentInfo.parent === '-' ? BRIDGE_ID[sw] : BRIDGE_ID[currentInfo.parent],
      parent: currentInfo.parent,
    };

    const neighbors = activeNeighbors(sw, links);
    for (const item of neighbors) {
      const neighborState = current[item.neighbor];
      const candidate = {
        rootId: neighborState.rootId,
        cost: neighborState.costToRoot + item.cost,
        senderBridgeId: BRIDGE_ID[item.neighbor],
        parent: item.neighbor as SwitchId,
      };
      if (compareCandidate(candidate, best)) best = candidate;
    }

    const changed =
      currentInfo.rootId !== best.rootId ||
      currentInfo.costToRoot !== best.cost ||
      currentInfo.parent !== best.parent;

    next[sw] = {
      rootId: best.rootId,
      costToRoot: best.cost,
      parent: best.parent,
      changed,
    };

    if (changed) {
      const prevParent = currentInfo.parent === '-' ? 'self' : currentInfo.parent;
      const nextParent = best.parent === '-' ? 'self' : best.parent;
      updates.push(
        `${sw}: root ${currentInfo.rootId} cost ${currentInfo.costToRoot} via ${prevParent} -> root ${best.rootId} cost ${best.cost} via ${nextParent}`
      );
    }
  }

  return { nextState: next, updates };
};

const normalizeLinkKey = (a: SwitchId, b: SwitchId) => [a, b].sort().join('-');

const computeTreeStatus = (state: StpStateMap, links: Link[]) => {
  const rootSwitch = findRootSwitch(state);
  const forwardingEdges = new Set<string>();

  for (const sw of SWITCH_IDS) {
    if (sw === rootSwitch) continue;
    const parent = state[sw].parent;
    if (parent !== '-') forwardingEdges.add(normalizeLinkKey(sw, parent));
  }

  const linkStatus = links.map((link) => {
    if (!link.active) return { ...link, status: 'down' as const };
    const key = normalizeLinkKey(link.a, link.b);
    if (forwardingEdges.has(key)) return { ...link, status: 'forwarding' as const };
    return { ...link, status: 'blocked' as const };
  });

  return {
    rootSwitch,
    forwardingEdges,
    linkStatus,
    blockedCount: linkStatus.filter((link) => link.status === 'blocked').length,
  };
};

const createSimulatorState = (): SimulatorState => ({
  round: 0,
  switches: initialSwitchState(),
  links: BASE_LINKS.map((link) => ({ ...link })),
  updates: ['Initial BPDU state: each switch advertises itself as root bridge.'],
  failureEvents: [],
  converged: false,
});

const STP_BASE_LESSON: Omit<SimulationLesson, 'steps'> = {
  intro: 'This simulator teaches how Spanning Tree Protocol removes switching loops without physically deleting links.',
  focus: 'Watch which switch becomes the root and which links stay forwarding versus blocked.',
  glossary: [
    { term: 'STP', definition: 'A protocol that prevents layer-2 loops by building one logical tree.' },
    { term: 'Root Bridge', definition: 'The switch with the best bridge ID that becomes the center of the tree.' },
    { term: 'Root Port', definition: 'A non-root switch’s best path back to the root bridge.' },
    { term: 'Blocked Link', definition: 'A physical link that stays available but does not forward traffic right now.' },
  ],
  takeaway: 'STP keeps backup links physically present while logically blocking enough of them to stop loops.',
  commonMistake: 'A blocked STP link is not broken. It is intentionally quiet so Ethernet broadcasts do not loop forever.',
  nextObservation: 'Fail a root-facing link and see how STP unblocks an alternate path to build a new safe tree.',
};

export const StpSimulator = ({ onStepChange, onGuideStateChange }: SimulatorStepProps) => {
  const [sim, setSim] = useState<SimulatorState>(createSimulatorState);

  const currentGuideStep = sim.failureEvents.length > 0
    ? 3
    : sim.converged
      ? 2
      : sim.round >= 2
        ? 2
        : sim.round >= 1
        ? 1
        : 0;
  const coachLesson: SimulationLesson = {
    ...STP_BASE_LESSON,
    steps: [
      {
        title: 'Root Election',
        explanation: 'Every switch first claims it could be the root. The lowest bridge ID wins that election.',
        whatToNotice: `Right now the chosen root is ${findRootSwitch(sim.switches)}.`,
        whyItMatters: 'A single shared root gives every switch the same reference point for loop-free decisions.',
      },
      {
        title: 'Root Port Selection',
        explanation: 'Each non-root switch chooses the lowest-cost way to reach the root bridge.',
        whatToNotice: 'The root-port field on each switch card shows which upstream neighbor it trusts most.',
        whyItMatters: 'Without one preferred upstream path per switch, the topology could forward in circles.',
      },
      {
        title: 'Designated Ports',
        explanation: 'STP now decides which links keep forwarding and which alternatives must stay blocked.',
        whatToNotice: sim.updates[0] ?? 'Check the Physical Links vs Logical Tree panel to see forwarding versus blocked links.',
        whyItMatters: 'This is the moment the physical mesh becomes one logical tree.',
      },
      {
        title: 'Topology Change',
        explanation: sim.failureEvents.length > 0
          ? 'A root-facing link failed, so STP is recomputing the tree and may activate a backup path.'
          : 'Once no more updates appear, the topology has converged to a stable spanning tree.',
        whatToNotice: sim.failureEvents[0] ?? 'Trigger a root-link failure to see why blocked links are useful backups.',
        whyItMatters: STP_BASE_LESSON.takeaway,
      },
    ],
  };

  useEffect(() => {
    onStepChange?.(currentGuideStep);
    onGuideStateChange?.({
      steps: [
        { title: 'Root Election', description: 'Switches compare bridge IDs until the lowest ID becomes the root.' },
        { title: 'Root Port Selection', description: 'Each non-root switch picks its lowest-cost path back to the root bridge.' },
        { title: 'Designated Ports', description: 'Forwarding ports form the loop-free logical tree while alternatives are blocked.' },
        { title: 'Topology Change', description: 'When a root-facing link fails, STP recomputes roles and converges again.' },
      ],
      currentStep: currentGuideStep,
      mode: 'convergence',
      isComplete: sim.converged,
    });
  }, [currentGuideStep, onGuideStateChange, onStepChange, sim.converged]);

  const runOneRound = useCallback(() => {
    setSim((prev) => {
      const result = computeElectionRound(prev.switches, prev.links);
      const converged = result.updates.length === 0;
      return {
        ...prev,
        round: prev.round + 1,
        switches: result.nextState,
        updates: converged ? ['No BPDU improvements this round. Tree is stable.'] : result.updates,
        converged,
      };
    });
  }, []);

  const runUntilStable = useCallback(() => {
    setSim((prev) => {
      let round = prev.round;
      let current = prev.switches;
      let updates: string[] = [];
      let converged = false;

      for (let index = 0; index < 20; index++) {
        const result = computeElectionRound(current, prev.links);
        round += 1;
        current = result.nextState;
        updates = result.updates;
        if (updates.length === 0) {
          converged = true;
          break;
        }
      }

      return {
        ...prev,
        round,
        switches: current,
        updates: converged ? ['Converged: no further BPDU improvements.'] : updates,
        converged,
      };
    });
  }, []);

  const failRootLink = useCallback(() => {
    setSim((prev) => {
      const tree = computeTreeStatus(prev.switches, prev.links);
      const root = tree.rootSwitch;
      const activeRootForwardingLinks = tree.linkStatus.filter(
        (link) => link.status === 'forwarding' && (link.a === root || link.b === root)
      );
      if (activeRootForwardingLinks.length === 0) {
        return {
          ...prev,
          updates: ['No active forwarding root link available to fail.'],
        };
      }

      const failed = activeRootForwardingLinks[0];
      const nextLinks = prev.links.map((link) =>
        link.id === failed.id
          ? {
              ...link,
              active: false,
            }
          : link
      );

      return {
        round: 0,
        switches: initialSwitchState(),
        links: nextLinks,
        updates: [`Root link ${failed.id} failed. Run rounds again to recompute spanning tree.`],
        failureEvents: [
          `Failed ${failed.id} (${failed.a}-${failed.b}) while ${root} was root bridge.`,
          ...prev.failureEvents,
        ].slice(0, 8),
        converged: false,
      };
    });
  }, []);

  const resetSimulation = useCallback(() => {
    setSim(createSimulatorState());
  }, []);

  const tree = useMemo(() => computeTreeStatus(sim.switches, sim.links), [sim.switches, sim.links]);
  const activePhysicalLinks = tree.linkStatus.filter((link) => link.active).length;
  const forwardingLinks = tree.linkStatus.filter((link) => link.status === 'forwarding').length;

  return (
    <div className="space-y-4">

      <SimulatorToolbar
        label="Simulation Controls"
        status={(
          <>
            <Badge className="border-primary/25 bg-primary/10 text-primary">Round {sim.round}</Badge>
            <Badge variant="outline" className="border-border bg-background/80 text-foreground">Root Bridge: {tree.rootSwitch} (ID {BRIDGE_ID[tree.rootSwitch]})</Badge>
            {sim.converged && <Badge className="border-emerald-400/25 bg-emerald-500/15 text-emerald-200">Converged</Badge>}
          </>
        )}
      >
        <div className={toolbarControlGroupClass}>
          <Button onClick={runOneRound} className={toolbarPrimaryButtonClass}>Run 1 BPDU Round</Button>
          <Button variant="outline" onClick={runUntilStable} className={toolbarSecondaryButtonClass}>
            Run Until Stable
          </Button>
          <Button variant="destructive" onClick={failRootLink} className={toolbarDangerButtonClass}>
            Fail a Root Link
          </Button>
          <Button variant="ghost" className={`gap-2 ${toolbarGhostButtonClass}`} onClick={resetSimulation}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </SimulatorToolbar>

      <SimulationCanvas
        isLive={sim.round > 0 && !sim.converged}
        statusMode="convergence"
        isComplete={sim.converged}
        coachPanel={(
          <SimulationCoachPanel
            lesson={coachLesson}
            currentStep={currentGuideStep}
            isComplete={sim.converged}
          />
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {SWITCH_IDS.map((sw) => {
            const state = sim.switches[sw];
            return (
              <div key={sw} className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">
                    {sw} (Bridge ID {BRIDGE_ID[sw]})
                  </div>
                  {sw === tree.rootSwitch && (
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40">Root</Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded bg-muted/40 px-2 py-1">
                    <div className="text-zinc-600 dark:text-zinc-400">Root ID</div>
                    <div className="text-foreground">{state.rootId}</div>
                  </div>
                  <div className="rounded bg-muted/40 px-2 py-1">
                    <div className="text-zinc-600 dark:text-zinc-400">Cost</div>
                    <div className="text-foreground">{state.costToRoot}</div>
                  </div>
                  <div className="rounded bg-muted/40 px-2 py-1">
                    <div className="text-zinc-600 dark:text-zinc-400">Root Port</div>
                    <div className="text-foreground">{state.parent === '-' ? 'self' : state.parent}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Physical Links vs Logical Tree</h3>
          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <div>Link</div>
            <div>Cost</div>
            <div>State</div>
            <div>Role</div>
          </div>
          {tree.linkStatus.map((link) => (
            <div key={link.id} className="grid grid-cols-4 gap-2 text-xs rounded px-1 py-1">
              <div className="text-foreground">
                {link.id}: {link.a}-{link.b}
              </div>
              <div className="text-zinc-600 dark:text-zinc-400">{link.cost}</div>
              <div
                className={
                  link.status === 'forwarding'
                    ? 'text-emerald-400'
                    : link.status === 'blocked'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }
              >
                {link.status.toUpperCase()}
              </div>
              <div className="text-zinc-600 dark:text-zinc-400">
                {link.status === 'forwarding'
                  ? 'In logical tree'
                  : link.status === 'blocked'
                    ? 'Loop mitigation'
                    : 'Failed'}
              </div>
            </div>
          ))}
          <div className="pt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Active physical links: {activePhysicalLinks} | Forwarding links in logical tree: {forwardingLinks} | Blocked links:{' '}
            {tree.blockedCount}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Round Updates</h3>
          {sim.updates.map((line, index) => (
            <div key={`${line}-${index}`} className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
              {line}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Failure Events</h3>
          {sim.failureEvents.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">No root-link failure triggered yet.</div>
          ) : (
            sim.failureEvents.map((event) => (
              <div key={event} className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {event}
              </div>
            ))
          )}
        </div>

        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>Blocked links prevent layer-2 loops and broadcast storms while preserving backup paths.</span>
          </div>
        </div>

        {tree.blockedCount > 0 && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/90">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-emerald-300" />
              <span>Logical spanning tree is loop-free. Failing a root link forces STP recomputation.</span>
            </div>
          </div>
        )}
      </SimulationCanvas>
    </div>
  );
};
