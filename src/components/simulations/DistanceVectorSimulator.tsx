import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, GitBranch, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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

type NodeId = 'A' | 'B' | 'C' | 'D';
type NextHop = NodeId | '-';

interface RouteEntry {
  distance: number;
  nextHop: NextHop;
  changed: boolean;
}

type RouteTable = Record<NodeId, Record<NodeId, RouteEntry>>;

interface LinkState {
  AB: boolean;
  BC: boolean;
  CD: boolean;
}

interface RoundResult {
  nextTable: RouteTable;
  equationsToD: string[];
  updates: string[];
}

interface SimulationState {
  round: number;
  routeTable: RouteTable;
  linkState: LinkState;
  history: Array<{ round: number; A: number; B: number; C: number; D: number }>;
  equationsToD: string[];
  updates: string[];
  linkFailureTriggered: boolean;
}

const NODES: NodeId[] = ['A', 'B', 'C', 'D'];
const RIP_INFINITY = 16;

const defaultLinks: LinkState = { AB: true, BC: true, CD: true };

const metricLabel = (value: number) => (value >= RIP_INFINITY ? 'INF' : String(value));

const DISTANCE_VECTOR_BASE_LESSON: Omit<SimulationLesson, 'steps'> = {
  intro: 'This simulator teaches distance-vector routing, where each router learns only from neighbors instead of seeing the whole network.',
  focus: 'Watch what changes from round to round. The important learning happens when routers update their beliefs after hearing neighbors.',
  glossary: [
    { term: 'Distance Vector', definition: 'A summary of route costs that a router advertises to neighbors.' },
    { term: 'Bellman-Ford', definition: 'The rule that picks the cheapest neighbor path plus link cost.' },
    { term: 'Poison Reverse', definition: 'A technique that warns a neighbor not to route back through you.' },
    { term: 'Count to Infinity', definition: 'A failure pattern where bad route costs keep rising slowly.' },
  ],
  takeaway: 'Distance-vector routing is simple to run, but failures can take time to correct because each router learns only one hop at a time.',
  commonMistake: 'Routers here do not know the full topology. They only know what their neighbors most recently said.',
  nextObservation: 'Trigger the C-D failure and compare the outcome with Poison Reverse disabled and enabled.',
};

const cloneRouteTable = (table: RouteTable): RouteTable => {
  const cloned = {} as RouteTable;
  for (const node of NODES) {
    cloned[node] = {} as Record<NodeId, RouteEntry>;
    for (const dest of NODES) {
      cloned[node][dest] = { ...table[node][dest] };
    }
  }
  return cloned;
};

const getNeighborCost = (from: NodeId, to: NodeId, links: LinkState): number | null => {
  if ((from === 'A' && to === 'B') || (from === 'B' && to === 'A')) return links.AB ? 1 : null;
  if ((from === 'B' && to === 'C') || (from === 'C' && to === 'B')) return links.BC ? 1 : null;
  if ((from === 'C' && to === 'D') || (from === 'D' && to === 'C')) return links.CD ? 1 : null;
  return null;
};

const getNeighbors = (node: NodeId, links: LinkState): NodeId[] =>
  NODES.filter((other) => other !== node && getNeighborCost(node, other, links) !== null);

const buildDirectKnowledgeTable = (links: LinkState): RouteTable => {
  const table = {} as RouteTable;
  for (const node of NODES) {
    table[node] = {} as Record<NodeId, RouteEntry>;
    for (const dest of NODES) {
      if (node === dest) {
        table[node][dest] = { distance: 0, nextHop: node, changed: false };
      } else {
        const directCost = getNeighborCost(node, dest, links);
        table[node][dest] = directCost === null
          ? { distance: RIP_INFINITY, nextHop: '-', changed: false }
          : { distance: directCost, nextHop: dest, changed: false };
      }
    }
  }
  return table;
};

const tablesEquivalent = (left: RouteTable, right: RouteTable): boolean => {
  for (const node of NODES) {
    for (const dest of NODES) {
      if (left[node][dest].distance !== right[node][dest].distance || left[node][dest].nextHop !== right[node][dest].nextHop) {
        return false;
      }
    }
  }
  return true;
};

