import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Pause, Play, RotateCcw, StepForward, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarGhostButtonClass,
  toolbarPrimaryButtonClass,
  toolbarSecondaryButtonClass,
  toolbarToggleButtonClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

type StationId = 'BS-A' | 'BS-B' | 'BS-C';

interface StationConfig {
  id: StationId;
  center: number;
  phase: number;
  loadPenalty: number;
}

interface ScanPoint {
  timeMs: number;
  position: number;
  bsA: number;
  bsB: number;
  bsC: number;
  associated: StationId | 'None';
}

const SCAN_INTERVAL_MS = 5;
const ASSOCIATION_THRESHOLD = 35;
const HANDOVER_MARGIN = 8;

const STATIONS: StationConfig[] = [
  { id: 'BS-A', center: 18, phase: 0.0, loadPenalty: 3 },
  { id: 'BS-B', center: 50, phase: 1.2, loadPenalty: 7 },
  { id: 'BS-C', center: 82, phase: 2.0, loadPenalty: 5 },
];

const WIRELESS_ASSOCIATION_BASE_LESSON: Omit<SimulationLesson, 'steps'> = {
  intro: 'This simulator teaches how a mobile device scans nearby base stations and decides whether to stay put or hand over to a better one.',
  focus: 'Watch the scan results over time instead of looking at one signal sample by itself.',
  glossary: [
    { term: 'Association', definition: 'The station the mobile device is currently connected to.' },
    { term: 'Handover', definition: 'Switching from one serving base station to another.' },
    { term: 'Threshold', definition: 'The minimum signal quality needed before a station is considered usable.' },
    { term: 'Margin', definition: 'The amount by which a better station should beat the current one before switching.' },
  ],
  takeaway: 'Good wireless association is a balance between staying stable and moving when a clearly better station appears.',
  commonMistake: 'A mobile device should not jump to every tiny signal improvement. That would create unstable handovers.',
  nextObservation: 'Turn on auto drift and watch how the best station changes as the device moves across the coverage area.',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const measureSignal = (station: StationConfig, position: number, timeMs: number) => {
  const distancePenalty = Math.abs(position - station.center) * 1.5;
  const fading = 7 * Math.sin(timeMs / 25 + station.phase);
  return clamp(100 - distancePenalty + fading - station.loadPenalty, 0, 100);
};

const computeSnapshot = (position: number, timeMs: number) => {
  const readings: Record<StationId, number> = {
    'BS-A': measureSignal(STATIONS[0], position, timeMs),
    'BS-B': measureSignal(STATIONS[1], position, timeMs),
    'BS-C': measureSignal(STATIONS[2], position, timeMs),
  };

  const best = (Object.entries(readings) as Array<[StationId, number]>).reduce((bestEntry, current) =>
    current[1] > bestEntry[1] ? current : bestEntry
  );

  return { readings, bestId: best[0], bestScore: best[1] };
};

export const WirelessAssociationSimulator = ({ onStepChange }: SimulatorStepProps) => {
  const [position, setPosition] = useState(20);
  const [timeMs, setTimeMs] = useState(0);
  const [associated, setAssociated] = useState<StationId | null>(null);
  const [history, setHistory] = useState<ScanPoint[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [autoDrift, setAutoDrift] = useState(true);
  const [driftDirection, setDriftDirection] = useState(1);

  const stepScan = useCallback(() => {
    const nextTime = timeMs + SCAN_INTERVAL_MS;
    let nextPosition = position;

    if (autoDrift) {
      const proposed = position + driftDirection * 2.0;
      if (proposed >= 95 || proposed <= 5) {
        setDriftDirection((prev) => -prev);
      }
      nextPosition = clamp(proposed, 0, 100);
      setPosition(nextPosition);
    }

    const snapshot = computeSnapshot(nextPosition, nextTime);
    const currentScore = associated ? snapshot.readings[associated] : -1;
    let nextAssociated: StationId | null = associated;
    let decision = '';

    if (!associated) {
      if (snapshot.bestScore >= ASSOCIATION_THRESHOLD) {
        nextAssociated = snapshot.bestId;
        decision = `t=${nextTime}ms scan: associate to ${snapshot.bestId} (score ${snapshot.bestScore.toFixed(1)}).`;
      } else {
        decision = `t=${nextTime}ms scan: no station above threshold (${ASSOCIATION_THRESHOLD}).`;
      }
    } else {
      const shouldHandover =
        (currentScore < ASSOCIATION_THRESHOLD && snapshot.bestScore >= ASSOCIATION_THRESHOLD) ||
        (snapshot.bestId !== associated && snapshot.bestScore >= currentScore + HANDOVER_MARGIN);
      if (shouldHandover) {
        decision = `t=${nextTime}ms scan: handover ${associated} -> ${snapshot.bestId} (best ${snapshot.bestScore.toFixed(1)}).`;
        nextAssociated = snapshot.bestId;
      } else {
        decision = `t=${nextTime}ms scan: stay on ${associated} (score ${currentScore.toFixed(1)}).`;
      }
    }

    setAssociated(nextAssociated);
    setTimeMs(nextTime);
    setEvents((prev) => [decision, ...prev].slice(0, 12));
    setHistory((prev) =>
      [
        ...prev,
        {
          timeMs: nextTime,
          position: nextPosition,
          bsA: snapshot.readings['BS-A'],
          bsB: snapshot.readings['BS-B'],
          bsC: snapshot.readings['BS-C'],
          associated: nextAssociated ?? 'None',
        },
      ].slice(-80)
    );
  }, [associated, autoDrift, driftDirection, position, timeMs]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(stepScan, 350);
    return () => clearInterval(id);
  }, [isRunning, stepScan]);

  const resetSimulation = () => {
    setTimeMs(0);
    setPosition(20);
    setAssociated(null);
    setHistory([]);
    setEvents([]);
    setIsRunning(false);
    setDriftDirection(1);
  };

  const currentReadings = useMemo(() => computeSnapshot(position, timeMs), [position, timeMs]);
  const latest = history[history.length - 1];
  const latestDecision = events[0] ?? '';
  const coachStep = associated === null
    ? 0
    : latestDecision.includes('handover')
      ? 2
      : 1;
  const coachLesson: SimulationLesson = {
    ...WIRELESS_ASSOCIATION_BASE_LESSON,
    steps: [
      {
        title: 'Scan the Air',
        explanation: 'The device listens for synchronization signals from nearby base stations before choosing one.',
        whatToNotice: `Current best station is ${currentReadings.bestId} with score ${currentReadings.bestScore.toFixed(1)}.`,
        whyItMatters: 'A device cannot associate well if it does not first measure the available stations.',
      },
      {
        title: 'Associate and Stay Stable',
        explanation: associated
          ? `The device is currently associated with ${associated} and will stay there unless a clearly better option appears or the signal drops too low.`
          : 'Once one station is strong enough, the device can associate and start using it.',
        whatToNotice: latestDecision || 'Stability matters, so the device does not switch for every tiny change.',
        whyItMatters: 'Stable association avoids unnecessary handovers that would interrupt service.',
      },
      {
        title: 'Handover When It Is Worth It',
        explanation: latestDecision.includes('handover')
          ? latestDecision
          : 'If the current station becomes weak or another station becomes clearly better, the device should hand over.',
        whatToNotice: 'The margin rule helps prevent nervous back-and-forth switching between stations.',
        whyItMatters: WIRELESS_ASSOCIATION_BASE_LESSON.takeaway,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Wireless Association and Sync Simulator</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Mobile scans synchronization signals every {SCAN_INTERVAL_MS}ms and selects a base station to associate.
        </p>
      </div>

      <SimulatorToolbar
        label="Simulation Controls"
        status={
          <>
            <span>{timeMs} ms</span>
            <span>{history.length} scans</span>
          </>
        }
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className={toolbarControlGroupClass}>
          <Button onClick={() => setIsRunning((prev) => !prev)} className={`gap-2 ${toolbarPrimaryButtonClass}`}>
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isRunning ? 'Pause' : 'Play'}
          </Button>
          <Button variant="outline" className={`gap-2 ${toolbarSecondaryButtonClass}`} onClick={stepScan}>
            <StepForward className="h-4 w-4" />
            Step +5ms
          </Button>
          <Button variant="ghost" className={`gap-2 ${toolbarGhostButtonClass}`} onClick={resetSimulation}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button variant={autoDrift ? 'default' : 'outline'} onClick={() => setAutoDrift((prev) => !prev)} className={toolbarToggleButtonClass(autoDrift)}>
            {autoDrift ? 'Auto Drift On' : 'Auto Drift Off'}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Mobile Position: {position.toFixed(1)}</label>
          <Slider value={[position]} onValueChange={([v]) => setPosition(v)} min={0} max={100} step={1} />
        </div>
        </div>
      </SimulatorToolbar>

      <SimulationCanvas
        isLive={isRunning || history.length > 0}
        coachPanel={(
          <SimulationCoachPanel
            lesson={coachLesson}
            currentStep={coachStep}
            isComplete={Boolean(associated)}
          />
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Current Time</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{timeMs} ms</div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Associated Station</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{associated ?? 'None'}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Best Current Score</div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {currentReadings.bestId} ({currentReadings.bestScore.toFixed(1)})
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Scans Performed</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{history.length}</div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Sync Signal Quality Over Time</h3>
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={history} margin={{ top: 10, right: 20, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="timeMs" stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="bsA" stroke="#60a5fa" strokeWidth={2.1} dot={false} name="BS-A" />
              <Line type="monotone" dataKey="bsB" stroke="#34d399" strokeWidth={2.1} dot={false} name="BS-B" />
              <Line type="monotone" dataKey="bsC" stroke="#f59e0b" strokeWidth={2.1} dot={false} name="BS-C" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Latest Scan Snapshot</h3>
          <div className="grid gap-2 md:grid-cols-3 text-xs">
            <div className="rounded bg-muted/40 px-2 py-1">
              <div className="text-zinc-600 dark:text-zinc-400">BS-A score</div>
              <div className="text-foreground">{currentReadings.readings['BS-A'].toFixed(1)}</div>
            </div>
            <div className="rounded bg-muted/40 px-2 py-1">
              <div className="text-zinc-600 dark:text-zinc-400">BS-B score</div>
              <div className="text-foreground">{currentReadings.readings['BS-B'].toFixed(1)}</div>
            </div>
            <div className="rounded bg-muted/40 px-2 py-1">
              <div className="text-zinc-600 dark:text-zinc-400">BS-C score</div>
              <div className="text-foreground">{currentReadings.readings['BS-C'].toFixed(1)}</div>
            </div>
          </div>
          {latest && (
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Last recorded association at t={latest.timeMs}ms: {latest.associated}.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Scan and Association Events</h3>
          {events.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">No scans yet. Click Step +5ms or Play.</div>
          ) : (
            events.map((event) => (
              <div key={event} className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {event}
              </div>
            ))
          )}
        </div>

        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/90">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-emerald-300" />
            <span>Association logic is evaluated exactly at 5ms scan intervals to match roadmap timing assumptions.</span>
          </div>
        </div>
      </SimulationCanvas>
    </div>
  );
};



