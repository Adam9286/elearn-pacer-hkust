import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimulationCanvas } from './SimulationCanvas';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Monitor,
  Server,
  Lightbulb,
} from 'lucide-react';

// --- Types ---

type MessageType = 'SYN' | 'SYN-ACK' | 'ACK' | 'RST' | 'FIN' | 'TIMEOUT';
type Sender = 'client' | 'server';
type ContentTab = 'simulation' | 'theory';

interface SeqInfo {
  clientSeq: number;
  serverSeq: number;
  explanation: string;
}

interface Step {
  sender: Sender;
  messageLabel: string;
  messageType: MessageType;
  clientState: string;
  serverState: string;
  narration: string;
  seqInfo: SeqInfo;
}

interface Scenario {
  id: string;
  name: string;
  hint: string;
  steps: Step[];
}

// --- Color map for message types ---

const MESSAGE_COLORS: Record<MessageType, string> = {
  SYN: 'text-indigo-400 border-indigo-400/60 bg-indigo-500/10',
  'SYN-ACK': 'text-emerald-400 border-emerald-400/60 bg-emerald-500/10',
  ACK: 'text-amber-400 border-amber-400/60 bg-amber-500/10',
  RST: 'text-red-400 border-red-400/60 bg-red-500/10',
  FIN: 'text-orange-400 border-orange-400/60 bg-orange-500/10',
  TIMEOUT: 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50',
};

const ARROW_ACCENT: Record<MessageType, string> = {
  SYN: 'bg-indigo-400',
  'SYN-ACK': 'bg-emerald-400',
  ACK: 'bg-amber-400',
  RST: 'bg-red-400',
  FIN: 'bg-orange-400',
  TIMEOUT: 'bg-muted-foreground',
};

// --- Scenarios ---