const computeRound = (currentTable: RouteTable, links: LinkState, poisonReverse: boolean): RoundResult => {
  const advertisements = {} as Record<NodeId, Record<NodeId, Record<NodeId, number>>>;
  for (const sender of NODES) {
    advertisements[sender] = {} as Record<NodeId, Record<NodeId, number>>;
    for (const receiver of getNeighbors(sender, links)) {
      advertisements[sender][receiver] = {} as Record<NodeId, number>;
      for (const dest of NODES) {
        let advertised = currentTable[sender][dest].distance;
        const senderNextHop = currentTable[sender][dest].nextHop;
        if (poisonReverse && senderNextHop === receiver && dest !== sender && dest !== receiver) {
          advertised = RIP_INFINITY;
        }
        advertisements[sender][receiver][dest] = Math.min(RIP_INFINITY, advertised);
      }
    }
  }

  const nextTable = cloneRouteTable(currentTable);
  const equationsToD: string[] = [];
  const updates: string[] = [];

  for (const router of NODES) {
    for (const dest of NODES) {
      const previous = currentTable[router][dest];
      if (router === dest) {
        nextTable[router][dest] = { distance: 0, nextHop: router, changed: false };
        continue;
      }

      let bestDistance = RIP_INFINITY;
      let bestNextHop: NextHop = '-';
      const candidates: Array<{ neighbor: NodeId; candidate: number; advertised: number; cost: number }> = [];

      for (const neighbor of getNeighbors(router, links)) {
        const linkCost = getNeighborCost(router, neighbor, links);
        if (linkCost === null) continue;
        const advertised = advertisements[neighbor][router][dest];
        const candidate = Math.min(RIP_INFINITY, linkCost + advertised);
        candidates.push({ neighbor, candidate, advertised, cost: linkCost });

        if (candidate < bestDistance || (candidate === bestDistance && neighbor < (bestNextHop as NodeId))) {
          bestDistance = candidate;
          bestNextHop = candidate >= RIP_INFINITY ? '-' : neighbor;
        }
      }

      if (bestDistance >= RIP_INFINITY) {
        bestDistance = RIP_INFINITY;
        bestNextHop = '-';
      }

      const changed = previous.distance !== bestDistance || previous.nextHop !== bestNextHop;
      nextTable[router][dest] = { distance: bestDistance, nextHop: bestNextHop, changed };

      if (changed) {
        updates.push(
          `${router}->${dest}: ${metricLabel(previous.distance)} via ${previous.nextHop} -> ${metricLabel(bestDistance)} via ${bestNextHop}`
        );
      }

      if (dest === 'D') {
        if (candidates.length === 0) {
          equationsToD.push(`${router}: no neighbors -> INF`);
        } else {
          const expression = candidates
            .map((item) => `${item.neighbor}: ${item.cost}+${metricLabel(item.advertised)}=${metricLabel(item.candidate)}`)
            .join(' | ');
          equationsToD.push(`${router}->D = min(${expression}) => ${metricLabel(bestDistance)} via ${bestNextHop}`);
        }
      }
    }
  }

  return { nextTable, equationsToD, updates };
};

const buildHistoryPoint = (round: number, table: RouteTable) => ({
  round,
  A: Math.min(RIP_INFINITY, table.A.D.distance),
  B: Math.min(RIP_INFINITY, table.B.D.distance),
  C: Math.min(RIP_INFINITY, table.C.D.distance),
  D: Math.min(RIP_INFINITY, table.D.D.distance),
});

const converge = (seed: RouteTable, links: LinkState, poisonReverse: boolean): RouteTable => {
  let current = cloneRouteTable(seed);
  for (let iteration = 0; iteration < 20; iteration++) {
    const result = computeRound(current, links, poisonReverse);
    if (tablesEquivalent(current, result.nextTable)) break;
    current = result.nextTable;
  }
  for (const node of NODES) {
    for (const dest of NODES) {
      current[node][dest].changed = false;
    }
  }
  return current;
};

const createInitialState = (poisonReverse: boolean): SimulationState => {
  const directTable = buildDirectKnowledgeTable(defaultLinks);
  const stableTable = converge(directTable, defaultLinks, poisonReverse);
  return {
    round: 0,
    routeTable: stableTable,
    linkState: { ...defaultLinks },
    history: [buildHistoryPoint(0, stableTable)],
    equationsToD: ['Stable baseline loaded (all links up). Click "Trigger Link Failure C-D" then run lock-step rounds.'],
    updates: [],
    linkFailureTriggered: false,
  };
};

