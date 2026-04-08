import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp } from 'lucide-react';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarGhostButtonClass,
  toolbarPrimaryButtonClass,
  toolbarSecondaryButtonClass,
  toolbarSelectClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';

type PacketStatus = 'unsent' | 'sent' | 'acked' | 'lost' | 'retransmit';
type ContentTab = 'simulation' | 'theory';

interface Packet {
  seq: number;
  status: PacketStatus;
  sentAt?: number;
  ackedAt?: number;
  retransmitAt?: number;
  wasRetransmitted?: boolean;
}

interface Preset {
  id: string;
  name: string;
  windowSize: number;
  losses: number[];
  hint: string;
}

const STATUS_COLORS: Record<PacketStatus, string> = {
  unsent: 'bg-zinc-100 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700/50 text-zinc-600 dark:text-zinc-400',
  sent: 'bg-blue-500/20 ring-1 ring-blue-400/60 text-blue-300',
  acked: 'bg-emerald-500/20 ring-1 ring-emerald-400/60 text-emerald-300',
  lost: 'bg-red-500/20 ring-1 ring-red-400/60 text-red-300',
  retransmit: 'bg-amber-500/20 ring-1 ring-amber-400/60 text-amber-300',
};

const STATUS_LABELS: Record<PacketStatus, string> = {
  unsent: 'Unsent',
  sent: 'In Flight',
  acked: 'ACKed',
  lost: 'Lost',
  retransmit: 'Retransmit',
};

const TOTAL_PACKETS = 12;

const PRESETS: Preset[] = [
  {
    id: 'perfect',
    name: 'Perfect Delivery',
    windowSize: 4,
    losses: [],
    hint: 'Watch how the window slides forward as each packet gets acknowledged.',
  },
  {
    id: 'single-loss',
    name: 'Single Lost Packet',
    windowSize: 4,
    losses: [5],
    hint: 'Packet 5 gets lost -- notice how the window can\'t advance past it (head-of-line blocking) until retransmission succeeds.',
  },
  {
    id: 'multiple-losses',
    name: 'Multiple Losses',
    windowSize: 6,
    losses: [4, 9],
    hint: 'With a larger window, more packets are in flight -- but losses still block progress.',
  },
  {
    id: 'tiny-window',
    name: 'Tiny Window',
    windowSize: 1,
    losses: [],
    hint: 'With window=1, only one packet at a time -- safe but very slow. This is why larger windows improve throughput.',
  },
];

