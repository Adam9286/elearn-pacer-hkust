import { useCallback, useMemo, useState } from 'react';
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
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarSecondaryButtonClass,
  toolbarToggleButtonClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

type Algorithm = 'reno' | 'tahoe';
type LossType = 'triple-dup-ack' | 'timeout';

interface LossEvent {
  rtt: number;
  type: LossType;
}

interface DataPoint {
  rtt: number;
  cwnd: number;
  ssthresh: number;
  phase: string;
  eventLabel?: string;
  eventType?: LossType;
}

interface Preset {
  id: string;
  title: string;
  description: string;
  hint: string;
  algorithm: Algorithm;
  ssthresh: number;
  totalRtts: number;
  lossEvents: LossEvent[];
}

const PHASES = {
  SLOW_START: 'Slow Start',
  CONGESTION_AVOIDANCE: 'Congestion Avoidance',
  FAST_RECOVERY: 'Fast Recovery',
} as const;

const LOSS_META: Record<
  LossType,
  {
    label: string;
    short: string;
    colorClass: string;
    mutedTextClass: string;
    lineColor: string;
    dotColor: string;
  }
> = {
  'triple-dup-ack': {
    label: 'Triple Duplicate ACK (easy loss)',
    short: '3D',
    colorClass: 'bg-amber-500/80 text-black border border-amber-400',
    mutedTextClass: 'text-amber-300',
    lineColor: '#f59e0b',
    dotColor: '#f59e0b',
  },
  timeout: {
    label: 'Timeout (severe loss)',
    short: 'TO',
    colorClass: 'bg-red-500/80 text-white border border-red-400',
    mutedTextClass: 'text-red-300',
    lineColor: '#ef4444',
    dotColor: '#ef4444',
  },
};

const PRESETS: Preset[] = [
  {
    id: 'normal',
    title: 'Normal Growth',
    description: 'No losses, clean path',
    hint: 'Watch cwnd grow exponentially first, then linearly after ssthresh.',
    algorithm: 'reno',
    ssthresh: 16,
    totalRtts: 30,
    lossEvents: [],
  },
  {
    id: 'easy-loss',
    title: 'Easy Loss (3 Dup ACK)',
    description: 'Single easy loss event',
    hint: 'Reno halves cwnd and enters Fast Recovery instead of resetting to 1.',
    algorithm: 'reno',
    ssthresh: 16,
    totalRtts: 30,
    lossEvents: [{ rtt: 12, type: 'triple-dup-ack' }],
  },
  {
    id: 'severe-loss',
    title: 'Severe Loss (Timeout)',
    description: 'Single timeout event',
    hint: 'Timeout is severe: cwnd resets to 1 and Reno returns to Slow Start.',
    algorithm: 'reno',
    ssthresh: 16,
    totalRtts: 30,
    lossEvents: [{ rtt: 14, type: 'timeout' }],
  },
  {
    id: 'checkpoint3-mixed',
    title: 'Checkpoint 3 Mix',
    description: 'Easy and severe losses in one run',
    hint: 'Compare the easy-loss path (Fast Recovery) against severe-loss path (back to cwnd=1).',
    algorithm: 'reno',
    ssthresh: 14,
    totalRtts: 35,
    lossEvents: [
      { rtt: 10, type: 'triple-dup-ack' },
      { rtt: 22, type: 'timeout' },
    ],
  },
];

