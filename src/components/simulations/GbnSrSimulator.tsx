import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, StepForward, RotateCcw, Lightbulb } from 'lucide-react';
import { SimulationCanvas } from './SimulationCanvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PacketStatus = 'unsent' | 'sent' | 'acked' | 'lost' | 'retransmit' | 'buffered';

interface Packet {
  seq: number;
  status: PacketStatus;
  sentAt?: number;
  ackedAt?: number;
  retransmitAt?: number;
}

interface ProtocolState {
  packets: Packet[];
  sendBase: number;
  nextSeq: number;
  totalTransmissions: number;
  wastedTransmissions: number;
  receiverBuffer: Set<number>; // SR only â€” buffered out-of-order packets
  receiverExpected: number;    // next expected in-order seq
}

interface Preset {
  id: string;
  name: string;
  windowSize: number;
  losses: number[];
  hint: string;
}

type ViewMode = 'side-by-side' | 'gbn-only' | 'sr-only';
type ContentTab = 'simulation' | 'theory';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_PACKETS = 10;

const STATUS_COLORS: Record<PacketStatus, string> = {
  unsent: 'bg-zinc-200 dark:bg-zinc-700/60 border-zinc-500/60 text-zinc-900 dark:text-zinc-200',
  sent: 'bg-blue-500/30 border-blue-400/60 text-blue-200',
  acked: 'bg-emerald-500/30 border-emerald-400/60 text-emerald-200',
  lost: 'bg-red-500/30 border-red-400/60 text-red-200',
  retransmit: 'bg-amber-500/30 border-amber-400/60 text-amber-200',
  buffered: 'bg-purple-500/30 border-purple-400/60 text-purple-200',
};

const STATUS_LABELS: Record<PacketStatus, string> = {
  unsent: 'Unsent',
  sent: 'In Flight',
  acked: 'ACKed',
  lost: 'Lost',
  retransmit: 'Retransmit',
  buffered: 'Buffered',
};

