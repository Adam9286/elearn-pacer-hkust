import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp } from 'lucide-react';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarGhostButtonClass,
  toolbarPrimaryButtonClass,
  toolbarSecondaryButtonClass,
  toolbarSelectClass,
} from './SimulatorToolbar.styles';
import type { ConceptStep, SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

type PacketStatus = 'unsent' | 'sent' | 'acked' | 'lost' | 'retransmit';
type PresetId = 'perfect' | 'single-loss' | 'multiple-losses' | 'tiny-window';
type ContentTab = 'simulation' | 'theory';

interface Packet {
  seq: number;
  status: PacketStatus;
  sentAt?: number;
  ackedAt?: number;
  retransmitAt?: number;
  wasRetransmitted?: boolean;
  recoveredAfterRetransmit?: boolean;
}

interface Preset {
  id: PresetId;
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
    hint: 'Packet 5 gets lost. The sender should retransmit it, recover, and still finish packets 9-12.',
  },
  {
    id: 'multiple-losses',
    name: 'Multiple Losses',
    windowSize: 6,
    losses: [4, 9],
    hint: 'With a larger window, more packets are in flight, but losses still stall progress until recovery succeeds.',
  },
  {
    id: 'tiny-window',
    name: 'Tiny Window',
    windowSize: 1,
    losses: [],
    hint: 'With window=1, only one packet at a time. Safe, but much slower.',
  },
];

const SLIDING_WINDOW_META: Record<PresetId | 'custom', Omit<SimulationLesson, 'steps'>> = {
  perfect: {
    intro: 'This scenario teaches the best-case version of a sliding window sender. Packets and ACKs move cleanly with no loss.',
    focus: 'Watch how ACKs free space so the sender can keep the pipeline full.',
    glossary: [
      { term: 'Sliding Window', definition: 'A sending rule that allows several packets to be in flight at the same time.' },
      { term: 'In Flight', definition: 'Sent already, but not yet acknowledged.' },
      { term: 'ACK', definition: 'A confirmation that the receiver got the data.' },
      { term: 'Window Size', definition: 'How many packets the sender may have outstanding at once.' },
    ],
    takeaway: 'When ACKs arrive smoothly, the sender keeps moving forward and throughput stays high.',
    commonMistake: 'Students often think the sender waits after every packet. A sliding window exists so it does not have to.',
    nextObservation: 'The sender only pauses when the window is full or when it is still waiting for acknowledgments.',
  },
  'single-loss': {
    intro: 'This scenario teaches what one missing packet does to a sliding window sender.',
    focus: 'Watch how one loss can stall progress until the sender notices the missing ACK and retransmits.',
    glossary: [
      { term: 'Loss Recovery', definition: 'The process of detecting a missing packet and sending it again.' },
      { term: 'Timeout', definition: 'The waiting period before the sender decides a packet was probably lost.' },
      { term: 'Retransmission', definition: 'Sending the missing packet again.' },
      { term: 'Head-of-Line Blocking', definition: 'Later progress is stuck behind an earlier missing packet.' },
    ],
    takeaway: 'One lost packet can pause the whole flow until recovery succeeds, even if later packets could have been sent.',
    commonMistake: 'A retransmission is not a duplicate bug. It is how reliable protocols recover from loss.',
    nextObservation: 'After the missing packet is acknowledged, the sender can finally move past the gap and finish the flow.',
  },
  'multiple-losses': {
    intro: 'This scenario teaches how a larger window still needs disciplined recovery when more than one packet is lost.',
    focus: 'Watch which packets keep the pipeline busy and which missing packets force the sender to wait.',
    glossary: [
      { term: 'Pipeline', definition: 'A stream of packets moving continuously through the network.' },
      { term: 'Outstanding Data', definition: 'Data that has been sent but not yet confirmed.' },
      { term: 'Gap', definition: 'A missing sequence number that blocks in-order progress.' },
      { term: 'Recovery Cost', definition: 'The extra time and traffic caused by retransmissions.' },
    ],
    takeaway: 'A bigger window improves utilization, but it also means more data may be affected when loss interrupts the flow.',
    commonMistake: 'A larger window is not always better. It increases speed, but it also increases the amount of unconfirmed data in the network.',
    nextObservation: 'Compare this with the perfect-delivery case to see how much recovery work changes the story.',
  },
  'tiny-window': {
    intro: 'This scenario teaches the extreme safe case: only one packet is allowed in flight at a time.',
    focus: 'Notice how simple the flow becomes when the sender waits after every packet.',
    glossary: [
      { term: 'Stop-and-Wait Style', definition: 'A very small effective window where one packet is sent and then the sender waits.' },
      { term: 'Throughput', definition: 'How much useful data gets delivered over time.' },
      { term: 'Round Trip Time', definition: 'The time for a packet and its acknowledgment to make a full trip.' },
      { term: 'Idle Time', definition: 'Time when the network could carry more data but the sender is waiting.' },
    ],
    takeaway: 'A tiny window is simple and safe, but it wastes time because the sender cannot keep the path busy.',
    commonMistake: 'Beginners sometimes think fewer in-flight packets always means better reliability. It usually means slower transfer too.',
    nextObservation: 'Compare this with a larger window to see how pipelining improves efficiency.',
  },
  custom: {
    intro: 'This custom scenario lets you change the window and packet loss pattern to see how reliability and speed interact.',
    focus: 'Change one variable at a time so you can clearly see what caused the behavior you observe.',
    glossary: [
      { term: 'Custom Scenario', definition: 'A run where you choose the window size and loss points yourself.' },
      { term: 'Tradeoff', definition: 'A choice that improves one thing while making another thing worse.' },
      { term: 'Reliability', definition: 'Whether the sender can recover and deliver all packets correctly.' },
      { term: 'Efficiency', definition: 'How much useful progress is made without extra waiting or retransmission.' },
    ],
    takeaway: 'Window size and loss patterns work together. There is no one perfect setting for every network condition.',
    commonMistake: 'If you change several controls at once, it becomes hard to tell which change caused the new behavior.',
    nextObservation: 'Try one clean run first, then add one loss, then enlarge the window so the differences stay obvious.',
  },
};