const CWND_BASE_LESSON: Omit<SimulationLesson, 'steps'> = {
  intro: 'This simulator teaches how TCP Reno changes its congestion window when the path is clean, mildly lossy, or severely lossy.',
  focus: 'Watch how cwnd grows, then pay attention to how different loss signals change the sender’s behavior.',
  glossary: [
    { term: 'cwnd', definition: 'The congestion window: how much data TCP is willing to keep in flight.' },
    { term: 'ssthresh', definition: 'The threshold where TCP switches from fast growth to slower growth.' },
    { term: 'Triple Duplicate ACK', definition: 'A lighter loss signal that usually means one packet was lost but the path is still moving.' },
    { term: 'Timeout', definition: 'A severe loss signal that makes TCP become much more cautious.' },
  ],
  takeaway: 'TCP Reno does not react the same way to every loss. It treats timeout as more serious than triple duplicate ACK.',
  commonMistake: 'Students often think any loss sends cwnd back to 1. Reno does that for timeout, but not for the easier triple-duplicate-ACK case.',
  nextObservation: 'Compare the shape of the graph after an easy loss versus after a timeout.',
};

const getLossTypeAtRtt = (lossEvents: LossEvent[], rtt: number): LossType | null => {
  const event = lossEvents.find((entry) => entry.rtt === rtt);
  return event ? event.type : null;
};

const upsertLossEvent = (lossEvents: LossEvent[], rtt: number, nextType: LossType | null): LossEvent[] => {
  const withoutRtt = lossEvents.filter((entry) => entry.rtt !== rtt);
  if (!nextType) return withoutRtt;
  return [...withoutRtt, { rtt, type: nextType }].sort((a, b) => a.rtt - b.rtt);
};

function simulateCwnd(
  algorithm: Algorithm,
  initialSsthresh: number,
  totalRtts: number,
  lossEvents: LossEvent[]
): DataPoint[] {
  const data: DataPoint[] = [];
  const eventMap = new Map<number, LossType>();
  for (const lossEvent of lossEvents) {
    eventMap.set(lossEvent.rtt, lossEvent.type);
  }

  let cwnd = 1;
  let ssthresh = initialSsthresh;
  let phase: string = PHASES.SLOW_START;

  for (let rtt = 1; rtt <= totalRtts; rtt++) {
    const eventType = eventMap.get(rtt);

    if (eventType) {
      if (algorithm === 'reno' && eventType === 'triple-dup-ack') {
        ssthresh = Math.max(Math.floor(cwnd / 2), 2);
        cwnd = ssthresh;
        phase = PHASES.FAST_RECOVERY;
      } else {
        // Timeout is severe in Reno. Tahoe also resets to 1 for both loss signals.
        ssthresh = Math.max(Math.floor(cwnd / 2), 2);
        cwnd = 1;
        phase = PHASES.SLOW_START;
      }

      data.push({
        rtt,
        cwnd,
        ssthresh,
        phase,
        eventType,
        eventLabel: LOSS_META[eventType].label,
      });
      continue;
    }

    data.push({ rtt, cwnd, ssthresh, phase });

    if (phase === PHASES.FAST_RECOVERY) {
      // Simplified Reno: after recovery ACK, exit FR and continue additive increase.
      phase = PHASES.CONGESTION_AVOIDANCE;
      cwnd = Math.max(ssthresh + 1, 2);
      continue;
    }

    if (cwnd < ssthresh) {
      cwnd *= 2;
      phase = PHASES.SLOW_START;
    } else {
      cwnd += 1;
      phase = PHASES.CONGESTION_AVOIDANCE;
    }
  }

  return data;
}