const SCENARIOS: Scenario[] = [
  {
    id: 'normal',
    name: 'Normal Handshake',
    hint: 'The classic 3-step process. Watch the sequence numbers increment.',
    steps: [
      {
        sender: 'client',
        messageLabel: 'SYN, Seq=100',
        messageType: 'SYN',
        clientState: 'SYN_SENT',
        serverState: 'LISTEN',
        narration:
          "Client wants to connect. It sends a SYN (synchronize) packet with a random starting sequence number (100).",
        seqInfo: {
          clientSeq: 100,
          serverSeq: 0,
          explanation: 'Client picks Seq=100 as its starting sequence number.',
        },
      },
      {
        sender: 'server',
        messageLabel: 'SYN-ACK, Seq=300, Ack=101',
        messageType: 'SYN-ACK',
        clientState: 'SYN_SENT',
        serverState: 'SYN_RECEIVED',
        narration:
          "Server receives the SYN and responds with SYN-ACK â€” it's saying 'I got your request (ACK=101) and here's my own sequence number (Seq=300).'",
        seqInfo: {
          clientSeq: 100,
          serverSeq: 300,
          explanation:
            'ACK=101 means: I received everything up to byte 100, send me byte 101 next.',
        },
      },
      {
        sender: 'client',
        messageLabel: 'ACK, Seq=101, Ack=301',
        messageType: 'ACK',
        clientState: 'ESTABLISHED',
        serverState: 'ESTABLISHED',
        narration:
          "Client sends an ACK to confirm. Both sides are now ESTABLISHED â€” data can flow!",
        seqInfo: {
          clientSeq: 101,
          serverSeq: 300,
          explanation:
            'ACK=301 means: I received the server\'s SYN (Seq=300), expecting byte 301 next.',
        },
      },
    ],
  },
  {
    id: 'refused',
    name: 'Connection Refused',
    hint: "The server isn't listening on this port â€” it responds with RST (reset) to reject the connection.",
    steps: [
      {
        sender: 'client',
        messageLabel: 'SYN, Seq=100',
        messageType: 'SYN',
        clientState: 'SYN_SENT',
        serverState: 'CLOSED',
        narration:
          'Client sends a SYN to initiate a connection, but the server has no application listening on this port.',
        seqInfo: {
          clientSeq: 100,
          serverSeq: 0,
          explanation: 'Client tries to connect with Seq=100.',
        },
      },
      {
        sender: 'server',
        messageLabel: 'RST',
        messageType: 'RST',
        clientState: 'CLOSED',
        serverState: 'CLOSED',
        narration:
          "Server sends RST â€” this port is closed. Connection failed. The client knows immediately that no service is available.",
        seqInfo: {
          clientSeq: 100,
          serverSeq: 0,
          explanation: 'RST = Reset. The server forcefully rejects the connection.',
        },
      },
    ],
  },
  {
    id: 'timeout',
    name: 'SYN Timeout',
    hint: "The server doesn't respond. The client retries after a timeout. This happens when packets are lost or the server is down.",
    steps: [
      {
        sender: 'client',
        messageLabel: 'SYN, Seq=100',
        messageType: 'SYN',
        clientState: 'SYN_SENT',
        serverState: 'CLOSED',
        narration:
          'Client sends a SYN, but the server is unreachable (maybe it\'s down, or a firewall is blocking).',
        seqInfo: {
          clientSeq: 100,
          serverSeq: 0,
          explanation: 'Client sends SYN and starts a retransmission timer.',
        },
      },
      {
        sender: 'client',
        messageLabel: '(timeout â€” no response)',
        messageType: 'TIMEOUT',
        clientState: 'SYN_SENT',
        serverState: 'CLOSED',
        narration:
          'No response... the retransmission timer expires. The client will retry.',
        seqInfo: {
          clientSeq: 100,
          serverSeq: 0,
          explanation: 'Timeout! No ACK received within the expected window.',
        },
      },
      {
        sender: 'client',
        messageLabel: 'SYN, Seq=100 (retry)',
        messageType: 'SYN',
        clientState: 'SYN_SENT',
        serverState: 'CLOSED',
        narration:
          'Client retransmits the SYN with the same sequence number. TCP will keep retrying with exponential backoff (1s, 2s, 4s, 8s...) before eventually giving up.',
        seqInfo: {
          clientSeq: 100,
          serverSeq: 0,
          explanation:
            'Same Seq=100 â€” retransmissions reuse the original sequence number.',
        },
      },
    ],
  },
  {
    id: 'teardown',
    name: 'Connection Teardown',
    hint: 'Closing is a 4-step process because each side must finish sending independently.',
    steps: [
      {
        sender: 'client',
        messageLabel: 'FIN, Seq=500',
        messageType: 'FIN',
        clientState: 'FIN_WAIT_1',
        serverState: 'ESTABLISHED',
        narration:
          "Client is done sending data. It sends FIN (finish) to start closing its side of the connection.",
        seqInfo: {
          clientSeq: 500,
          serverSeq: 800,
          explanation:
            "FIN = I'm done sending. But I can still receive data from you.",
        },
      },
      {
        sender: 'server',
        messageLabel: 'ACK, Ack=501',
        messageType: 'ACK',
        clientState: 'FIN_WAIT_2',
        serverState: 'CLOSE_WAIT',
        narration:
          "Server acknowledges the client's FIN. The server can still send data if needed â€” this is a 'half-close'.",
        seqInfo: {
          clientSeq: 500,
          serverSeq: 800,
          explanation:
            "ACK=501 confirms the client's FIN. Server enters CLOSE_WAIT â€” it may still have data to send.",
        },
      },
      {
        sender: 'server',
        messageLabel: 'FIN, Seq=800',
        messageType: 'FIN',
        clientState: 'FIN_WAIT_2',
        serverState: 'LAST_ACK',
        narration:
          "Server is also done sending. It sends its own FIN to close its side of the connection.",
        seqInfo: {
          clientSeq: 500,
          serverSeq: 800,
          explanation:
            "Server's FIN means: I'm also done sending data. Close complete from my side.",
        },
      },
      {
        sender: 'client',
        messageLabel: 'ACK, Ack=801',
        messageType: 'ACK',
        clientState: 'TIME_WAIT',
        serverState: 'CLOSED',
        narration:
          "Client acknowledges the server's FIN. Client enters TIME_WAIT (waits ~2 minutes to handle any delayed packets) before fully closing. Server is now CLOSED.",
        seqInfo: {
          clientSeq: 501,
          serverSeq: 800,
          explanation:
            "ACK=801 confirms server's FIN. Client waits in TIME_WAIT before closing.",
        },
      },
    ],
  },
];

// --- Component ---