const NO_LOSS_GUIDE_STEPS: ConceptStep[] = [
  { title: 'Window Initialization', description: 'Sender sets the active window and prepares the first burst of packets.' },
  { title: 'Fill The Window', description: 'Packets are sent up to the in-flight limit without waiting for individual ACKs.' },
  { title: 'ACK and Slide', description: 'ACKs free space in the window, so the sender advances the base and sends more.' },
  { title: 'Continue Delivery', description: 'The sender keeps the pipeline busy until the remaining packets clear the path.' },
  { title: 'All Data ACKed', description: 'Every packet has been acknowledged, so the transfer reaches a clean terminal state.' },
];

const LOSS_RECOVERY_GUIDE_STEPS: ConceptStep[] = [
  { title: 'Window Initialization', description: 'Sender sets the active window and prepares the first burst of packets.' },
  { title: 'Fill The Window', description: 'Packets are sent until the window is full, including the one that will be lost.' },
  { title: 'ACK and Slide', description: 'Earlier packets are acknowledged, but the sender cannot move past the missing sequence.' },
  { title: 'Detect Stall', description: 'Head-of-line blocking appears because the missing packet prevents full window advancement.' },
  { title: 'Timeout Fires', description: 'The sender waits long enough to declare the missing packet lost and schedule recovery.' },
  { title: 'Retransmit Lost Packet', description: 'The missing packet is placed back on the wire independently of the normal next-sequence sender.' },
  { title: 'Recovery ACK', description: 'The retransmitted packet is acknowledged, so the sender can finally move beyond the gap.' },
  { title: 'Remaining Delivery', description: 'With the gap repaired, the sender transmits the remaining unsent packets to finish the run.' },
  { title: 'All Data ACKed', description: 'Every packet, including the retransmission, is acknowledged. The simulation is complete.' },
];

