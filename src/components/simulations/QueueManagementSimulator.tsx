import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SimulationCanvas } from './SimulationCanvas';

type FlowId = 'f1' | 'f2' | 'f3';
type SchedulerPolicy = 'fifo' | 'rr' | 'wfq';

interface FlowConfig {
  id: FlowId;
  demandRate: number;
  weight: number;
}

interface QueueSimulationPoint {
  slot: number;
  queue: number;
  drops: number;
  arrivals: number;
  departures: number;
}

interface QueueSimulationSummary {
  points: QueueSimulationPoint[];
  totalDropped: number;
  droppedByFlow: Record<FlowId, number>;
  servedByFlow: Record<FlowId, number>;
  throughputByFlow: Record<FlowId, number>;
  fairnessIndex: number;
  maxQueue: number;
  longestDropBurst: number;
}

const FLOW_IDS: FlowId[] = ['f1', 'f2', 'f3'];
const FLOW_COLORS: Record<FlowId, string> = {
  f1: '#60a5fa',
  f2: '#34d399',
  f3: '#f59e0b',
};

const POLICY_LABEL: Record<SchedulerPolicy, string> = {
  fifo: 'FIFO',
  rr: 'Round-Robin',
  wfq: 'WFQ',
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const jainFairness = (values: number[]) => {
  const numerator = Math.pow(sum(values), 2);
  const denominator = values.length * sum(values.map((value) => value * value));
  if (denominator === 0) return 1;
  return numerator / denominator;
};

const computeMaxMinAllocation = (demands: Record<FlowId, number>, capacity: number) => {
  const allocation: Record<FlowId, number> = { f1: 0, f2: 0, f3: 0 };
  const active = new Set<FlowId>(FLOW_IDS);
  let remaining = capacity;

  while (active.size > 0 && remaining > 0) {
    const share = remaining / active.size;
    let fixedAny = false;

    for (const flow of Array.from(active)) {
      if (demands[flow] <= share) {
        allocation[flow] = demands[flow];
        remaining -= demands[flow];
        active.delete(flow);
        fixedAny = true;
      }
    }

    if (!fixedAny) {
      for (const flow of active) allocation[flow] = share;
      remaining = 0;
    }
  }

  return allocation;
};

const runQueueSimulation = (
  policy: SchedulerPolicy,
  flows: FlowConfig[],
  slots: number,
  linkCapacity: number,
  bufferSize: number,
  burstEnabled: boolean
): QueueSimulationSummary => {
  const points: QueueSimulationPoint[] = [];
  const droppedByFlow: Record<FlowId, number> = { f1: 0, f2: 0, f3: 0 };
  const servedByFlow: Record<FlowId, number> = { f1: 0, f2: 0, f3: 0 };
  const arrivalsCarry: Record<FlowId, number> = { f1: 0, f2: 0, f3: 0 };

  const fifoQueue: FlowId[] = [];
  const flowQueues: Record<FlowId, FlowId[]> = { f1: [], f2: [], f3: [] };
  let rrPointer = 0;
  let totalDropped = 0;
  let maxQueue = 0;
  let longestDropBurst = 0;
  let currentDropBurst = 0;

  for (let slot = 1; slot <= slots; slot++) {
    let slotArrivals = 0;
    let slotDrops = 0;
    let slotDepartures = 0;

    for (const flow of flows) {
      let offered = flow.demandRate;
      if (burstEnabled && flow.id === 'f3' && slot >= 24 && slot <= 42) {
        offered += 2.2;
      }

      arrivalsCarry[flow.id] += offered;
      const arrivals = Math.floor(arrivalsCarry[flow.id]);
      arrivalsCarry[flow.id] -= arrivals;
      slotArrivals += arrivals;

      for (let packet = 0; packet < arrivals; packet++) {
        const queueLength =
          policy === 'fifo'
            ? fifoQueue.length
            : flowQueues.f1.length + flowQueues.f2.length + flowQueues.f3.length;

        if (queueLength >= bufferSize) {
          droppedByFlow[flow.id] += 1;
          totalDropped += 1;
          slotDrops += 1;
          continue;
        }

        if (policy === 'fifo') {
          fifoQueue.push(flow.id);
        } else {
          flowQueues[flow.id].push(flow.id);
        }
      }
    }

    for (let served = 0; served < linkCapacity; served++) {
      let selectedFlow: FlowId | null = null;

      if (policy === 'fifo') {
        selectedFlow = fifoQueue.shift() ?? null;
      } else if (policy === 'rr') {
        for (let step = 0; step < FLOW_IDS.length; step++) {
          const idx = (rrPointer + step) % FLOW_IDS.length;
          const candidate = FLOW_IDS[idx];
          if (flowQueues[candidate].length > 0) {
            selectedFlow = flowQueues[candidate].shift() ?? null;
            rrPointer = (idx + 1) % FLOW_IDS.length;
            break;
          }
        }
      } else {
        const nonEmpty = FLOW_IDS.filter((flowId) => flowQueues[flowId].length > 0);
        if (nonEmpty.length > 0) {
          const selected = nonEmpty.reduce((best, current) => {
            const bestScore = servedByFlow[best] / Math.max(1, flows.find((f) => f.id === best)?.weight ?? 1);
            const currentScore = servedByFlow[current] / Math.max(1, flows.find((f) => f.id === current)?.weight ?? 1);
            return currentScore < bestScore ? current : best;
          }, nonEmpty[0]);
          selectedFlow = flowQueues[selected].shift() ?? null;
        }
      }

      if (!selectedFlow) break;
      servedByFlow[selectedFlow] += 1;
      slotDepartures += 1;
    }

    const queueLength =
      policy === 'fifo'
        ? fifoQueue.length
        : flowQueues.f1.length + flowQueues.f2.length + flowQueues.f3.length;
    maxQueue = Math.max(maxQueue, queueLength);

    if (slotDrops > 0) {
      currentDropBurst += 1;
      longestDropBurst = Math.max(longestDropBurst, currentDropBurst);
    } else {
      currentDropBurst = 0;
    }

    points.push({
      slot,
      queue: queueLength,
      drops: slotDrops,
      arrivals: slotArrivals,
      departures: slotDepartures,
    });
  }

  const throughputByFlow: Record<FlowId, number> = {
    f1: servedByFlow.f1 / slots,
    f2: servedByFlow.f2 / slots,
    f3: servedByFlow.f3 / slots,
  };

  return {
    points,
    totalDropped,
    droppedByFlow,
    servedByFlow,
    throughputByFlow,
    fairnessIndex: jainFairness([throughputByFlow.f1, throughputByFlow.f2, throughputByFlow.f3]),
    maxQueue,
    longestDropBurst,
  };
};

export const QueueManagementSimulator = () => {
  const [demandF1, setDemandF1] = useState(1.6);
  const [demandF2, setDemandF2] = useState(1.4);
  const [demandF3, setDemandF3] = useState(1.2);
  const [weightF1, setWeightF1] = useState(1);
  const [weightF2, setWeightF2] = useState(1);
  const [weightF3, setWeightF3] = useState(1);
  const [linkCapacity, setLinkCapacity] = useState(3);
  const [bufferSize, setBufferSize] = useState(22);
  const [slots, setSlots] = useState(80);
  const [policy, setPolicy] = useState<SchedulerPolicy>('rr');
  const [burstEnabled, setBurstEnabled] = useState(true);

  const flows = useMemo<FlowConfig[]>(
    () => [
      { id: 'f1', demandRate: demandF1, weight: weightF1 },
      { id: 'f2', demandRate: demandF2, weight: weightF2 },
      { id: 'f3', demandRate: demandF3, weight: weightF3 },
    ],
    [demandF1, demandF2, demandF3, weightF1, weightF2, weightF3]
  );

  const selectedSimulation = useMemo(
    () => runQueueSimulation(policy, flows, slots, linkCapacity, bufferSize, burstEnabled),
    [policy, flows, slots, linkCapacity, bufferSize, burstEnabled]
  );

  const fifoComparison = useMemo(
    () => runQueueSimulation('fifo', flows, slots, linkCapacity, bufferSize, burstEnabled),
    [flows, slots, linkCapacity, bufferSize, burstEnabled]
  );
  const wfqComparison = useMemo(
    () => runQueueSimulation('wfq', flows, slots, linkCapacity, bufferSize, burstEnabled),
    [flows, slots, linkCapacity, bufferSize, burstEnabled]
  );

  const demandMap = useMemo(
    () => ({ f1: demandF1, f2: demandF2, f3: demandF3 }),
    [demandF1, demandF2, demandF3]
  );
  const maxMinAllocation = useMemo(
    () => computeMaxMinAllocation(demandMap, linkCapacity),
    [demandMap, linkCapacity]
  );

  const resetDefaults = () => {
    setDemandF1(1.6);
    setDemandF2(1.4);
    setDemandF3(1.2);
    setWeightF1(1);
    setWeightF2(1);
    setWeightF3(1);
    setLinkCapacity(3);
    setBufferSize(22);
    setSlots(80);
    setPolicy('rr');
    setBurstEnabled(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Queue Management Simulator (09-Queue)</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Three flows (f1, f2, f3), drop-tail buffering, and scheduler comparison between FIFO, Round-Robin, and WFQ.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Controls</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Flow f1 Demand: {demandF1.toFixed(1)} pkt/slot</label>
            <Slider value={[demandF1]} onValueChange={([v]) => setDemandF1(v)} min={0.4} max={4} step={0.1} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Flow f2 Demand: {demandF2.toFixed(1)} pkt/slot</label>
            <Slider value={[demandF2]} onValueChange={([v]) => setDemandF2(v)} min={0.4} max={4} step={0.1} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Flow f3 Demand: {demandF3.toFixed(1)} pkt/slot</label>
            <Slider value={[demandF3]} onValueChange={([v]) => setDemandF3(v)} min={0.4} max={4} step={0.1} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Link Capacity: {linkCapacity} pkt/slot</label>
            <Slider value={[linkCapacity]} onValueChange={([v]) => setLinkCapacity(v)} min={1} max={6} step={1} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Buffer Size: {bufferSize} packets</label>
            <Slider value={[bufferSize]} onValueChange={([v]) => setBufferSize(v)} min={8} max={60} step={2} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Slots: {slots}</label>
            <Slider value={[slots]} onValueChange={([v]) => setSlots(v)} min={40} max={140} step={10} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">WFQ Weight f1: {weightF1}</label>
            <Slider value={[weightF1]} onValueChange={([v]) => setWeightF1(v)} min={1} max={5} step={1} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">WFQ Weight f2: {weightF2}</label>
            <Slider value={[weightF2]} onValueChange={([v]) => setWeightF2(v)} min={1} max={5} step={1} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">WFQ Weight f3: {weightF3}</label>
            <Slider value={[weightF3]} onValueChange={([v]) => setWeightF3(v)} min={1} max={5} step={1} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={policy === 'rr' ? 'default' : 'outline'} onClick={() => setPolicy('rr')}>
            Round-Robin
          </Button>
          <Button variant={policy === 'fifo' ? 'default' : 'outline'} onClick={() => setPolicy('fifo')}>
            FIFO
          </Button>
          <Button variant={policy === 'wfq' ? 'default' : 'outline'} onClick={() => setPolicy('wfq')}>
            WFQ
          </Button>
          <Button variant={burstEnabled ? 'default' : 'outline'} onClick={() => setBurstEnabled((prev) => !prev)}>
            {burstEnabled ? 'Burst On' : 'Burst Off'}
          </Button>
          <Button variant="outline" className="gap-2" onClick={resetDefaults}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <SimulationCanvas isLive={selectedSimulation.totalDropped > 0 || burstEnabled}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Policy</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{POLICY_LABEL[policy]}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Total Drops</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{selectedSimulation.totalDropped}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Max Queue</div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {selectedSimulation.maxQueue} / {bufferSize}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Fairness (Jain)</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{selectedSimulation.fairnessIndex.toFixed(3)}</div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Queue Occupancy and Drop Burst Timeline</h3>
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={selectedSimulation.points} margin={{ top: 10, right: 20, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="slot" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="queue" stroke="#6366f1" strokeWidth={2.1} dot={false} name="Queue Occupancy" />
              <Line type="monotone" dataKey="drops" stroke="#ef4444" strokeWidth={2.1} dot={false} name="Drops/Slot" />
              <Line type="monotone" dataKey="departures" stroke="#10b981" strokeWidth={2} dot={false} name="Departures/Slot" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Longest consecutive drop burst: {selectedSimulation.longestDropBurst} slots.
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Water-Filling View (Max-Min Fairness)</h3>
          <div className="space-y-3">
            {FLOW_IDS.map((flowId) => {
              const demand = demandMap[flowId];
              const fair = maxMinAllocation[flowId];
              const demandPct = Math.min(100, (demand / Math.max(0.1, linkCapacity)) * 100);
              const fairPct = Math.min(100, (fair / Math.max(0.1, linkCapacity)) * 100);
              return (
                <div key={flowId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-medium text-foreground">{flowId.toUpperCase()}</div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      demand {demand.toFixed(2)} | max-min {fair.toFixed(2)} pkt/slot
                    </div>
                  </div>
                  <div className="h-2 rounded bg-muted/40 overflow-hidden">
                    <div className="h-2 bg-zinc-500/50" style={{ width: `${demandPct}%` }} />
                  </div>
                  <div className="h-2 rounded bg-muted/40 overflow-hidden">
                    <div className="h-2" style={{ width: `${fairPct}%`, backgroundColor: FLOW_COLORS[flowId] }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Top bar = offered demand, bottom bar = water-filled max-min allocation under shared link capacity.
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">FIFO vs WFQ Comparison</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border/50 bg-background/60 p-3">
              <div className="text-sm font-medium text-foreground">FIFO</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Drops: {fifoComparison.totalDropped} | Fairness: {fifoComparison.fairnessIndex.toFixed(3)}
              </div>
              {FLOW_IDS.map((flowId) => (
                <div key={`fifo-${flowId}`} className="text-xs text-zinc-600 dark:text-zinc-400">
                  {flowId}: throughput {fifoComparison.throughputByFlow[flowId].toFixed(2)} | drops {fifoComparison.droppedByFlow[flowId]}
                </div>
              ))}
            </div>
            <div className="rounded-md border border-border/50 bg-background/60 p-3">
              <div className="text-sm font-medium text-foreground">WFQ</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Drops: {wfqComparison.totalDropped} | Fairness: {wfqComparison.fairnessIndex.toFixed(3)}
              </div>
              {FLOW_IDS.map((flowId) => (
                <div key={`wfq-${flowId}`} className="text-xs text-zinc-600 dark:text-zinc-400">
                  {flowId}: throughput {wfqComparison.throughputByFlow[flowId].toFixed(2)} | drops {wfqComparison.droppedByFlow[flowId]}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>
              Burst drops in simple drop-tail queues are harmful for TCP Fast Recovery and can trigger repeated congestion collapse
              behavior.
            </span>
          </div>
        </div>
      </SimulationCanvas>
    </div>
  );
};