const PRESETS: Preset[] = [
  {
    id: 'no-loss',
    name: 'No Loss (Baseline)',
    windowSize: 4,
    losses: [],
    hint: 'Both protocols behave identically when nothing goes wrong. Notice the window sliding forward smoothly.',
  },
  {
    id: 'single-loss',
    name: 'Single Packet Loss',
    windowSize: 4,
    losses: [3],
    hint: 'GBN resends packets 3,4,5,6 (everything from the loss point). SR only resends packet 3. Count the total transmissions!',
  },
  {
    id: 'multiple-losses',
    name: 'Multiple Losses',
    windowSize: 4,
    losses: [2, 5],
    hint: 'With multiple losses, GBN\'s inefficiency compounds. SR handles each loss independently.',
  },
  {
    id: 'large-window',
    name: 'Large Window',
    windowSize: 6,
    losses: [3],
    hint: 'Bigger window = more wasted retransmissions for GBN. SR\'s advantage grows with window size.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInitialState(): ProtocolState {
  return {
    packets: Array.from({ length: TOTAL_PACKETS }, (_, i) => ({ seq: i + 1, status: 'unsent' as PacketStatus })),
    sendBase: 1,
    nextSeq: 1,
    totalTransmissions: 0,
    wastedTransmissions: 0,
    receiverBuffer: new Set<number>(),
    receiverExpected: 1,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GbnSrSimulator = () => {
  const [windowSize, setWindowSize] = useState(4);
  const [lossSet, setLossSet] = useState<Set<number>>(new Set());
  const [gbn, setGbn] = useState<ProtocolState>(makeInitialState);
  const [sr, setSr] = useState<ProtocolState>(makeInitialState);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [narration, setNarration] = useState('Choose a scenario above, then press Play or Step to begin.');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeHint, setActiveHint] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [activeTab, setActiveTab] = useState<ContentTab>('simulation');
  const [showSecondaryControls, setShowSecondaryControls] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track which seqs have already been "lost" so retransmissions go through
  const [gbnLostAlready, setGbnLostAlready] = useState<Set<number>>(new Set());
  const [srLostAlready, setSrLostAlready] = useState<Set<number>>(new Set());

  const isComplete = gbn.sendBase > TOTAL_PACKETS && sr.sendBase > TOTAL_PACKETS;

  // -------------------------------------------------------------------------
  // GBN step logic
  // -------------------------------------------------------------------------
  const advanceGbn = useCallback((prev: ProtocolState, currentStep: number, losses: Set<number>, lostAlready: Set<number>): { next: ProtocolState; narr: string[]; newLostAlready: Set<number> } => {
    const s = {
      ...prev,
      packets: prev.packets.map(p => ({ ...p })),
      receiverBuffer: new Set(prev.receiverBuffer),
    };
    const narr: string[] = [];
    const newLostAlready = new Set(lostAlready);

    // Phase 1: ACK packets sent in previous steps (1-step RTT)
    let newSendBase = s.sendBase;
    for (let i = s.sendBase - 1; i < Math.min(s.sendBase + windowSize - 1, TOTAL_PACKETS); i++) {
      const p = s.packets[i];
      if (p.status === 'sent' && p.sentAt !== undefined && p.sentAt < currentStep) {
        s.packets[i] = { ...p, status: 'acked', ackedAt: currentStep };
        narr.push(`GBN: ACK received for packet ${p.seq} (cumulative up to ${p.seq}).`);
      }
    }
    // Advance send base
    while (newSendBase <= TOTAL_PACKETS && s.packets[newSendBase - 1].status === 'acked') {
      newSendBase++;
    }
    s.sendBase = newSendBase;

    // Phase 2: Detect timeout on lost packets => go back to lost point
    let goBackTriggered = false;
    for (let i = s.sendBase - 1; i < Math.min(s.sendBase + windowSize - 1, TOTAL_PACKETS); i++) {
      const p = s.packets[i];
      if (p.status === 'lost' && p.sentAt !== undefined && currentStep - p.sentAt >= 2) {
        narr.push(`GBN: Timeout on packet ${p.seq}! Resending everything from packet ${p.seq} onward.`);
        // Mark the lost packet and all subsequent sent/lost packets in window as retransmit
        for (let j = i; j < Math.min(s.sendBase + windowSize - 1, TOTAL_PACKETS); j++) {
          if (s.packets[j].status === 'lost' || s.packets[j].status === 'sent') {
            const wasPreviouslySent = s.packets[j].status === 'sent';
            // Retransmission â€” this time it goes through
            s.packets[j] = { ...s.packets[j], status: 'retransmit', retransmitAt: currentStep };
            s.totalTransmissions++;
            if (wasPreviouslySent) {
              s.wastedTransmissions++;
            }
            newLostAlready.add(s.packets[j].seq);
          }
        }
        // Reset nextSeq to resend from lost point
        s.nextSeq = Math.min(s.sendBase + windowSize, TOTAL_PACKETS + 1);
        goBackTriggered = true;
        break;
      }
    }

    // Phase 3: Convert retransmit packets (from previous step) to sent
    if (!goBackTriggered) {
      for (let i = 0; i < TOTAL_PACKETS; i++) {
        const p = s.packets[i];
        if (p.status === 'retransmit' && p.retransmitAt !== undefined && p.retransmitAt < currentStep) {
          s.packets[i] = { ...p, status: 'sent', sentAt: currentStep };
        }
      }
    }

    // Phase 4: Send new packets in window
    if (!goBackTriggered) {
      let currentNextSeq = s.nextSeq;
      while (currentNextSeq <= TOTAL_PACKETS && currentNextSeq < s.sendBase + windowSize) {
        const idx = currentNextSeq - 1;
        if (s.packets[idx].status === 'unsent') {
          const isLost = losses.has(currentNextSeq) && !newLostAlready.has(currentNextSeq);
          if (isLost) {
            s.packets[idx] = { ...s.packets[idx], status: 'lost', sentAt: currentStep };
            narr.push(`GBN: Packet ${currentNextSeq} sent but LOST in transit!`);
            newLostAlready.add(currentNextSeq);
          } else {
            s.packets[idx] = { ...s.packets[idx], status: 'sent', sentAt: currentStep };
            narr.push(`GBN: Sent packet ${currentNextSeq}.`);
          }
          s.totalTransmissions++;
        }
        currentNextSeq++;
      }
      s.nextSeq = currentNextSeq;
    }

    if (s.sendBase > TOTAL_PACKETS) {
      narr.push('GBN: All packets delivered!');
    }

    return { next: s, narr, newLostAlready };
  }, [windowSize]);

  // -------------------------------------------------------------------------
  // SR step logic
  // -------------------------------------------------------------------------
  const advanceSr = useCallback((prev: ProtocolState, currentStep: number, losses: Set<number>, lostAlready: Set<number>): { next: ProtocolState; narr: string[]; newLostAlready: Set<number> } => {
    const s = {
      ...prev,
      packets: prev.packets.map(p => ({ ...p })),
      receiverBuffer: new Set(prev.receiverBuffer),
    };
    const narr: string[] = [];
    const newLostAlready = new Set(lostAlready);

    // Phase 1: ACK individually â€” packets sent previous step arrive
    for (let i = 0; i < TOTAL_PACKETS; i++) {
      const p = s.packets[i];
      if (p.status === 'sent' && p.sentAt !== undefined && p.sentAt < currentStep) {
        if (p.seq === s.receiverExpected) {
          // In-order: ACK and advance
          s.packets[i] = { ...p, status: 'acked', ackedAt: currentStep };
          s.receiverExpected++;
          narr.push(`SR: Packet ${p.seq} received in order, ACKed individually.`);
          // Deliver any buffered packets that are now in order
          while (s.receiverBuffer.has(s.receiverExpected)) {
            const bIdx = s.receiverExpected - 1;
            s.packets[bIdx] = { ...s.packets[bIdx], status: 'acked', ackedAt: currentStep };
            s.receiverBuffer.delete(s.receiverExpected);
            narr.push(`SR: Buffered packet ${s.receiverExpected} now in order, delivered!`);
            s.receiverExpected++;
          }
        } else if (p.seq > s.receiverExpected) {
          // Out of order: buffer it
          s.packets[i] = { ...p, status: 'buffered' };
          s.receiverBuffer.add(p.seq);
          narr.push(`SR: Packet ${p.seq} received out of order, buffered. ACKed individually.`);
        } else {
          // Already received â€” just ACK
          s.packets[i] = { ...p, status: 'acked', ackedAt: currentStep };
        }
      }
    }

    // Advance send base past all acked
    let newSendBase = s.sendBase;
    while (newSendBase <= TOTAL_PACKETS && s.packets[newSendBase - 1].status === 'acked') {
      newSendBase++;
    }
    s.sendBase = newSendBase;

    // Phase 2: Detect timeout on lost packets â€” retransmit only the lost one
    for (let i = s.sendBase - 1; i < Math.min(s.sendBase + windowSize - 1, TOTAL_PACKETS); i++) {
      const p = s.packets[i];
      if (p.status === 'lost' && p.sentAt !== undefined && currentStep - p.sentAt >= 2) {
        s.packets[i] = { ...p, status: 'retransmit', retransmitAt: currentStep };
        s.totalTransmissions++;
        newLostAlready.add(p.seq);
        narr.push(`SR: Timeout on packet ${p.seq}! Resending only packet ${p.seq}.`);
      }
    }

    // Phase 3: Convert retransmit packets from previous step to sent
    for (let i = 0; i < TOTAL_PACKETS; i++) {
      const p = s.packets[i];
      if (p.status === 'retransmit' && p.retransmitAt !== undefined && p.retransmitAt < currentStep) {
        s.packets[i] = { ...p, status: 'sent', sentAt: currentStep };
      }
    }

    // Phase 4: Send new packets in window
    let currentNextSeq = s.nextSeq;
    while (currentNextSeq <= TOTAL_PACKETS && currentNextSeq < s.sendBase + windowSize) {
      const idx = currentNextSeq - 1;
      if (s.packets[idx].status === 'unsent') {
        const isLost = losses.has(currentNextSeq) && !newLostAlready.has(currentNextSeq);
        if (isLost) {
          s.packets[idx] = { ...s.packets[idx], status: 'lost', sentAt: currentStep };
          narr.push(`SR: Packet ${currentNextSeq} sent but LOST in transit!`);
          newLostAlready.add(currentNextSeq);
        } else {
          s.packets[idx] = { ...s.packets[idx], status: 'sent', sentAt: currentStep };
          narr.push(`SR: Sent packet ${currentNextSeq}.`);
        }
        s.totalTransmissions++;
      }
      currentNextSeq++;
    }
    s.nextSeq = currentNextSeq;

    if (s.sendBase > TOTAL_PACKETS) {
      narr.push('SR: All packets delivered!');
    }

    return { next: s, narr, newLostAlready };
  }, [windowSize]);

  // -------------------------------------------------------------------------
  // Advance one step (both protocols)
  // -------------------------------------------------------------------------
  const advanceStep = useCallback(() => {
    const currentStep = step + 1;
    setStep(currentStep);

    const gbnResult = advanceGbn(gbn, currentStep, lossSet, gbnLostAlready);
    setGbn(gbnResult.next);
    setGbnLostAlready(gbnResult.newLostAlready);

    const srResult = advanceSr(sr, currentStep, lossSet, srLostAlready);
    setSr(srResult.next);
    setSrLostAlready(srResult.newLostAlready);

    const allNarr = [...gbnResult.narr, ...srResult.narr];
    if (allNarr.length > 0) {
      setNarration(allNarr.join(' '));
    } else {
      setNarration('Waiting for events...');
    }
  }, [step, gbn, sr, lossSet, gbnLostAlready, srLostAlready, advanceGbn, advanceSr]);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(advanceStep, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, advanceStep]);

  // Auto-stop
  useEffect(() => {
    if (isComplete) {
      setIsPlaying(false);
    }
  }, [isComplete]);

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  const reset = useCallback((presetWindowSize?: number, presetLosses?: number[]) => {
    setIsPlaying(false);
    setGbn(makeInitialState());
    setSr(makeInitialState());
    setStep(0);
    setWindowSize(presetWindowSize ?? windowSize);
    setLossSet(new Set(presetLosses ?? []));
    setGbnLostAlready(new Set());
    setSrLostAlready(new Set());
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
    setShowSecondaryControls(false);
    reset(4, []);
    setNarration('Choose a scenario above, then press Play or Step to begin.');
  }, [reset]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const renderPacketRow = (state: ProtocolState, label: string) => {
    const windowEnd = Math.min(state.sendBase + windowSize - 1, TOTAL_PACKETS);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <Badge variant="outline" className="text-[10px]">
            Window: {state.sendBase}--{windowEnd}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Base: {state.sendBase}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {state.packets.map(pkt => {
            const inWindow = pkt.seq >= state.sendBase && pkt.seq <= windowEnd;
            return (
              <div
                key={pkt.seq}
                className={`
                  w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-medium transition-all
                  ${STATUS_COLORS[pkt.status]}
                  ${inWindow ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background' : ''}
                `}
              >
                <span className="font-bold text-sm">{pkt.seq}</span>
                <span className="text-[9px] opacity-80">{STATUS_LABELS[pkt.status]}</span>
              </div>
            );
          })}
        </div>
        {/* SR receiver buffer */}
        {label.startsWith('SR') && state.receiverBuffer.size > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-purple-400 font-medium">Receiver buffer:</span>
            {Array.from(state.receiverBuffer).sort((a, b) => a - b).map(seq => (
              <span key={seq} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-400 text-purple-300 font-mono">
                {seq}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Timeline grid
  // -------------------------------------------------------------------------
  const renderTimeline = (state: ProtocolState, label: string) => {
    // Build a timeline: rows = events, cols = packet seqs
    // Gather events from packet data
    const events: { step: number; seq: number; event: 'sent' | 'lost' | 'acked' | 'retransmit' | 'buffered' }[] = [];
    for (const p of state.packets) {
      if (p.sentAt !== undefined) {
        const wasLost = lossSet.has(p.seq);
        events.push({ step: p.sentAt, seq: p.seq, event: wasLost && p.status !== 'acked' && p.status !== 'sent' && p.status !== 'buffered' ? 'lost' : 'sent' });
      }
      if (p.ackedAt !== undefined) {
        events.push({ step: p.ackedAt, seq: p.seq, event: 'acked' });
      }
      if (p.retransmitAt !== undefined) {
        events.push({ step: p.retransmitAt, seq: p.seq, event: 'retransmit' });
      }
    }

    if (events.length === 0) return null;

    const maxStep = Math.max(...events.map(e => e.step), 1);
    const grid: Record<string, string> = {};
    for (const e of events) {
      grid[`${e.step}-${e.seq}`] = e.event;
    }

    const eventColors: Record<string, string> = {
      sent: 'bg-blue-500/40',
      lost: 'bg-red-500/40',
      acked: 'bg-emerald-500/40',
      retransmit: 'bg-amber-500/40',
      buffered: 'bg-purple-500/40',
    };

    return (
      <div className="space-y-1">
        <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">{label} Timeline</span>
        <div className="overflow-x-auto">
          <div className="inline-grid gap-px" style={{ gridTemplateColumns: `2rem repeat(${TOTAL_PACKETS}, 1.5rem)` }}>
            {/* Header */}
            <div className="text-[9px] text-zinc-600 dark:text-zinc-400 font-mono text-center">t</div>
            {Array.from({ length: TOTAL_PACKETS }, (_, i) => (
              <div key={i} className="text-[9px] text-zinc-600 dark:text-zinc-400 font-mono text-center">{i + 1}</div>
            ))}
            {/* Rows */}
            {Array.from({ length: maxStep }, (_, t) => (
              <>
                <div key={`t-${t + 1}`} className="text-[9px] text-zinc-600 dark:text-zinc-400 font-mono text-center">{t + 1}</div>
                {Array.from({ length: TOTAL_PACKETS }, (_, s) => {
                  const key = `${t + 1}-${s + 1}`;
                  const ev = grid[key];
                  return (
                    <div
                      key={key}
                      className={`w-6 h-4 rounded-sm ${ev ? eventColors[ev] ?? '' : 'bg-muted/20'}`}
                      title={ev ? `Pkt ${s + 1}: ${ev} at t=${t + 1}` : ''}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const showGbn = viewMode === 'side-by-side' || viewMode === 'gbn-only';
  const showSr = viewMode === 'side-by-side' || viewMode === 'sr-only';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Go-Back-N vs Selective Repeat</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Compare how two ARQ protocols handle packet loss side by side.
        </p>
      </div>

      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-fit">
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
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Scenarios</span>
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    size="sm"
                    variant={activePreset === preset.id ? 'default' : 'outline'}
                    onClick={() => selectPreset(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white"
                  disabled={isComplete}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button variant="outline" onClick={() => setShowSecondaryControls((prev) => !prev)}>
                  {showSecondaryControls ? 'Hide Secondary Controls' : 'Show Secondary Controls'}
                </Button>
              </div>

              {showSecondaryControls && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Button
                    onClick={advanceStep}
                    variant="outline"
                    className="gap-2 border-zinc-300 dark:border-zinc-600/60 text-zinc-900 dark:text-zinc-200"
                    disabled={isPlaying || isComplete}
                  >
                    <StepForward className="w-4 h-4" />
                    Step
                  </Button>
                  <Button variant="ghost" onClick={handleReset} className="gap-2 text-zinc-500 dark:text-zinc-500 hover:text-red-400">
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                  <Badge variant="outline" className="text-xs">
                    Step: {step}
                  </Badge>

                  <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/20 p-0.5">
                    {([
                      ['side-by-side', 'Side by Side'],
                      ['gbn-only', 'GBN Only'],
                      ['sr-only', 'SR Only'],
                    ] as [ViewMode, string][]).map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          viewMode === mode
                            ? 'bg-primary/20 text-primary'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeHint && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-foreground">Scenario focus:</span> {activeHint}
              </p>
            </div>
          )}

          <SimulationCanvas isLive={isPlaying}>
            <div className="space-y-4">
              <p className="text-sm italic text-zinc-600 dark:text-zinc-400">{narration}</p>

              <div className={`grid gap-6 ${viewMode === 'side-by-side' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {showGbn && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-3">
                    {renderPacketRow(gbn, 'GBN (Go-Back-N)')}
                    {renderTimeline(gbn, 'GBN')}
                  </div>
                )}
                {showSr && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-3">
                    {renderPacketRow(sr, 'SR (Selective Repeat)')}
                    {renderTimeline(sr, 'SR')}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded border-2 ${color}`} />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">{STATUS_LABELS[status as PacketStatus]}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border-2 border-primary/50 ring-2 ring-primary/30" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">In Window</span>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">Total Transmissions</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">GBN: {gbn.totalTransmissions}</Badge>
                      <Badge variant="outline" className="text-xs">SR: {sr.totalTransmissions}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">Wasted Retransmissions</p>
                    <div className="flex items-center gap-3">
                      <Badge variant={gbn.wastedTransmissions > 0 ? 'destructive' : 'outline'} className="text-xs">GBN: {gbn.wastedTransmissions}</Badge>
                      <Badge variant={sr.wastedTransmissions > 0 ? 'destructive' : 'outline'} className="text-xs">SR: {sr.wastedTransmissions}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">Completion</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-xs ${gbn.sendBase > TOTAL_PACKETS ? 'border-emerald-400 text-emerald-300' : ''}`}>GBN: {gbn.sendBase > TOTAL_PACKETS ? 'Done' : 'In progress'}</Badge>
                      <Badge variant="outline" className={`text-xs ${sr.sendBase > TOTAL_PACKETS ? 'border-emerald-400 text-emerald-300' : ''}`}>SR: {sr.sendBase > TOTAL_PACKETS ? 'Done' : 'In progress'}</Badge>
                    </div>
                  </div>
                </div>
                {isComplete && lossSet.size > 0 && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 mt-1">
                    <p className="text-xs text-emerald-300">
                      <Lightbulb className="w-3 h-3 inline mr-1" />
                      SR used <strong>{gbn.totalTransmissions - sr.totalTransmissions}</strong> fewer transmissions than GBN.
                      {gbn.wastedTransmissions > 0 && ` GBN wasted ${gbn.wastedTransmissions} retransmissions on packets already received.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SimulationCanvas>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-5">
          <div className="space-y-2">
            <h3 className="text-foreground font-medium text-sm">What Is This?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Go-Back-N (GBN) and Selective Repeat (SR) are two ARQ loss-recovery strategies. GBN retransmits a larger range
              after a timeout, while SR retransmits only missing packets and buffers out-of-order arrivals.
            </p>
          </div>

          {activeHint && (
            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-foreground">Current scenario focus:</span> {activeHint}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-foreground font-medium text-sm">Key Concepts</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <li><strong className="text-foreground">Go-Back-N</strong> - Receiver accepts only in-order data. Sender may resend multiple packets on one loss.</li>
              <li><strong className="text-foreground">Selective Repeat</strong> - Receiver buffers out-of-order packets. Sender retransmits only specific missing packets.</li>
              <li><strong className="text-foreground">ACK style</strong> - GBN uses cumulative ACK logic; SR uses per-packet ACK logic.</li>
              <li><strong className="text-foreground">Complexity tradeoff</strong> - GBN is simpler; SR is more bandwidth-efficient during loss.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-foreground font-medium text-sm">Comparison Table</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-1.5 pr-4 text-zinc-600 dark:text-zinc-400 font-medium">Feature</th>
                    <th className="text-left py-1.5 pr-4 text-foreground font-medium">Go-Back-N</th>
                    <th className="text-left py-1.5 text-foreground font-medium">Selective Repeat</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-600 dark:text-zinc-400">
                  <tr className="border-b border-border/30">
                    <td className="py-1.5 pr-4">Receiver buffer</td>
                    <td className="py-1.5 pr-4">Not needed</td>
                    <td className="py-1.5">Window-size buffer</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-1.5 pr-4">Retransmissions</td>
                    <td className="py-1.5 pr-4 text-red-400">Larger resend range</td>
                    <td className="py-1.5 text-emerald-400">Only missing packet</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-1.5 pr-4">ACK type</td>
                    <td className="py-1.5 pr-4">Cumulative</td>
                    <td className="py-1.5">Individual</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">Complexity</td>
                    <td className="py-1.5 pr-4">Lower</td>
                    <td className="py-1.5">Higher</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong className="text-foreground">Try this:</strong> run "Single Packet Loss" and compare total transmissions.
              SR should complete with fewer retransmissions than GBN.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};