export const TcpHandshakeSimulator = () => {
  const [activePreset, setActivePreset] = useState<string>('normal');
  const [activeHint, setActiveHint] = useState<string>(SCENARIOS[0].hint);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('simulation');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === activePreset) ?? SCENARIOS[0];
  const totalSteps = scenario.steps.length;
  const currentStepData = currentStep >= 0 && currentStep < totalSteps ? scenario.steps[currentStep] : null;

  // Narration
  const narration =
    currentStep < 0
      ? 'Choose a scenario above, then press Play or Step to begin.'
      : currentStep < totalSteps
        ? scenario.steps[currentStep].narration
        : 'Simulation complete! Try another scenario or reset to replay.';

  // --- Controls ---

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const stepForward = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= totalSteps) {
        stopAutoPlay();
        return totalSteps;
      }
      return next;
    });
  }, [totalSteps, stopAutoPlay]);

  const reset = useCallback(() => {
    stopAutoPlay();
    setCurrentStep(-1);
  }, [stopAutoPlay]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopAutoPlay();
    } else {
      if (currentStep >= totalSteps) {
        setCurrentStep(-1);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentStep, totalSteps, stopAutoPlay]);

  const selectPreset = useCallback(
    (id: string) => {
      stopAutoPlay();
      const sc = SCENARIOS.find((s) => s.id === id);
      if (sc) {
        setActivePreset(id);
        setActiveHint(sc.hint);
        setCurrentStep(-1);
      }
    },
    [stopAutoPlay]
  );

  // Auto-play effect
  useEffect(() => {
    if (isPlaying) {
      // Advance once immediately if at -1
      if (currentStep < 0) {
        setCurrentStep(0);
      }
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= totalSteps) {
            stopAutoPlay();
            return totalSteps;
          }
          return next;
        });
      }, 1200);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, totalSteps, stopAutoPlay, currentStep]);

  // --- Derive state labels for timeline ---

  const getClientStates = () => {
    const states: string[] = [];
    if (scenario.id === 'teardown') {
      states.push('ESTABLISHED');
    } else {
      states.push('CLOSED');
    }
    for (let i = 0; i < totalSteps; i++) {
      states.push(scenario.steps[i].clientState);
    }
    return states;
  };

  const getServerStates = () => {
    const states: string[] = [];
    if (scenario.id === 'teardown') {
      states.push('ESTABLISHED');
    } else if (scenario.id === 'refused' || scenario.id === 'timeout') {
      states.push('CLOSED');
    } else {
      states.push('LISTEN');
    }
    for (let i = 0; i < totalSteps; i++) {
      states.push(scenario.steps[i].serverState);
    }
    return states;
  };

  const clientStates = getClientStates();
  const serverStates = getServerStates();

  // Which state index is active
  const activeStateIdx = currentStep + 1; // 0 = initial, 1 = after step 0, etc.

  // Arrow vertical spacing
  const ARROW_TOP_OFFSET = 48;
  const ARROW_SPACING = 80;
  const timelineHeight = Math.max(400, ARROW_TOP_OFFSET + totalSteps * ARROW_SPACING + 60);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">TCP Handshake Simulator</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Step through setup, failure, and teardown behavior in the TCP state machine.
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-[220px] items-center gap-2">
                <label htmlFor="tcp-handshake-scenario" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Scenario
                </label>
                <select
                  id="tcp-handshake-scenario"
                  value={activePreset}
                  onChange={(event) => selectPreset(event.target.value)}
                  className="h-9 min-w-[220px] rounded-md border border-border bg-background px-2 text-sm text-foreground"
                >
                  {SCENARIOS.map((scenarioOption) => (
                    <option key={scenarioOption.id} value={scenarioOption.id}>
                      {scenarioOption.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={togglePlay} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-300 dark:border-zinc-600/60 text-zinc-900 dark:text-zinc-200"
                  onClick={stepForward}
                  disabled={isPlaying || currentStep >= totalSteps}
                >
                  <StepForward className="h-4 w-4 mr-1" />
                  Step
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} className="text-zinc-500 dark:text-zinc-500 hover:text-red-400">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Badge variant="outline" className="text-xs">
                  Step {Math.max(0, currentStep + 1)} / {totalSteps}
                </Badge>
              </div>
            </div>
          </div>

          <SimulationCanvas isLive={isPlaying}>
            <div className="space-y-4">
              <p className="text-sm italic text-zinc-900 dark:text-zinc-200">{narration}</p>

              <div className="overflow-x-auto">
                <div className="relative mx-auto" style={{ minHeight: timelineHeight, maxWidth: 700 }}>
                  <div className="absolute left-0 top-0 w-28" style={{ height: timelineHeight }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Monitor className="h-5 w-5 text-indigo-400" />
                      <span className="text-sm font-semibold text-indigo-400">Client</span>
                    </div>
                    <div className="relative ml-3" style={{ height: timelineHeight - 36 }}>
                      <div className="absolute left-0 top-0 bottom-0 border-l-2 border-indigo-400/40" />
                      {clientStates.map((state, idx) => {
                        const isActive = idx === activeStateIdx;
                        const isVisible = idx <= activeStateIdx;
                        return (
                          <div
                            key={`cs-${idx}`}
                            className="absolute -left-1 flex items-center"
                            style={{ top: idx === 0 ? 0 : ARROW_TOP_OFFSET + (idx - 1) * ARROW_SPACING + 24 }}
                          >
                            <div
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                isActive
                                  ? 'bg-indigo-400 ring-2 ring-indigo-400/40'
                                  : isVisible
                                    ? 'bg-indigo-400/50'
                                    : 'bg-muted-foreground/30'
                              }`}
                            />
                            <span
                              className={`ml-2 text-[10px] font-mono whitespace-nowrap transition-all duration-300 ${
                                isActive
                                  ? 'text-indigo-300 font-bold'
                                  : isVisible
                                    ? 'text-indigo-400/60'
                                    : 'text-zinc-600/30 dark:text-zinc-400/30'
                              }`}
                            >
                              {state}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="absolute right-0 top-0 w-28" style={{ height: timelineHeight }}>
                    <div className="flex items-center gap-1.5 mb-3 justify-end">
                      <span className="text-sm font-semibold text-emerald-400">Server</span>
                      <Server className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="relative mr-3" style={{ height: timelineHeight - 36 }}>
                      <div className="absolute right-0 top-0 bottom-0 border-r-2 border-emerald-400/40" />
                      {serverStates.map((state, idx) => {
                        const isActive = idx === activeStateIdx;
                        const isVisible = idx <= activeStateIdx;
                        return (
                          <div
                            key={`ss-${idx}`}
                            className="absolute -right-1 flex items-center justify-end"
                            style={{ top: idx === 0 ? 0 : ARROW_TOP_OFFSET + (idx - 1) * ARROW_SPACING + 24 }}
                          >
                            <span
                              className={`mr-2 text-[10px] font-mono whitespace-nowrap transition-all duration-300 ${
                                isActive
                                  ? 'text-emerald-300 font-bold'
                                  : isVisible
                                    ? 'text-emerald-400/60'
                                    : 'text-zinc-600/30 dark:text-zinc-400/30'
                              }`}
                            >
                              {state}
                            </span>
                            <div
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                isActive
                                  ? 'bg-emerald-400 ring-2 ring-emerald-400/40'
                                  : isVisible
                                    ? 'bg-emerald-400/50'
                                    : 'bg-muted-foreground/30'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="absolute left-28 right-28 top-0" style={{ height: timelineHeight }}>
                    {scenario.steps.map((step, idx) => {
                      const isVisible = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      const goesRight = step.sender === 'client';
                      const yPos = ARROW_TOP_OFFSET + idx * ARROW_SPACING;
                      const colorClass = MESSAGE_COLORS[step.messageType];
                      const accentClass = ARROW_ACCENT[step.messageType];
                      const isTimeout = step.messageType === 'TIMEOUT';

                      return (
                        <div
                          key={`arrow-${idx}`}
                          className={`absolute left-0 right-0 transition-all duration-500 ${
                            isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                          } ${
                            isVisible
                              ? goesRight
                                ? 'tranzinc-x-0'
                                : 'tranzinc-x-0'
                              : goesRight
                                ? '-tranzinc-x-4'
                                : 'tranzinc-x-4'
                          }`}
                          style={{ top: yPos }}
                        >
                          {isTimeout ? (
                            <div className="flex flex-col items-center py-1">
                              <div className={`rounded border px-3 py-1.5 text-xs font-mono ${colorClass}`}>
                                {step.messageLabel}
                              </div>
                              <div className="mt-1 border-t border-dashed border-muted-foreground/40 w-full" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div
                                className={`rounded border px-3 py-1.5 text-xs font-mono mb-1.5 ${colorClass} ${
                                  isCurrent ? 'ring-1 ring-primary/30' : ''
                                }`}
                              >
                                {step.messageLabel}
                              </div>
                              <div className="relative w-full h-3 flex items-center">
                                <div className={`h-[2px] w-full ${accentClass} opacity-70`} />
                                {goesRight ? (
                                  <div
                                    className={`absolute right-0 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] ${
                                      accentClass.replace('bg-', 'border-l-')
                                    }`}
                                    style={{ borderLeftColor: getArrowColor(step.messageType) }}
                                  />
                                ) : (
                                  <div
                                    className="absolute left-0 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[8px]"
                                    style={{ borderRightColor: getArrowColor(step.messageType) }}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {currentStepData && (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Sequence Numbers</p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <Badge variant="secondary" className="font-mono text-indigo-400 bg-indigo-500/10 border-indigo-400/30">
                      Client Seq = {currentStepData.seqInfo.clientSeq}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-emerald-400 bg-emerald-500/10 border-emerald-400/30">
                      Server Seq = {currentStepData.seqInfo.serverSeq}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">{currentStepData.seqInfo.explanation}</p>
                </div>
              )}

              {currentStep >= 0 && (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">TCP State Transitions</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-indigo-400 mb-1.5 flex items-center gap-1">
                        <Monitor className="h-3.5 w-3.5" /> Client States
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        {clientStates.map((state, idx) => (
                          <span key={`cst-${idx}`} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-zinc-600/40 dark:text-zinc-400/40 text-[10px]">&rarr;</span>}
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-mono transition-all duration-300 ${
                                idx === activeStateIdx
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50 ring-1 ring-indigo-400/30'
                                  : idx < activeStateIdx
                                    ? 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600/60 dark:text-zinc-400/60 border-border/30'
                                    : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600/30 dark:text-zinc-400/30 border-border/20'
                              }`}
                            >
                              {state}
                            </Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-400 mb-1.5 flex items-center gap-1">
                        <Server className="h-3.5 w-3.5" /> Server States
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        {serverStates.map((state, idx) => (
                          <span key={`sst-${idx}`} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-zinc-600/40 dark:text-zinc-400/40 text-[10px]">&rarr;</span>}
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-mono transition-all duration-300 ${
                                idx === activeStateIdx
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 ring-1 ring-emerald-400/30'
                                  : idx < activeStateIdx
                                    ? 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600/60 dark:text-zinc-400/60 border-border/30'
                                    : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600/30 dark:text-zinc-400/30 border-border/20'
                              }`}
                            >
                              {state}
                            </Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SimulationCanvas>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground text-sm">What Is This?</h3>
            <p className="text-sm text-zinc-900 dark:text-zinc-200 leading-relaxed">
              TCP uses a handshake to synchronize both endpoints before data transfer. Sequence and ACK numbers ensure both sides
              agree on ordering, reliability, and connection state transitions.
            </p>
          </div>

          {activeHint && (
            <div className="rounded-md border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-2">
              <p className="text-sm text-zinc-900 dark:text-zinc-200">
                <span className="font-semibold text-foreground">Current scenario focus:</span> {activeHint}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Key Concepts</p>
            <div className="space-y-1.5 text-sm text-zinc-900 dark:text-zinc-200">
              <p><span className="font-semibold text-indigo-400">SYN</span>: request to start a connection.</p>
              <p><span className="font-semibold text-emerald-400">SYN-ACK</span>: acknowledges SYN and advertises server sequence start.</p>
              <p><span className="font-semibold text-amber-400">ACK</span>: confirms the other side's sequence progression.</p>
              <p><span className="font-semibold text-red-400">RST</span>: immediate connection rejection.</p>
              <p><span className="font-semibold text-orange-400">FIN</span>: graceful close signal for one direction.</p>
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-2">
            <p className="text-sm text-zinc-900 dark:text-zinc-200">
              <strong className="text-foreground">Try this:</strong> compare "Normal Handshake" vs "Connection Teardown" to see why open is 3 steps but close can be 4.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper ---

function getArrowColor(type: MessageType): string {
  const map: Record<MessageType, string> = {
    SYN: '#818cf8',       // indigo-400
    'SYN-ACK': '#34d399', // emerald-400
    ACK: '#fbbf24',       // amber-400
    RST: '#f87171',       // red-400
    FIN: '#fb923c',       // orange-400
    TIMEOUT: '#a1a1aa',   // muted
  };
  return map[type];
}