export const SlidingWindowSimulator = ({ onStepChange }: SimulatorStepProps) => {
  const [windowSize, setWindowSize] = useState(4);
  const [lossSeqs, setLossSeqs] = useState<Set<number>>(new Set());
  const [packets, setPackets] = useState<Packet[]>(() =>
    Array.from({ length: TOTAL_PACKETS }, (_, i) => ({ seq: i + 1, status: 'unsent' as PacketStatus }))
  );
  const [sendBase, setSendBase] = useState(1);
  const [nextSeq, setNextSeq] = useState(1);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [log, setLog] = useState<string[]>(['Ready. Choose a scenario or click Play to begin.']);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeHint, setActiveHint] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('simulation');
  const [narration, setNarration] = useState<string>('Choose a scenario above, then press Play or Step to begin.');

  useEffect(() => {
    if (onStepChange) {
      const phase = step === 0 ? 0 : step <= 3 ? 1 : step <= 6 ? 2 : 3;
      onStepChange(phase);
    }
  }, [step, onStepChange]);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-19), `[Step ${step}] ${msg}`]);
  }, [step]);

  const advanceStep = useCallback(() => {
    setStep(prev => prev + 1);

    setPackets(prev => {
      const updated = [...prev];
      const narrationParts: string[] = [];

      // Phase 1: Send packets within window
      let currentNextSeq = nextSeq;
      const sentPackets: number[] = [];
      while (currentNextSeq <= TOTAL_PACKETS && currentNextSeq < sendBase + windowSize) {
        const idx = currentNextSeq - 1;
        if (updated[idx].status === 'unsent') {
          if (lossSeqs.has(currentNextSeq)) {
            updated[idx] = { ...updated[idx], status: 'lost', sentAt: step };
            setLog(prev => [...prev.slice(-19), `[Step ${step + 1}] Packet ${currentNextSeq} LOST in transit!`]);
            narrationParts.push(`Packet ${currentNextSeq} was lost in transit!`);
          } else {
            updated[idx] = { ...updated[idx], status: 'sent', sentAt: step };
            setLog(prev => [...prev.slice(-19), `[Step ${step + 1}] Sent packet ${currentNextSeq}`]);
            sentPackets.push(currentNextSeq);
          }
        } else if (updated[idx].status === 'retransmit') {
          if (updated[idx].retransmitAt !== undefined && step - updated[idx].retransmitAt! >= 1) {
            updated[idx] = { ...updated[idx], status: 'sent', sentAt: step, retransmitAt: undefined, wasRetransmitted: true };
            setLog(prev => [...prev.slice(-19), `[Step ${step + 1}] Retransmitting packet ${currentNextSeq}`]);
            narrationParts.push(`Retransmitting packet ${currentNextSeq} - it's back on the wire!`);
          }
        }
        currentNextSeq++;
      }
      if (sentPackets.length > 0) {
        if (sentPackets.length === 1) {
          narrationParts.unshift(`Sending packet ${sentPackets[0]}...`);
        } else {
          narrationParts.unshift(`Sending packets ${sentPackets[0]}-${sentPackets[sentPackets.length - 1]} to fill the window...`);
        }
      }
      setNextSeq(currentNextSeq);

      // Phase 2: ACK received packets (after 1 step delay)
      let newSendBase = sendBase;
      const ackedPackets: number[] = [];
      const retransmitAckedPackets: number[] = [];
      for (let i = newSendBase - 1; i < newSendBase - 1 + windowSize && i < TOTAL_PACKETS; i++) {
        if (updated[i].status === 'sent' && updated[i].sentAt !== undefined && updated[i].sentAt! < step) {
          const wasRetransmitted = updated[i].wasRetransmitted;
          updated[i] = { ...updated[i], status: 'acked', ackedAt: step, wasRetransmitted: false };
          setLog(prev => [...prev.slice(-19), `[Step ${step + 1}] ACK received for packet ${i + 1}`]);
          if (wasRetransmitted) {
            retransmitAckedPackets.push(i + 1);
          } else {
            ackedPackets.push(i + 1);
          }
        }
      }
      if (retransmitAckedPackets.length > 0) {
        for (const seq of retransmitAckedPackets) {
          narrationParts.push(`Retransmitted packet ${seq} acknowledged - window can advance now!`);
        }
      }
      if (ackedPackets.length > 0) {
        if (ackedPackets.length === 1) {
          narrationParts.push(`ACK received for packet ${ackedPackets[0]} -- window slides forward!`);
        } else {
          narrationParts.push(`ACKs received for packets ${ackedPackets.join(', ')} -- window slides forward!`);
        }
      }

      // Phase 3: Advance send base past all acked packets
      while (newSendBase <= TOTAL_PACKETS && updated[newSendBase - 1].status === 'acked') {
        newSendBase++;
      }

      // Phase 4: Detect and retransmit lost packets (after timeout)
      for (let i = sendBase - 1; i < sendBase - 1 + windowSize && i < TOTAL_PACKETS; i++) {
        if (updated[i].status === 'lost' && updated[i].sentAt !== undefined && step - updated[i].sentAt! >= 2) {
          updated[i] = { ...updated[i], status: 'retransmit', retransmitAt: step };
          setLog(prev => [...prev.slice(-19), `[Step ${step + 1}] Timeout! Retransmitting packet ${i + 1}`]);
          narrationParts.push(`Timeout! Retransmitting packet ${i + 1}...`);
          setLossSeqs(prev => {
            const newSet = new Set(prev);
            newSet.delete(i + 1);
            return newSet;
          });
        }
      }

      // Check for waiting state
      if (narrationParts.length === 0) {
        const hasInFlight = updated.some(p => p.status === 'sent');
        const hasLost = updated.some(p => p.status === 'lost');
        if (hasLost) {
          narrationParts.push('Waiting for timeout on lost packet...');
        } else if (hasInFlight) {
          narrationParts.push('Waiting for acknowledgments to come back...');
        }
      }

      // Check completion
      if (newSendBase > TOTAL_PACKETS) {
        narrationParts.push('All packets delivered successfully!');
      }

      setNarration(narrationParts.join(' '));
      setSendBase(newSendBase);
      return updated;
    });
  }, [nextSeq, sendBase, windowSize, lossSeqs, step]);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(advanceStep, 800);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, advanceStep]);

  // Auto-stop when done
  useEffect(() => {
    if (sendBase > TOTAL_PACKETS) {
      setIsPlaying(false);
      setLog(prev => [...prev, 'All packets delivered successfully!']);
      setNarration('All packets delivered successfully!');
    }
  }, [sendBase]);

  const reset = useCallback((presetWindowSize?: number, presetLosses?: number[]) => {
    setIsPlaying(false);
    setPackets(Array.from({ length: TOTAL_PACKETS }, (_, i) => ({ seq: i + 1, status: 'unsent' as PacketStatus })));
    setSendBase(1);
    setNextSeq(1);
    setStep(0);
    setWindowSize(presetWindowSize ?? windowSize);
    setLossSeqs(new Set(presetLosses ?? []));
    setLog(['Ready. Click Play or Step to begin.']);
    setNarration('Press Play or Step to begin the simulation.');
  }, [windowSize]);

  const selectPreset = useCallback((preset: Preset) => {
    setActivePreset(preset.id);
    setActiveHint(preset.hint);
    reset(preset.windowSize, preset.losses);
    setNarration(`Scenario: ${preset.name}. Press Play or Step to begin.`);
  }, [reset]);

  const handleReset = useCallback(() => {
    setActivePreset(null);
    setActiveHint('');
    reset(4, []);
    setNarration('Choose a scenario above, then press Play or Step to begin.');
  }, [reset]);

  const toggleLoss = useCallback((seq: number) => {
    if (step > 0) return;
    setLossSeqs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seq)) newSet.delete(seq);
      else newSet.add(seq);
      return newSet;
    });
  }, [step]);

  const windowEnd = Math.min(sendBase + windowSize - 1, TOTAL_PACKETS);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Sliding Window Protocol</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Visualize how TCP's sliding window sends, acknowledges, and retransmits packets.
        </p>
      </div>

      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-fit mb-2">
        <button
          type="button"
          onClick={() => setActiveTab('simulation')}
          className={`transition-colors ${
            activeTab === 'simulation'
              ? 'bg-zinc-200 dark:bg-zinc-700/60 text-white shadow-sm rounded-md px-4 py-1.5'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 px-4 py-1.5'
          }`}
        >
          Simulation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('theory')}
          className={`transition-colors ${
            activeTab === 'theory'
              ? 'bg-zinc-200 dark:bg-zinc-700/60 text-white shadow-sm rounded-md px-4 py-1.5'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 px-4 py-1.5'
          }`}
        >
          Theory
        </button>
      </div>

      {activeTab === 'simulation' ? (
        <div className="space-y-3">
          <SimulatorToolbar
            label="Simulation Controls"
            status={
              <Badge variant="outline" className="border-white/10 bg-transparent text-xs text-gray-300">
                Step: {step}
              </Badge>
            }
          >
            <div className={toolbarControlGroupClass}>
                <label htmlFor="sliding-window-scenario" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Scenario
                </label>
                <select
                  id="sliding-window-scenario"
                  value={activePreset ?? 'custom'}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    if (nextId === 'custom') {
                      handleReset();
                      return;
                    }
                    const preset = PRESETS.find((item) => item.id === nextId);
                    if (preset) selectPreset(preset);
                  }}
                  className={`${toolbarSelectClass} min-w-[190px]`}
                >
                  <option value="custom">Custom / No Preset</option>
                  {PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

            <div className={toolbarControlGroupClass}>
                <Button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`gap-2 ${toolbarPrimaryButtonClass}`}
                  disabled={sendBase > TOTAL_PACKETS}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  onClick={advanceStep}
                  variant="outline"
                  className={`gap-2 ${toolbarSecondaryButtonClass}`}
                  disabled={isPlaying || sendBase > TOTAL_PACKETS}
                >
                  <StepForward className="w-4 h-4" />
                  Step
                </Button>
                <Button variant="ghost" onClick={handleReset} className={`gap-2 ${toolbarGhostButtonClass}`}>
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
            </div>
          </SimulatorToolbar>

          <div className="space-y-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-1 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
            >
              <span>Advanced Controls</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="space-y-4 px-1 pb-3 pt-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Window Size: <span className="text-primary font-bold">{windowSize} packets</span>
                  </label>
                  <Slider
                    value={[windowSize]}
                    onValueChange={([v]) => { if (step === 0) { setWindowSize(v); setActivePreset(null); setActiveHint(''); } }}
                    min={1}
                    max={8}
                    step={1}
                    disabled={step > 0}
                    className="py-2"
                  />
                </div>
                {step === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Click packets below to toggle loss events before starting. Currently: {lossSeqs.size === 0 ? 'No losses' : Array.from(lossSeqs).sort((a, b) => a - b).map(s => `#${s}`).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <SimulationCanvas isLive={isPlaying}>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Packets</span>
                <Badge variant="outline" className="text-xs">
                  Window: {sendBase}-{windowEnd}
                </Badge>
              </div>

              <div className="space-y-1 px-1 py-2">
                {activeHint && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-foreground">What to watch for:</span> {activeHint}
                  </p>
                )}
                <p className="text-sm italic text-zinc-900 dark:text-zinc-200">{narration}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {packets.map(pkt => {
                  const inWindow = pkt.seq >= sendBase && pkt.seq <= windowEnd;
                  return (
                    <button
                      key={pkt.seq}
                      onClick={() => toggleLoss(pkt.seq)}
                      disabled={step > 0 || !showAdvanced}
                      className={`
                        w-14 h-14 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all
                        ${STATUS_COLORS[pkt.status]}
                        ${inWindow ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background' : ''}
                        ${step === 0 && lossSeqs.has(pkt.seq) && pkt.status === 'unsent' ? 'ring-2 ring-red-500 bg-red-500/10' : ''}
                        ${step === 0 && showAdvanced ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                      `}
                    >
                      <span className="font-bold text-sm">{pkt.seq}</span>
                      <span className="text-[10px] opacity-80">
                        {step === 0 && lossSeqs.has(pkt.seq) ? 'LOSS' : STATUS_LABELS[pkt.status]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded ${color}`} />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">{STATUS_LABELS[status as PacketStatus]}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-primary/10 ring-2 ring-primary/30" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">In Window</span>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl bg-gray-950 p-4 font-mono shadow-inner shadow-black/30">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Event Log</h3>
                {log.map((entry, i) => (
                  <p key={i} className={`text-xs font-mono ${
                    entry.includes('LOST') ? 'text-red-400' :
                    entry.includes('ACK') ? 'text-emerald-400' :
                    entry.includes('Retransmit') ? 'text-amber-400' :
                    entry.includes('successfully') ? 'text-primary font-bold' :
                    'text-gray-400'
                  }`}>
                    {entry}
                  </p>
                ))}
              </div>
            </div>
          </SimulationCanvas>
        </div>
      ) : (
        <div className="space-y-4 py-2">
          <h3 className="font-semibold text-foreground">Reading Guide</h3>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sender can keep up to <strong className="text-foreground">windowSize</strong> packets in flight; ACKs slide the
            window forward, while losses trigger retransmission.
          </p>

          <div className="space-y-2">
            <h4 className="text-foreground font-medium text-sm">Key Concepts</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <li><strong className="text-foreground">Window Size</strong> - The sender can only have {windowSize} packets in flight at once. Bigger window means higher throughput but more recovery cost during loss.</li>
              <li><strong className="text-foreground">Head-of-Line Blocking</strong> - The window cannot slide past an unacknowledged packet. Even if packets 2, 3, 4 are ACKed, loss of packet 1 blocks progress.</li>
              <li><strong className="text-foreground">Timeout</strong> - After two steps with no ACK, the sender assumes loss and retransmits.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-foreground font-medium text-sm">Why This Matters</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>This mechanism is how TCP guarantees reliable delivery over unreliable networks.</li>
              <li>Window sizing is a core tradeoff: small windows are safe but slower, larger windows increase utilization but can amplify retransmission work.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};