export const CwndSimulator = ({ onStepChange }: SimulatorStepProps) => {
  const [algorithm, setAlgorithm] = useState<Algorithm>('reno');
  const [ssthresh, setSsthresh] = useState(16);
  const [totalRtts, setTotalRtts] = useState(30);
  const [lossEvents, setLossEvents] = useState<LossEvent[]>([]);
  const [activePreset, setActivePreset] = useState<string>('normal');
  const [activeHint, setActiveHint] = useState<string>(PRESETS[0].hint);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSecondaryControls, setShowSecondaryControls] = useState(false);

  const data = useMemo(
    () => simulateCwnd(algorithm, ssthresh, totalRtts, lossEvents),
    [algorithm, ssthresh, totalRtts, lossEvents]
  );

  const cycleLossEvent = useCallback((rtt: number) => {
    setLossEvents((prev) => {
      const currentType = getLossTypeAtRtt(prev, rtt);
      let nextType: LossType | null = null;
      if (!currentType) nextType = 'triple-dup-ack';
      else if (currentType === 'triple-dup-ack') nextType = 'timeout';
      return upsertLossEvent(prev, rtt, nextType);
    });
    setActivePreset('');
    setActiveHint('');
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setAlgorithm(preset.algorithm);
    setSsthresh(preset.ssthresh);
    setTotalRtts(preset.totalRtts);
    setLossEvents(preset.lossEvents);
    setActivePreset(preset.id);
    setActiveHint(preset.hint);
  }, []);

  const reset = useCallback(() => {
    applyPreset(PRESETS[0]);
    setShowAdvanced(false);
    setShowSecondaryControls(false);
  }, [applyPreset]);

  const maxCwnd = Math.max(...data.map((point) => point.cwnd), ssthresh + 4);
  const hasTripleDupLoss = lossEvents.some((event) => event.type === 'triple-dup-ack');
  const hasTimeoutLoss = lossEvents.some((event) => event.type === 'timeout');
  const coachStep = hasTimeoutLoss ? 3 : hasTripleDupLoss ? 2 : 1;
  const coachLesson: SimulationLesson = {
    ...CWND_BASE_LESSON,
    focus: activeHint || CWND_BASE_LESSON.focus,
    steps: [
      {
        title: 'Start Conservatively',
        explanation: 'TCP begins with a small congestion window because it does not yet know how much the network can safely carry.',
        whatToNotice: 'The graph starts low on purpose. TCP probes for capacity instead of assuming the path can handle a burst.',
        whyItMatters: 'Starting cautiously helps TCP avoid overwhelming the network at the beginning.',
      },
      {
        title: 'Grow While The Path Looks Safe',
        explanation: 'During Slow Start, cwnd grows quickly. After ssthresh, it grows more slowly in Congestion Avoidance.',
        whatToNotice: 'The line first rises steeply, then becomes more gentle after the threshold.',
        whyItMatters: 'TCP wants to use available bandwidth, but it also wants to avoid creating too much congestion.',
      },
      {
        title: 'Respond To An Easy Loss',
        explanation: hasTripleDupLoss
          ? 'A triple duplicate ACK tells Reno that some packets are still getting through, so Reno cuts cwnd but does not panic completely.'
          : 'If you add an easy loss, Reno will halve its sending rate and enter fast recovery instead of restarting from 1.',
        whatToNotice: 'This loss response is smaller than a timeout response because the ACK stream still proves the path is partly working.',
        whyItMatters: 'Not all loss signals mean the same thing, so TCP should not react equally to all of them.',
      },
      {
        title: 'Respond To A Severe Loss',
        explanation: hasTimeoutLoss
          ? 'A timeout means TCP waited and heard nothing useful back, so it resets cwnd to 1 and starts probing again.'
          : 'If you add a timeout, Reno becomes much more cautious and returns to a tiny window.',
        whatToNotice: 'Timeout causes the sharpest drop because TCP no longer trusts the current sending rate.',
        whyItMatters: CWND_BASE_LESSON.takeaway,
      },
    ],
  };

  return (
    <div className="space-y-4">

      <SimulatorToolbar label="Scenario Controls">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`min-w-[190px] max-w-[240px] shrink-0 border-l-2 px-3 py-2 text-left transition-colors ${
                activePreset === preset.id
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

      <div className={toolbarControlGroupClass}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSecondaryControls((prev) => !prev)}
          className={`gap-2 ${toolbarSecondaryButtonClass}`}
        >
          {showSecondaryControls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showSecondaryControls ? 'Hide Secondary Controls' : 'Show Secondary Controls'}
        </Button>
      </div>
        </div>
      </SimulatorToolbar>

      {showSecondaryControls && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Algorithm</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={algorithm === 'reno' ? 'default' : 'outline'}
                onClick={() => {
                  setAlgorithm('reno');
                  setActivePreset('');
                  setActiveHint('');
                }}
                className={`flex-1 max-w-[160px] ${toolbarToggleButtonClass(algorithm === 'reno')}`}
              >
                TCP Reno
              </Button>
              <Button
                size="sm"
                variant={algorithm === 'tahoe' ? 'default' : 'outline'}
                onClick={() => {
                  setAlgorithm('tahoe');
                  setActivePreset('');
                  setActiveHint('');
                }}
                className={`flex-1 max-w-[160px] ${toolbarToggleButtonClass(algorithm === 'tahoe')}`}
              >
                TCP Tahoe
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50">
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
                      Initial ssthresh: <span className="font-bold text-primary">{ssthresh} MSS</span>
                    </label>
                    <Slider
                      value={[ssthresh]}
                      onValueChange={([value]) => {
                        setSsthresh(value);
                        setActivePreset('');
                        setActiveHint('');
                      }}
                      min={4}
                      max={32}
                      step={2}
                      className="py-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Duration: <span className="font-bold text-primary">{totalRtts} RTTs</span>
                    </label>
                    <Slider
                      value={[totalRtts]}
                      onValueChange={([value]) => {
                        setTotalRtts(value);
                        setActivePreset('');
                        setActiveHint('');
                      }}
                      min={15}
                      max={50}
                      step={5}
                      className="py-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Loss Events (None -&gt; Triple Dup ACK -&gt; Timeout)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: totalRtts }, (_, index) => index + 1).map((rtt) => {
                      const lossType = getLossTypeAtRtt(lossEvents, rtt);
                      return (
                        <button
                          key={rtt}
                          onClick={() => cycleLossEvent(rtt)}
                          className={`flex h-9 w-9 flex-col items-center justify-center rounded text-[10px] font-semibold transition-colors ${
                            lossType
                              ? LOSS_META[lossType].colorClass
                              : 'border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-muted'
                          }`}
                        >
                          <span className="leading-none">{rtt}</span>
                          <span className="leading-none">{lossType ? LOSS_META[lossType].short : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {lossEvents.length === 0
                      ? 'No losses configured.'
                      : lossEvents
                          .map((lossEvent) => `RTT ${lossEvent.rtt}: ${LOSS_META[lossEvent.type].label}`)
                          .join(' | ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      )}

      <SimulationCanvas
        isLive={lossEvents.length > 0}
        coachPanel={(
          <SimulationCoachPanel
            lesson={coachLesson}
            currentStep={coachStep}
            isComplete={lossEvents.length > 0}
          />
        )}
      >
        {activeHint && <p className="mb-3 text-sm italic text-zinc-600 dark:text-zinc-400">{activeHint}</p>}

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4">
          <ResponsiveContainer width="100%" height={410}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="rtt"
                label={{
                  value: 'Round Trip Time (RTT)',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fill: 'hsl(var(--muted-foreground))' },
                }}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis
                domain={[0, maxCwnd]}
                label={{
                  value: 'cwnd (MSS)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 5,
                  style: { fill: 'hsl(var(--muted-foreground))' },
                }}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'cwnd') return [`${value} MSS`, 'cwnd'];
                  if (name === 'ssthresh') return [`${value} MSS`, 'ssthresh'];
                  return [value, name];
                }}
                labelFormatter={(rttValue) => {
                  const rtt = Number(rttValue);
                  const point = data.find((entry) => entry.rtt === rtt);
                  const base = `RTT ${rtt}`;
                  if (point?.eventLabel) return `${base} - ${point.eventLabel}`;
                  if (point?.phase) return `${base} (${point.phase})`;
                  return base;
                }}
              />
              <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />

              <Line
                type="stepAfter"
                dataKey="ssthresh"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={false}
                name="ssthresh"
              />

              <Line
                type="monotone"
                dataKey="cwnd"
                stroke="#22d3ee"
                strokeWidth={2.5}
                dot={(props: { cx?: number; cy?: number; payload?: DataPoint }) => {
                  const { cx = 0, cy = 0, payload } = props;
                  const eventType = payload?.eventType as LossType | undefined;
                  if (!eventType) {
                    return <circle key={`dot-${payload?.rtt ?? 'cwnd'}`} cx={cx} cy={cy} r={3} fill="#22d3ee" stroke="none" />;
                  }

                  return (
                    <svg key={`dot-${payload?.rtt ?? 'event'}`}>
                      <circle cx={cx} cy={cy} r={6} fill={LOSS_META[eventType].dotColor} stroke="#fff" strokeWidth={2} />
                      <text
                        x={cx}
                        y={cy - 12}
                        textAnchor="middle"
                        fill={LOSS_META[eventType].dotColor}
                        fontSize={9}
                        fontWeight="bold"
                      >
                        {LOSS_META[eventType].short}
                      </text>
                    </svg>
                  );
                }}
                activeDot={{ r: 5, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2 }}
                name="cwnd"
              />

              {lossEvents.map((lossEvent) => (
                <ReferenceLine
                  key={`${lossEvent.type}-${lossEvent.rtt}`}
                  x={lossEvent.rtt}
                  stroke={LOSS_META[lossEvent.type].lineColor}
                  strokeDasharray="4 2"
                  strokeOpacity={0.7}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Reading the Graph</h3>
          <ul className="space-y-1.5 text-sm leading-relaxed text-zinc-900 dark:text-zinc-200">
            <li>
              <strong className="text-cyan-300">Cyan line (cwnd):</strong> send window size over time.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-200">Slate dashed line (ssthresh):</strong> switch point between Slow Start and
              Congestion Avoidance.
            </li>
            <li>
              <strong className={LOSS_META['triple-dup-ack'].mutedTextClass}>3D marker:</strong> easy loss. Reno halves cwnd and
              enters Fast Recovery.
            </li>
            <li>
              <strong className={LOSS_META.timeout.mutedTextClass}>TO marker:</strong> severe loss. Reno resets cwnd to 1 and
              returns to Slow Start.
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-cyan-400" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">cwnd</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 bg-zinc-400" style={{ borderTop: '2px dashed #94a3b8' }} />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">ssthresh</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Triple Dup ACK event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Timeout event</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-3">
          <h3 className="font-semibold text-foreground">{algorithm === 'reno' ? 'TCP Reno' : 'TCP Tahoe'} State Logic</h3>
          <div className="space-y-2.5 text-sm leading-relaxed text-zinc-900 dark:text-zinc-200">
            <p>
              <strong className="text-foreground">Slow Start:</strong> cwnd doubles each RTT while cwnd &lt; ssthresh.
            </p>
            <p>
              <strong className="text-foreground">Congestion Avoidance:</strong> cwnd increases by 1 MSS per RTT.
            </p>
            {algorithm === 'reno' ? (
              <>
                <p>
                  <strong className="text-foreground">Triple Duplicate ACK:</strong> treat as easy loss. Set ssthresh = cwnd/2,
                  set cwnd to ssthresh, and enter Fast Recovery.
                </p>
                <p>
                  <strong className="text-foreground">Timeout:</strong> treat as severe loss. Set ssthresh = cwnd/2, reset cwnd
                  to 1, and restart Slow Start.
                </p>
                <p className="italic text-foreground/80">
                  This is the transition pattern expected for Project Checkpoint 3.
                </p>
              </>
            ) : (
              <p>
                Tahoe resets cwnd to 1 on loss and re-enters Slow Start, which is more conservative than Reno.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong className="text-foreground">Try this:</strong> Load "Checkpoint 3 Mix", then switch between Reno and Tahoe to
            compare easy-loss and severe-loss recovery behavior.
          </p>
        </div>
      </SimulationCanvas>
    </div>
  );
};



