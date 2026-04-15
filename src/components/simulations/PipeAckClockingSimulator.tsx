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
import { AlertTriangle, ChevronDown, ChevronUp, Gauge, Network, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarToggleButtonClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

type ConstraintMode = 'bdp' | 'advertised-window';

interface BurstWindow {
  startTick: number;
  endTick: number;
  multiplier: number;
}

interface ScenarioPreset {
  id: string;
  title: string;
  description: string;
  hint: string;
  bandwidthPacketsPerTick: number;
  propagationDelayTicks: number;
  bufferCapacityPackets: number;
  advertisedWindowPackets: number;
  durationTicks: number;
  constraintMode: ConstraintMode;
  burstWindows: BurstWindow[];
}

interface SimulationConfig {
  bandwidthPacketsPerTick: number;
  propagationDelayTicks: number;
  bufferCapacityPackets: number;
  advertisedWindowPackets: number;
  durationTicks: number;
  constraintMode: ConstraintMode;
  burstWindows: BurstWindow[];
}

interface SimulationPoint {
  tick: number;
  offeredRate: number;
  sendRate: number;
  ackRate: number;
  pipeOccupancy: number;
  queueOccupancy: number;
  inFlight: number;
  queueDelayTicks: number;
  effectiveWindow: number;
  blockedByWindow: number;
  blockedByBuffer: number;
  burstMultiplier: number;
  ackClocking: boolean;
}

const PRESETS: ScenarioPreset[] = [
  {
    id: 'balanced-clocking',
    title: 'Balanced ACK Clocking',
    description: 'Window constrained by BDP, no bursts',
    hint: 'After startup, send rate and ACK rate overlap while the pipe stays full and queue stays low.',
    bandwidthPacketsPerTick: 4,
    propagationDelayTicks: 6,
    bufferCapacityPackets: 16,
    advertisedWindowPackets: 40,
    durationTicks: 50,
    constraintMode: 'bdp',
    burstWindows: [],
  },
  {
    id: 'flow-limited',
    title: 'Flow-Control Limited',
    description: 'Receiver advertised window is smaller than BDP',
    hint: 'Even if the network can hold more, sender is capped by receiver window W.',
    bandwidthPacketsPerTick: 4,
    propagationDelayTicks: 6,
    bufferCapacityPackets: 16,
    advertisedWindowPackets: 14,
    durationTicks: 50,
    constraintMode: 'advertised-window',
    burstWindows: [],
  },
  {
    id: 'transient-overload',
    title: 'Transient Overload',
    description: 'Short burst overshoots BDP and is absorbed by buffer',
    hint: 'Using a larger advertised window than BDP allows temporary overshoot. Queue rises, absorbs burst, then drains.',
    bandwidthPacketsPerTick: 4,
    propagationDelayTicks: 6,
    bufferCapacityPackets: 24,
    advertisedWindowPackets: 48,
    durationTicks: 60,
    constraintMode: 'advertised-window',
    burstWindows: [{ startTick: 18, endTick: 27, multiplier: 2.2 }],
  },
];

const DEFAULT_PRESET = PRESETS[0];

const PIPE_CLOCKING_BASE_LESSON: Omit<SimulationLesson, 'steps'> = {
  intro: 'This simulator teaches how a sender fills the bandwidth-delay product, how ACKs pace future sends, and how excess data turns into a queue.',
  focus: 'Use the selected tick to ask: is the sender filling the pipe, staying stable, or creating extra queue?',
  glossary: [
    { term: 'BDP', definition: 'Bandwidth-delay product: how much data the path can hold in flight.' },
    { term: 'ACK Clocking', definition: 'A steady pattern where arriving ACKs naturally pace future sends.' },
    { term: 'Queue', definition: 'Extra packets waiting because the bottleneck cannot send them yet.' },
    { term: 'Advertised Window', definition: 'A receiver-side limit on how much unacknowledged data the sender may have in flight.' },
  ],
  takeaway: 'Good transport behavior fills the path without building an unnecessary queue.',
  commonMistake: 'More in-flight data is not always better. Once the pipe is full, extra data usually becomes queue instead of useful throughput.',
  nextObservation: 'Move the selected tick and compare startup, steady ACK clocking, and overload periods.',
};

const getBurstMultiplier = (tick: number, burstWindows: BurstWindow[]) => {
  const activeBurst = burstWindows.find((window) => tick >= window.startTick && tick <= window.endTick);
  return activeBurst ? activeBurst.multiplier : 1;
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const simulatePipeModel = (config: SimulationConfig): SimulationPoint[] => {
  const points: SimulationPoint[] = [];
  const delayTicks = Math.max(1, Math.floor(config.propagationDelayTicks));
  const bandwidth = Math.max(0.5, config.bandwidthPacketsPerTick);
  const bufferCapacity = Math.max(0, config.bufferCapacityPackets);
  const effectiveAdvertisedWindow = Math.max(1, config.advertisedWindowPackets);
  const bdpPackets = bandwidth * delayTicks;

  let queuePackets = 0;
  let inFlightUnacked = 0;
  const pipeStages = Array.from({ length: delayTicks }, () => 0);

  for (let tick = 1; tick <= config.durationTicks; tick++) {
    const deliveredToReceiver = pipeStages[delayTicks - 1];
    for (let index = delayTicks - 1; index > 0; index--) {
      pipeStages[index] = pipeStages[index - 1];
    }
    pipeStages[0] = 0;

    const ackRate = deliveredToReceiver;
    inFlightUnacked = Math.max(0, inFlightUnacked - ackRate);

    const movedIntoPipe = Math.min(queuePackets, bandwidth);
    queuePackets -= movedIntoPipe;
    pipeStages[0] += movedIntoPipe;

    const burstMultiplier = getBurstMultiplier(tick, config.burstWindows);
    const offeredRate = bandwidth * burstMultiplier;
    const effectiveWindow = config.constraintMode === 'bdp' ? bdpPackets : effectiveAdvertisedWindow;
    const windowBudget = Math.max(0, effectiveWindow - inFlightUnacked);
    const acceptedByWindow = Math.min(offeredRate, windowBudget);

    const queueSpace = Math.max(0, bufferCapacity - queuePackets);
    const sendRate = Math.min(acceptedByWindow, queueSpace);
    const blockedByWindow = Math.max(0, offeredRate - acceptedByWindow);
    const blockedByBuffer = Math.max(0, acceptedByWindow - sendRate);

    queuePackets += sendRate;
    inFlightUnacked += sendRate;

    const pipeOccupancy = sum(pipeStages);
    const queueOccupancy = queuePackets;
    const queueDelayTicks = queueOccupancy / bandwidth;
    const ackClocking =
      pipeOccupancy >= bdpPackets * 0.95 &&
      queueOccupancy <= Math.max(1, bufferCapacity * 0.1) &&
      Math.abs(sendRate - ackRate) <= Math.max(0.2, bandwidth * 0.08);

    points.push({
      tick,
      offeredRate,
      sendRate,
      ackRate,
      pipeOccupancy,
      queueOccupancy,
      inFlight: inFlightUnacked,
      queueDelayTicks,
      effectiveWindow,
      blockedByWindow,
      blockedByBuffer,
      burstMultiplier,
      ackClocking,
    });
  }

  return points;
};

export const PipeAckClockingSimulator = ({ onStepChange }: SimulatorStepProps) => {
  const [bandwidthPacketsPerTick, setBandwidthPacketsPerTick] = useState(DEFAULT_PRESET.bandwidthPacketsPerTick);
  const [propagationDelayTicks, setPropagationDelayTicks] = useState(DEFAULT_PRESET.propagationDelayTicks);
  const [bufferCapacityPackets, setBufferCapacityPackets] = useState(DEFAULT_PRESET.bufferCapacityPackets);
  const [advertisedWindowPackets, setAdvertisedWindowPackets] = useState(DEFAULT_PRESET.advertisedWindowPackets);
  const [durationTicks, setDurationTicks] = useState(DEFAULT_PRESET.durationTicks);
  const [constraintMode, setConstraintMode] = useState<ConstraintMode>(DEFAULT_PRESET.constraintMode);
  const [burstWindows, setBurstWindows] = useState<BurstWindow[]>(DEFAULT_PRESET.burstWindows);
  const [activePresetId, setActivePresetId] = useState(DEFAULT_PRESET.id);
  const [activeHint, setActiveHint] = useState(DEFAULT_PRESET.hint);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTick, setSelectedTick] = useState(DEFAULT_PRESET.durationTicks);

  const bdpPackets = useMemo(
    () => bandwidthPacketsPerTick * propagationDelayTicks,
    [bandwidthPacketsPerTick, propagationDelayTicks]
  );

  const simulationData = useMemo(
    () =>
      simulatePipeModel({
        bandwidthPacketsPerTick,
        propagationDelayTicks,
        bufferCapacityPackets,
        advertisedWindowPackets,
        durationTicks,
        constraintMode,
        burstWindows,
      }),
    [
      bandwidthPacketsPerTick,
      propagationDelayTicks,
      bufferCapacityPackets,
      advertisedWindowPackets,
      durationTicks,
      constraintMode,
      burstWindows,
    ]
  );

  useEffect(() => {
    setSelectedTick((prev) => Math.min(Math.max(1, prev), durationTicks));
  }, [durationTicks]);

  const selectedPoint = simulationData[Math.max(0, selectedTick - 1)] ?? simulationData[simulationData.length - 1];
  const ackClockingTicks = simulationData.filter((point) => point.ackClocking).length;
  const maxQueuePackets = Math.max(0, ...simulationData.map((point) => point.queueOccupancy));
  const maxQueueDelay = Math.max(0, ...simulationData.map((point) => point.queueDelayTicks));
  const maxInFlight = Math.max(0, ...simulationData.map((point) => point.inFlight));
  const totalWindowBlocks = simulationData.reduce((acc, point) => acc + point.blockedByWindow, 0);
  const totalBufferBlocks = simulationData.reduce((acc, point) => acc + point.blockedByBuffer, 0);
  const coachStep = selectedPoint.queueOccupancy > 0
    ? 2
    : selectedPoint.ackClocking
      ? 1
      : selectedPoint.inFlight < bdpPackets * 0.75
        ? 0
        : selectedPoint.blockedByWindow > 0
          ? 3
          : 1;
  const coachLesson: SimulationLesson = {
    ...PIPE_CLOCKING_BASE_LESSON,
    focus: activeHint || PIPE_CLOCKING_BASE_LESSON.focus,
    steps: [
      {
        title: 'Fill the Pipe',
        explanation: 'At the beginning, the sender is still pushing enough packets into the path to reach the bandwidth-delay product.',
        whatToNotice: `Tick ${selectedTick}: in-flight data is ${selectedPoint.inFlight.toFixed(1)} packets while the BDP is ${bdpPackets.toFixed(1)} packets.`,
        whyItMatters: 'A path cannot deliver at full rate until enough data is already in transit.',
      },
      {
        title: 'ACK-Clocked Steady State',
        explanation: 'When the pipe is full and the queue stays small, ACK arrivals naturally pace new sends at about the bottleneck rate.',
        whatToNotice: `Selected tick send rate ${selectedPoint.sendRate.toFixed(1)} and ACK rate ${selectedPoint.ackRate.toFixed(1)} are ${selectedPoint.ackClocking ? 'closely aligned' : 'not yet aligned'}.`,
        whyItMatters: 'This is the healthy transport pattern: high utilization without unnecessary queue growth.',
      },
      {
        title: 'Queue Build-Up',
        explanation: selectedPoint.queueOccupancy > 0
          ? `Extra offered data has created a queue of ${selectedPoint.queueOccupancy.toFixed(1)} packets.`
          : 'If the sender overshoots the path, packets leave the useful pipe and start waiting in the queue.',
        whatToNotice: `Queue delay at this tick is about ${selectedPoint.queueDelayTicks.toFixed(2)} ticks.`,
        whyItMatters: 'Queueing adds delay and can become harmful if it grows too large.',
      },
      {
        title: 'Flow Control or Buffer Limit',
        explanation: selectedPoint.blockedByWindow > 0
          ? 'The advertised window is the main limiter right now, so the sender is being held back by flow control.'
          : selectedPoint.blockedByBuffer > 0
            ? 'The queue is full enough that the buffer is now the limiter.'
            : 'At some points, the sender is limited not by the pipe, but by receiver window or buffer space.',
        whatToNotice: `Blocked by window: ${selectedPoint.blockedByWindow.toFixed(1)} | blocked by buffer: ${selectedPoint.blockedByBuffer.toFixed(1)}.`,
        whyItMatters: PIPE_CLOCKING_BASE_LESSON.takeaway,
      },
    ],
  };

  const applyPreset = useCallback((preset: ScenarioPreset) => {
    setBandwidthPacketsPerTick(preset.bandwidthPacketsPerTick);
    setPropagationDelayTicks(preset.propagationDelayTicks);
    setBufferCapacityPackets(preset.bufferCapacityPackets);
    setAdvertisedWindowPackets(preset.advertisedWindowPackets);
    setDurationTicks(preset.durationTicks);
    setConstraintMode(preset.constraintMode);
    setBurstWindows(preset.burstWindows);
    setActivePresetId(preset.id);
    setActiveHint(preset.hint);
    setSelectedTick(preset.durationTicks);
  }, []);

  const resetToDefaults = useCallback(() => {
    applyPreset(DEFAULT_PRESET);
    setShowAdvanced(false);
  }, [applyPreset]);

  return (
    <div className="space-y-4">

      <SimulatorToolbar label="Scenario Controls">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`shrink-0 border-l-2 px-3 py-2 text-left transition-colors min-w-[210px] max-w-[260px] ${
                activePresetId === preset.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card/70 hover:border-primary/30 hover:bg-muted/50'
              }`}
            >
              <div className="text-sm font-semibold text-foreground">
                {preset.title}
              </div>
              <div className="mt-1 text-sm leading-snug text-muted-foreground">{preset.description}</div>
            </button>
          ))}
        </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Window Constraint Mode</label>
        <div className={toolbarControlGroupClass}>
          <Button
            size="sm"
            variant={constraintMode === 'bdp' ? 'default' : 'outline'}
            onClick={() => {
              setConstraintMode('bdp');
              setActivePresetId('');
              setActiveHint('');
            }}
            className={toolbarToggleButtonClass(constraintMode === 'bdp')}
          >
            BDP (Congestion Control)
          </Button>
          <Button
            size="sm"
            variant={constraintMode === 'advertised-window' ? 'default' : 'outline'}
            onClick={() => {
              setConstraintMode('advertised-window');
              setActivePresetId('');
              setActiveHint('');
            }}
            className={toolbarToggleButtonClass(constraintMode === 'advertised-window')}
          >
            Advertised Window W (Flow Control)
          </Button>
        </div>
      </div>
        </div>
      </SimulatorToolbar>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Pipe Volume (BDP)</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{bdpPackets.toFixed(1)} pkts</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Target in-flight for efficient link use</div>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">ACK-Clocking Ticks</div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {ackClockingTicks} / {durationTicks}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Ticks where send rate approximately ACK rate</div>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Max Queue Occupancy</div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {maxQueuePackets.toFixed(1)} / {bufferCapacityPackets} pkts
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Queue absorbs overload but raises latency</div>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Max Queue Delay</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{maxQueueDelay.toFixed(2)} ticks</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Extra delay caused by buffer filling</div>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
        >
          <span>Advanced Controls</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="space-y-5 border-t border-border/30 px-4 pb-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Bottleneck Bandwidth: <span className="font-bold text-primary">{bandwidthPacketsPerTick} pkt/tick</span>
                </label>
                <Slider
                  value={[bandwidthPacketsPerTick]}
                  onValueChange={([value]) => {
                    setBandwidthPacketsPerTick(value);
                    setActivePresetId('');
                    setActiveHint('');
                  }}
                  min={1}
                  max={8}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Propagation Delay: <span className="font-bold text-primary">{propagationDelayTicks} ticks</span>
                </label>
                <Slider
                  value={[propagationDelayTicks]}
                  onValueChange={([value]) => {
                    setPropagationDelayTicks(value);
                    setActivePresetId('');
                    setActiveHint('');
                  }}
                  min={2}
                  max={14}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Router Buffer: <span className="font-bold text-primary">{bufferCapacityPackets} packets</span>
                </label>
                <Slider
                  value={[bufferCapacityPackets]}
                  onValueChange={([value]) => {
                    setBufferCapacityPackets(value);
                    setActivePresetId('');
                    setActiveHint('');
                  }}
                  min={4}
                  max={48}
                  step={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Advertised Window W: <span className="font-bold text-primary">{advertisedWindowPackets} packets</span>
                </label>
                <Slider
                  value={[advertisedWindowPackets]}
                  onValueChange={([value]) => {
                    setAdvertisedWindowPackets(value);
                    setActivePresetId('');
                    setActiveHint('');
                  }}
                  min={4}
                  max={64}
                  step={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Duration: <span className="font-bold text-primary">{durationTicks} ticks</span>
              </label>
              <Slider
                value={[durationTicks]}
                onValueChange={([value]) => {
                  setDurationTicks(value);
                  setSelectedTick(value);
                  setActivePresetId('');
                  setActiveHint('');
                }}
                min={30}
                max={90}
                step={5}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={resetToDefaults} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      <SimulationCanvas
        isLive={ackClockingTicks > 0}
        coachPanel={(
          <SimulationCoachPanel
            lesson={coachLesson}
            currentStep={coachStep}
            isComplete={ackClockingTicks > 0}
          />
        )}
      >
        {activeHint && <p className="mb-3 text-sm italic text-zinc-600 dark:text-zinc-400">{activeHint}</p>}

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Pipe vs Queue Occupancy</h3>
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={simulationData} margin={{ top: 10, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="tick" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <ReferenceLine y={bdpPackets} stroke="#6366f1" strokeDasharray="5 3" ifOverflow="extendDomain" />
              <ReferenceLine y={bufferCapacityPackets} stroke="#f59e0b" strokeDasharray="5 3" ifOverflow="extendDomain" />
              <Line type="monotone" dataKey="pipeOccupancy" stroke="#6366f1" strokeWidth={2.2} dot={false} name="Pipe" />
              <Line type="monotone" dataKey="queueOccupancy" stroke="#f59e0b" strokeWidth={2.2} dot={false} name="Buffer Queue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">ACK Clocking: Send Rate vs ACK Rate</h3>
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={simulationData} margin={{ top: 10, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="tick" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="offeredRate" stroke="#94a3b8" strokeWidth={1.8} dot={false} name="Offered Rate" />
              <Line type="monotone" dataKey="sendRate" stroke="#10b981" strokeWidth={2.2} dot={false} name="Send Rate" />
              <Line type="monotone" dataKey="ackRate" stroke="#38bdf8" strokeWidth={2.2} dot={false} name="ACK Rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-foreground">Tick Inspector</h3>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Tick {selectedTick}</div>
          </div>
          <Slider
            value={[selectedTick]}
            onValueChange={([value]) => setSelectedTick(value)}
            min={1}
            max={durationTicks}
            step={1}
          />

          {selectedPoint && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Send / ACK Rate</div>
                <div className="mt-1 text-sm text-foreground">
                  {selectedPoint.sendRate.toFixed(2)} / {selectedPoint.ackRate.toFixed(2)} pkt/tick
                </div>
              </div>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Pipe / Queue</div>
                <div className="mt-1 text-sm text-foreground">
                  {selectedPoint.pipeOccupancy.toFixed(1)} / {selectedPoint.queueOccupancy.toFixed(1)} packets
                </div>
              </div>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Current Window Limit</div>
                <div className="mt-1 text-sm text-foreground">{selectedPoint.effectiveWindow.toFixed(1)} packets</div>
              </div>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Queue Delay</div>
                <div className="mt-1 text-sm text-foreground">{selectedPoint.queueDelayTicks.toFixed(2)} ticks</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Flow Control vs Congestion Control</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            In <span className="text-foreground font-medium">Advertised Window mode</span>, sender is limited by receiver capacity
            W. In <span className="text-foreground font-medium">BDP mode</span>, sender is limited by network pipe volume.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Buffer fills are not "free throughput": they absorb bursts, but raise queue delay and can stall later sending.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Transient overload is absorbed by queue capacity first; immediate packet drops are not modeled in this simulator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-indigo-400" />
            BDP target: {bdpPackets.toFixed(1)} packets
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-400" />
            Peak in-flight: {maxInFlight.toFixed(1)} packets
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Blocked by window/buffer: {totalWindowBlocks.toFixed(1)} / {totalBufferBlocks.toFixed(1)} packets
          </div>
        </div>
      </SimulationCanvas>
    </div>
  );
};