const createInitialPackets = (): Packet[] =>
  Array.from({ length: TOTAL_PACKETS }, (_, index) => ({ seq: index + 1, status: 'unsent' }));

const getSlidingWindowGuideState = (
  packets: Packet[],
  sendBase: number,
  nextSeq: number,
  windowSize: number,
  configuredLosses: Set<number>,
  step: number
) => {
  const isComplete = sendBase > TOTAL_PACKETS && packets.every((packet) => packet.status === 'acked');
  const hasConfiguredLoss = configuredLosses.size > 0;

  if (!hasConfiguredLoss) {
    const hasStarted = step > 0 && packets.some((packet) => packet.status !== 'unsent');
    const hasAcked = packets.some((packet) => packet.status === 'acked');
    const hasTailTraffic = packets.some((packet) => packet.seq > windowSize && packet.status !== 'unsent');

    let currentStep = 0;
    if (isComplete) currentStep = 4;
    else if (hasTailTraffic) currentStep = 3;
    else if (hasAcked || sendBase > 1) currentStep = 2;
    else if (hasStarted || nextSeq > 1) currentStep = 1;

    return {
      steps: NO_LOSS_GUIDE_STEPS,
      currentStep,
      isComplete,
    };
  }

  const highestLoss = Math.max(...Array.from(configuredLosses));
  const hasAckedBeforeLoss = packets.some((packet) => packet.seq < highestLoss && packet.status === 'acked');
  const hasLostOutstanding = packets.some((packet) => packet.status === 'lost');
  const hasTimeoutQueued = packets.some((packet) => packet.status === 'retransmit');
  const hasRetransmissionInFlight = packets.some((packet) => packet.status === 'sent' && packet.wasRetransmitted);
  const hasRecoveryAck = packets.some((packet) => packet.recoveredAfterRetransmit);
  const hasTailTraffic = packets.some((packet) => packet.seq > highestLoss && packet.status !== 'unsent');

  let currentStep = 0;
  if (isComplete) currentStep = 8;
  else if (hasRecoveryAck && hasTailTraffic) currentStep = 7;
  else if (hasRecoveryAck) currentStep = 6;
  else if (hasRetransmissionInFlight) currentStep = 5;
  else if (hasTimeoutQueued) currentStep = 4;
  else if (hasLostOutstanding) currentStep = 3;
  else if (hasAckedBeforeLoss || sendBase > 1) currentStep = 2;
  else if (step > 0 || packets.some((packet) => packet.status !== 'unsent')) currentStep = 1;

  return {
    steps: LOSS_RECOVERY_GUIDE_STEPS,
    currentStep,
    isComplete,
  };
};