export const DistanceVectorSimulator = ({ onStepChange, onGuideStateChange }: SimulatorStepProps) => {
  const [poisonReverse, setPoisonReverse] = useState(false);
  const [sim, setSim] = useState<SimulationState>(() => createInitialState(false));

  const isConverged = sim.round > 0 && sim.updates.length === 0;
  const currentGuideStep = sim.linkFailureTriggered
    ? 3
    : sim.round >= 2
      ? 2
      : sim.round >= 1
        ? 1
        : 0;
  const coachLesson: SimulationLesson = {
    ...DISTANCE_VECTOR_BASE_LESSON,
    focus: poisonReverse
      ? 'Poison Reverse is enabled, so watch how routers avoid sending misleading return paths to each other.'
      : DISTANCE_VECTOR_BASE_LESSON.focus,
    steps: [
      {
        title: 'Initialize Tables',
        explanation: 'Each router begins with only its direct-neighbor costs. Farther destinations start as unknown or unreachable.',
        whatToNotice: 'Before the first round, no router has a global map. It only knows itself and nearby links.',
        whyItMatters: 'This limited view is what makes distance-vector routing easy to implement but slower to react.',
      },
      {
        title: 'Exchange Vectors',
        explanation: `Round ${sim.round}: routers advertise what they currently believe about the network to each neighbor.`,
        whatToNotice: sim.equationsToD[0] ?? 'Look at the exchange summary to see which neighbor costs are being compared.',
        whyItMatters: 'Distance-vector routing improves only because routers keep learning from one another over repeated rounds.',
      },
      {
        title: 'Bellman-Ford Update',
        explanation: sim.updates.length > 0
          ? `This round changed routes. Example: ${sim.updates[0]}`
          : 'This round did not improve any route, so the table stayed the same.',
        whatToNotice: 'Rows marked as changed show where a better path or a worse failure-driven path replaced the old one.',
        whyItMatters: 'This repeated cost comparison is the core algorithm behind RIP-style routing.',
      },
      {
        title: 'Convergence or Loop',
        explanation: sim.linkFailureTriggered
          ? 'A link has failed. Now the routers must relearn the network, and bad information can bounce back and forth.'
          : 'When no rows change anymore, the system has converged for the current topology.',
        whatToNotice: isConverged
          ? 'No updates this round means the network view is stable.'
          : 'If costs keep rising after the failure, you are seeing count-to-infinity behavior.',
        whyItMatters: DISTANCE_VECTOR_BASE_LESSON.takeaway,
      },
    ],
  };

  useEffect(() => {
    onStepChange?.(currentGuideStep);
    onGuideStateChange?.({
      steps: [
        { title: 'Initialize Tables', description: 'Each router starts with direct-neighbor knowledge and no global map.' },
        { title: 'Exchange Vectors', description: 'Routers advertise their current distance vectors to each neighbor in lock-step rounds.' },
        { title: 'Bellman-Ford Update', description: 'Each router recomputes the best next hop using link cost plus neighbor advertisement.' },
        { title: 'Convergence or Loop', description: 'After a failure, the system either reconverges or exhibits count-to-infinity behaviour.' },
      ],
      currentStep: currentGuideStep,
      mode: 'convergence',
      isComplete: isConverged,
    });
  }, [currentGuideStep, isConverged, onGuideStateChange, onStepChange]);

  const runRound = useCallback(() => {
    setSim((prev) => {
      const result = computeRound(prev.routeTable, prev.linkState, poisonReverse);
      const nextRound = prev.round + 1;
      return {
        ...prev,
        round: nextRound,
        routeTable: result.nextTable,
        equationsToD: result.equationsToD,
        updates: result.updates,
        history: [...prev.history, buildHistoryPoint(nextRound, result.nextTable)],
      };
    });
  }, [poisonReverse]);

  const runFiveRounds = useCallback(() => {
    for (let index = 0; index < 5; index++) runRound();
  }, [runRound]);

  const triggerFailure = useCallback(() => {
    setSim((prev) => {
      if (!prev.linkState.CD) return prev;
      const nextTable = cloneRouteTable(prev.routeTable);
      nextTable.C.D = { distance: RIP_INFINITY, nextHop: '-', changed: true };
      nextTable.D.C = { distance: RIP_INFINITY, nextHop: '-', changed: true };
      nextTable.D.A = { distance: RIP_INFINITY, nextHop: '-', changed: true };
      nextTable.D.B = { distance: RIP_INFINITY, nextHop: '-', changed: true };

      return {
        ...prev,
        routeTable: nextTable,
        linkState: { ...prev.linkState, CD: false },
        equationsToD: ['Link C-D failed. Router C and D invalidate direct reachability immediately.'],
        updates: ['C-D marked down. Continue with rounds to observe convergence behavior.'],
        linkFailureTriggered: true,
        history: [...prev.history, buildHistoryPoint(prev.round, nextTable)],
      };
    });
  }, []);

  const resetSimulation = useCallback((nextPoisonReverse: boolean) => {
    setSim(createInitialState(nextPoisonReverse));
  }, []);

  const togglePoisonReverse = useCallback((enabled: boolean) => {
    setPoisonReverse(enabled);
    resetSimulation(enabled);
  }, [resetSimulation]);

  const maxHistoryRound = sim.history[sim.history.length - 1]?.round ?? 0;
  const chartData = useMemo(
    () =>
      sim.history.map((item) => ({
        round: item.round,
        A_to_D: item.A,
        B_to_D: item.B,
        C_to_D: item.C,
      })),
    [sim.history]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Distance Vector (RIP-Style) Simulator</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Four-node topology A-B-C-D. Routers exchange vectors each lock-step round and update routes via min(all paths).
        </p>
      </div>

      <SimulatorToolbar
        label="Topology and Controls"
        status={(
          <>
            <span>Round {sim.round}</span>
            <span className={sim.linkState.CD ? 'text-emerald-300' : 'text-red-300'}>
              C-D {sim.linkState.CD ? 'UP (1)' : 'DOWN'}
            </span>
          </>
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className={toolbarControlGroupClass}>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">A-B: {sim.linkState.AB ? 'UP (1)' : 'DOWN'}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">B-C: {sim.linkState.BC ? 'UP (1)' : 'DOWN'}</span>
            <span className={`text-sm font-medium ${sim.linkState.CD ? 'text-emerald-400' : 'text-red-400'}`}>
              C-D: {sim.linkState.CD ? 'UP (1)' : 'DOWN'}
            </span>
          </div>

          <div className={toolbarControlGroupClass}>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Poison Reverse</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Toggle resets simulation for clean comparison.</div>
              </div>
              <Switch checked={poisonReverse} onCheckedChange={togglePoisonReverse} />
            </div>

            <Button onClick={runRound} className={`gap-2 ${toolbarPrimaryButtonClass}`}>
              <GitBranch className="h-4 w-4" />
              Run 1 Round
            </Button>
            <Button variant="outline" onClick={runFiveRounds} className={toolbarSecondaryButtonClass}>
              Run 5 Rounds
            </Button>
            <Button variant="destructive" onClick={triggerFailure} disabled={!sim.linkState.CD} className={toolbarDangerButtonClass}>
              Trigger Link Failure C-D
            </Button>
            <Button variant="ghost" onClick={() => resetSimulation(poisonReverse)} className={`gap-2 ${toolbarGhostButtonClass}`}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </SimulatorToolbar>

      <SimulationCanvas
        isLive={sim.round > 0 && !isConverged}
        statusMode="convergence"
        isComplete={isConverged}
        coachPanel={(
          <SimulationCoachPanel
            lesson={coachLesson}
            currentStep={currentGuideStep}
            isComplete={isConverged}
          />
        )}
      >
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Count to Infinity Trend (Distance to D)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 6, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="round" stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, RIP_INFINITY]} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number) => [metricLabel(value), 'distance']}
              />
              <Legend />
              <ReferenceLine y={RIP_INFINITY} stroke="#ef4444" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="A_to_D" stroke="#60a5fa" strokeWidth={2.2} dot={false} name="A->D" />
              <Line type="monotone" dataKey="B_to_D" stroke="#f59e0b" strokeWidth={2.2} dot={false} name="B->D" />
              <Line type="monotone" dataKey="C_to_D" stroke="#34d399" strokeWidth={2.2} dot={false} name="C->D" />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-200">
            Without Poison Reverse, B and C can keep increasing D metrics toward INF after C-D fails.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Round Exchange Summary (Destination D)</h3>
          {sim.equationsToD.map((line, index) => (
            <div key={`${line}-${index}`} className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
              {line}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Route Updates This Round</h3>
          {sim.updates.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">No route changes in this round.</div>
          ) : (
            sim.updates.map((line, index) => (
              <div key={`${line}-${index}`} className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                {line}
              </div>
            ))
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {NODES.map((router) => (
            <div key={router} className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-3">
              <h4 className="text-sm font-semibold text-foreground mb-2">Router {router}</h4>
              <div className="grid grid-cols-3 gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                <div>Dest</div>
                <div>Distance</div>
                <div>Next Hop</div>
              </div>
              {NODES.map((dest) => {
                const entry = sim.routeTable[router][dest];
                return (
                  <div
                    key={`${router}-${dest}`}
                    className={`grid grid-cols-3 gap-1 rounded px-1 py-1 text-xs ${
                      entry.changed ? 'bg-amber-500/10 border border-amber-500/30' : ''
                    }`}
                  >
                    <div className="text-foreground">{dest}</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{metricLabel(entry.distance)}</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{entry.nextHop}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">RIP vs OSPF</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This simulator uses RIP-style distance vectors: periodic neighbor exchanges and slower convergence after failures.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            OSPF uses link-state flooding plus Dijkstra SPF on a global map, which typically converges faster and avoids
            count-to-infinity.
          </p>
        </div>

        {sim.linkFailureTriggered && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Link failure active. Continue running rounds to compare convergence with and without Poison Reverse.</span>
            </div>
          </div>
        )}

        <div className="text-xs text-zinc-600 dark:text-zinc-400">History points: {maxHistoryRound + 1}</div>
      </SimulationCanvas>
    </div>
  );
};