export const SlidingWindowSimulator = ({ onStepChange, onGuideStateChange }: SimulatorStepProps) => {
  const [windowSize, setWindowSize] = useState(4);
  const [lossSeqs, setLossSeqs] = useState<Set<number>>(new Set());
  const [lostAlready, setLostAlready] = useState<Set<number>>(new Set());
  const [packets, setPackets] = useState<Packet[]>(createInitialPackets);
  const [sendBase, setSendBase] = useState(1);
  const [nextSeq, setNextSeq] = useState(1);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [log, setLog] = useState<string[]>(['Ready. Choose a scenario or click Play to begin.']);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeHint, setActiveHint] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab] = useState<ContentTab>('simulation');
  const [narration, setNarration] = useState('Choose a scenario above, then press Play or Step to begin.');

  const guideState = useMemo(
    () => getSlidingWindowGuideState(packets, sendBase, nextSeq, windowSize, lossSeqs, step),
    [packets, sendBase, nextSeq, windowSize, lossSeqs, step]
  );
  const isComplete = guideState.isComplete;
  const activeLessonId = (activePreset ?? 'custom') as PresetId | 'custom';
  const coachLesson: SimulationLesson = {
    ...SLIDING_WINDOW_META[activeLessonId],
    focus: activeHint || SLIDING_WINDOW_META[activeLessonId].focus,
    steps: guideState.steps.map((guideStep, index) => ({
      title: guideStep.title,
      explanation: guideStep.description,
      whatToNotice: index === guideState.currentStep
        ? narration
        : `This step matters because it changes whether the sender can keep transmitting or must wait.`,
      whyItMatters: index === guideState.steps.length - 1
        ? SLIDING_WINDOW_META[activeLessonId].takeaway
        : 'Reliable transport depends on sending enough data to stay efficient while still recovering cleanly from loss.',
    })),
  };

  useEffect(() => {
    onStepChange?.(guideState.currentStep);
    onGuideStateChange?.({
      ...guideState,
      mode: 'terminal',
    });
  }, [guideState, onGuideStateChange, onStepChange]);

  const advanceStep = useCallback(() => {
    if (isComplete) return;

    const currentStep = step + 1;
    const updated = packets.map((packet) => ({ ...packet }));
    const newLostAlready = new Set(lostAlready);
    const nextLogEntries: string[] = [];
    const narrationParts: string[] = [];

    setStep(currentStep);

    let newSendBase = sendBase;
    const ackedPackets: number[] = [];
    const recoveredPackets: number[] = [];
    for (let index = newSendBase - 1; index < Math.min(newSendBase + windowSize - 1, TOTAL_PACKETS); index++) {
      const packet = updated[index];
      if (packet.status === 'sent' && packet.sentAt !== undefined && packet.sentAt < currentStep) {
        const recoveredAfterRetransmit = Boolean(packet.wasRetransmitted);
        updated[index] = {
          ...packet,
          status: 'acked',
          ackedAt: currentStep,
          wasRetransmitted: false,
          recoveredAfterRetransmit,
        };
        nextLogEntries.push(`[Step ${currentStep}] ACK received for packet ${packet.seq}`);
        if (recoveredAfterRetransmit) recoveredPackets.push(packet.seq);
        else ackedPackets.push(packet.seq);
      }
    }
    while (newSendBase <= TOTAL_PACKETS && updated[newSendBase - 1].status === 'acked') {
      newSendBase++;
    }

    const retransmittedPackets: number[] = [];
    for (let index = 0; index < TOTAL_PACKETS; index++) {
      const packet = updated[index];
      if (packet.status === 'retransmit' && packet.retransmitAt !== undefined && packet.retransmitAt < currentStep) {
        updated[index] = {
          ...packet,
          status: 'sent',
          sentAt: currentStep,
          retransmitAt: undefined,
          wasRetransmitted: true,
        };
        retransmittedPackets.push(packet.seq);
        nextLogEntries.push(`[Step ${currentStep}] Retransmitting packet ${packet.seq}`);
      }
    }

    const timeoutPackets: number[] = [];
    for (let index = newSendBase - 1; index < Math.min(newSendBase + windowSize - 1, TOTAL_PACKETS); index++) {
      const packet = updated[index];
      if (packet.status === 'lost' && packet.sentAt !== undefined && currentStep - packet.sentAt >= 2) {
        updated[index] = { ...packet, status: 'retransmit', retransmitAt: currentStep };
        timeoutPackets.push(packet.seq);
        nextLogEntries.push(`[Step ${currentStep}] Timeout! Scheduling retransmission for packet ${packet.seq}`);
      }
    }

    let currentNextSeq = nextSeq;
    const sentPackets: number[] = [];
    const lostPackets: number[] = [];
    while (currentNextSeq <= TOTAL_PACKETS && currentNextSeq < newSendBase + windowSize) {
      const index = currentNextSeq - 1;
      if (updated[index].status === 'unsent') {
        if (lossSeqs.has(currentNextSeq) && !newLostAlready.has(currentNextSeq)) {
          updated[index] = { ...updated[index], status: 'lost', sentAt: currentStep };
          newLostAlready.add(currentNextSeq);
          lostPackets.push(currentNextSeq);
          nextLogEntries.push(`[Step ${currentStep}] Packet ${currentNextSeq} LOST in transit!`);
        } else {
          updated[index] = { ...updated[index], status: 'sent', sentAt: currentStep };
          sentPackets.push(currentNextSeq);
          nextLogEntries.push(`[Step ${currentStep}] Sent packet ${currentNextSeq}`);
        }
      }
      currentNextSeq++;
    }

    const hasCompletedSuccessfully = newSendBase > TOTAL_PACKETS && updated.every((packet) => packet.status === 'acked');

    if (sentPackets.length > 0) {
      narrationParts.push(
        sentPackets.length === 1
          ? `Sending packet ${sentPackets[0]} into the window.`
          : `Sending packets ${sentPackets[0]}-${sentPackets[sentPackets.length - 1]} to keep the window full.`
      );
    }
    if (lostPackets.length > 0) {
      narrationParts.push(
        lostPackets.length === 1
          ? `Packet ${lostPackets[0]} is lost in transit, so the sender will eventually stall behind it.`
          : `Packets ${lostPackets.join(', ')} are lost in transit, so the sender will stall behind the gaps.`
      );
    }
    if (ackedPackets.length > 0) {
      narrationParts.push(
        ackedPackets.length === 1
          ? `ACK received for packet ${ackedPackets[0]}, and the window slides forward.`
          : `ACKs received for packets ${ackedPackets.join(', ')}, allowing the window to slide forward.`
      );
    }
    if (timeoutPackets.length > 0) {
      narrationParts.push(
        timeoutPackets.length === 1
          ? `Timeout fires for packet ${timeoutPackets[0]}, so recovery is scheduled.`
          : `Timeouts fire for packets ${timeoutPackets.join(', ')}, so recovery is scheduled.`
      );
    }
    if (retransmittedPackets.length > 0) {
      narrationParts.push(
        retransmittedPackets.length === 1
          ? `Packet ${retransmittedPackets[0]} is retransmitted and placed back on the wire.`
          : `Packets ${retransmittedPackets.join(', ')} are retransmitted and placed back on the wire.`
      );
    }
    if (recoveredPackets.length > 0) {
      narrationParts.push(
        recoveredPackets.length === 1
          ? `Retransmitted packet ${recoveredPackets[0]} is acknowledged, so the sender can finally move past the gap.`
          : `Retransmitted packets ${recoveredPackets.join(', ')} are acknowledged, so the sender can finally move past the gaps.`
      );
    }

    if (narrationParts.length === 0) {
      const hasLost = updated.some((packet) => packet.status === 'lost');
      const hasInFlight = updated.some((packet) => packet.status === 'sent');
      const hasQueuedRetransmit = updated.some((packet) => packet.status === 'retransmit');
      if (hasQueuedRetransmit) narrationParts.push('Recovery is queued and will be sent on the next round-trip.');
      else if (hasLost) narrationParts.push('Waiting for the timeout because the window is stalled behind a missing packet.');
      else if (hasInFlight) narrationParts.push('Waiting for acknowledgments to return before advancing again.');
    }

    if (hasCompletedSuccessfully) {
      narrationParts.push('All packets delivered successfully!');
    }

    setPackets(updated);
    setLostAlready(newLostAlready);
    setSendBase(newSendBase);
    setNextSeq(currentNextSeq);
    setNarration(narrationParts.join(' '));
    if (nextLogEntries.length > 0) {
      setLog((prev) => [...prev.slice(-Math.max(0, 20 - nextLogEntries.length)), ...nextLogEntries]);
    }
  }, [isComplete, lostAlready, lossSeqs, nextSeq, packets, sendBase, step, windowSize]);

  useEffect(() => {
    if (isPlaying && !isComplete) {
      intervalRef.current = setInterval(advanceStep, 800);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isComplete, advanceStep]);

  useEffect(() => {
    if (isComplete) {
      setIsPlaying(false);
      setNarration('All packets delivered successfully!');
      setLog((prev) =>
        prev[prev.length - 1] === 'All packets delivered successfully!'
          ? prev
          : [...prev.slice(-19), 'All packets delivered successfully!']
      );
    }
  }, [isComplete]);

  const reset = useCallback((presetWindowSize?: number, presetLosses?: number[]) => {
    setIsPlaying(false);
    setPackets(createInitialPackets());
    setLostAlready(new Set());
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
    setLossSeqs((prev) => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });
  }, [step]);

  const windowEnd = Math.min(sendBase + windowSize - 1, TOTAL_PACKETS);

  return (
    <div className="space-y-4">

      {activeTab === 'simulation' ? (
        <div className="space-y-3">
          <SimulatorToolbar
            label="Simulation Controls"
            status={(
              <Badge variant="outline" className="border-border bg-background/80 text-xs text-foreground">
                Step: {step}
              </Badge>
            )}
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
                onClick={() => setIsPlaying((prev) => !prev)}
                className={`gap-2 ${toolbarPrimaryButtonClass}`}
                disabled={isComplete}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                onClick={advanceStep}
                variant="outline"
                className={`gap-2 ${toolbarSecondaryButtonClass}`}
                disabled={isPlaying || isComplete}
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
              onClick={() => setShowAdvanced((prev) => !prev)}
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
                    onValueChange={([value]) => {
                      if (step === 0) {
                        setWindowSize(value);
                        setActivePreset(null);
                        setActiveHint('');
                      }
                    }}
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
                      Click packets below to toggle loss events before starting. Currently:{' '}
                      {lossSeqs.size === 0
                        ? 'No losses'
                        : Array.from(lossSeqs).sort((left, right) => left - right).map((value) => `#${value}`).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <SimulationCanvas
            isLive={isPlaying}
            statusMode="terminal"
            isComplete={isComplete}
            coachPanel={(
              <SimulationCoachPanel
                lesson={coachLesson}
                currentStep={guideState.currentStep}
                isComplete={isComplete}
              />
            )}
          >
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
                {packets.map((packet) => {
                  const inWindow = packet.seq >= sendBase && packet.seq <= windowEnd;
                  return (
                    <button
                      key={packet.seq}
                      onClick={() => toggleLoss(packet.seq)}
                      disabled={step > 0 || !showAdvanced}
                      className={`
                        w-14 h-14 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all
                        ${STATUS_COLORS[packet.status]}
                        ${inWindow ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background' : ''}
                        ${step === 0 && lossSeqs.has(packet.seq) && packet.status === 'unsent' ? 'ring-2 ring-red-500 bg-red-500/10' : ''}
                        ${step === 0 && showAdvanced ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                      `}
                    >
                      <span className="font-bold text-sm">{packet.seq}</span>
                      <span className="text-[10px] opacity-80">
                        {step === 0 && lossSeqs.has(packet.seq) ? 'LOSS' : STATUS_LABELS[packet.status]}
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

              <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-card/80 p-4 font-mono shadow-sm">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Event Log</h3>
                {log.map((entry, index) => (
                  <p
                    key={`${entry}-${index}`}
                    className={`text-xs font-mono ${
                      entry.includes('LOST')
                        ? 'text-red-400'
                        : entry.includes('ACK')
                          ? 'text-emerald-400'
                          : entry.includes('Retransmit') || entry.includes('Timeout')
                            ? 'text-amber-400'
                            : entry.includes('successfully')
                              ? 'text-primary font-bold'
                              : 'text-muted-foreground'
                    }`}
                  >
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
              <li><strong className="text-foreground">Head-of-Line Blocking</strong> - The window cannot slide past an unacknowledged packet. Even if later packets arrive, the missing sequence still blocks progress.</li>
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
