import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarGhostButtonClass,
  toolbarInputClass,
  toolbarPrimaryButtonClass,
  toolbarSecondaryButtonClass,
  toolbarSelectClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Monitor,
  Server,
  Globe,
  Lightbulb,
} from 'lucide-react';

// --- Types ---

type MessageType = 'query' | 'response' | 'referral' | 'error';
type EntityId = 'client' | 'localDns' | 'rootDns' | 'tldDns' | 'authDns';
type ContentTab = 'simulation' | 'theory';

interface Step {
  from: EntityId;
  to: EntityId;
  messageLabel: string;
  messageType: MessageType;
  narration: string;
}

interface Scenario {
  id: string;
  name: string;
  hint: string;
  steps: Step[];
}

// --- Color map ---

const MESSAGE_COLORS: Record<MessageType, string> = {
  query: 'text-indigo-400 border-indigo-400/60 bg-indigo-500/10',
  response: 'text-emerald-400 border-emerald-400/60 bg-emerald-500/10',
  referral: 'text-amber-400 border-amber-400/60 bg-amber-500/10',
  error: 'text-red-400 border-red-400/60 bg-red-500/10',
};

const ARROW_COLORS: Record<MessageType, string> = {
  query: 'stroke-indigo-400',
  response: 'stroke-emerald-400',
  referral: 'stroke-amber-400',
  error: 'stroke-red-400',
};

const LABEL_BG: Record<MessageType, string> = {
  query: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
  response: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  referral: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  error: 'bg-red-500/20 text-red-300 border-red-400/40',
};

// --- Entity positions (percentages) ---

interface EntityDef {
  id: EntityId;
  label: string;
  sublabel?: string;
  x: number; // % from left
  y: number; // % from top
  icon: 'monitor' | 'server' | 'globe';
}

const ENTITIES: EntityDef[] = [
  { id: 'client', label: 'Client', x: 8, y: 78, icon: 'monitor' },
  { id: 'localDns', label: 'Local DNS Resolver', x: 38, y: 78, icon: 'server' },
  { id: 'rootDns', label: 'Root DNS Server', sublabel: '.', x: 38, y: 8, icon: 'globe' },
  { id: 'tldDns', label: 'TLD DNS Server', sublabel: '.com', x: 72, y: 8, icon: 'globe' },
  { id: 'authDns', label: 'Authoritative DNS', sublabel: 'example.com', x: 72, y: 45, icon: 'server' },
];

function getEntityPos(id: EntityId): { x: number; y: number } {
  const e = ENTITIES.find((ent) => ent.id === id);
  return e ? { x: e.x, y: e.y } : { x: 50, y: 50 };
}

// --- Helper to build scenario steps with domain replacement ---

function buildRecursiveSteps(domain: string): Step[] {
  const parts = domain.split('.');
  const tld = parts.length >= 2 ? `.${parts[parts.length - 1]}` : '.com';
  const authZone = parts.length >= 2 ? parts.slice(-2).join('.') : domain;
  return [
    {
      from: 'client',
      to: 'localDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The client asks the Local DNS Resolver: "What's the IP address for ${domain}?"`,
    },
    {
      from: 'localDns',
      to: 'rootDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver doesn't know the answer, so it asks the Root DNS Server (.) for help.`,
    },
    {
      from: 'rootDns',
      to: 'localDns',
      messageLabel: `Referral: ask ${tld} TLD`,
      messageType: 'referral',
      narration: `The Root Server says: "I don't know, but the ${tld} TLD server might -- try asking them."`,
    },
    {
      from: 'localDns',
      to: 'tldDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver follows the referral and asks the ${tld} TLD Server.`,
    },
    {
      from: 'tldDns',
      to: 'localDns',
      messageLabel: `Referral: ask ${authZone}`,
      messageType: 'referral',
      narration: `The TLD Server says: "The authoritative server for ${authZone} knows -- ask them."`,
    },
    {
      from: 'localDns',
      to: 'authDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver asks the Authoritative Server for ${authZone}.`,
    },
    {
      from: 'authDns',
      to: 'localDns',
      messageLabel: `Response: 93.184.216.34`,
      messageType: 'response',
      narration: `The Authoritative Server responds: "${domain} = 93.184.216.34". The answer is found!`,
    },
    {
      from: 'localDns',
      to: 'client',
      messageLabel: `Response: 93.184.216.34`,
      messageType: 'response',
      narration: `The resolver caches this answer (for future queries) and sends it back to the client. Resolution complete!`,
    },
  ];
}

function buildIterativeSteps(domain: string): Step[] {
  const parts = domain.split('.');
  const tld = parts.length >= 2 ? `.${parts[parts.length - 1]}` : '.com';
  const authZone = parts.length >= 2 ? parts.slice(-2).join('.') : domain;
  return [
    {
      from: 'client',
      to: 'localDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The client asks the Local DNS Resolver: "What's the IP for ${domain}?"`,
    },
    {
      from: 'localDns',
      to: 'rootDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver queries the Root DNS Server. In iterative mode, it gets a referral back (not the final answer).`,
    },
    {
      from: 'rootDns',
      to: 'localDns',
      messageLabel: `Referral: try ${tld} TLD`,
      messageType: 'referral',
      narration: `Root Server replies with a referral: "Try asking the ${tld} TLD server instead." The resolver must follow up itself.`,
    },
    {
      from: 'localDns',
      to: 'tldDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver sends a new query to the ${tld} TLD Server, following the referral.`,
    },
    {
      from: 'tldDns',
      to: 'localDns',
      messageLabel: `Referral: try ${authZone}`,
      messageType: 'referral',
      narration: `The TLD Server responds with another referral: "The authoritative server for ${authZone} has the answer."`,
    },
    {
      from: 'localDns',
      to: 'authDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver follows the chain and queries the Authoritative Server for ${authZone}.`,
    },
    {
      from: 'authDns',
      to: 'localDns',
      messageLabel: `Response: 93.184.216.34`,
      messageType: 'response',
      narration: `The Authoritative Server replies with the final answer: "${domain} = 93.184.216.34".`,
    },
    {
      from: 'localDns',
      to: 'client',
      messageLabel: `Response: 93.184.216.34`,
      messageType: 'response',
      narration: `The resolver returns the IP to the client. Notice: the resolver did all the iterative work -- the client just waited.`,
    },
  ];
}

function buildCachedSteps(domain: string): Step[] {
  return [
    {
      from: 'client',
      to: 'localDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The client asks the Local DNS Resolver for ${domain}. But this time, the resolver already has the answer cached from a previous query!`,
    },
    {
      from: 'localDns',
      to: 'client',
      messageLabel: `Response: 93.184.216.34 (cached)`,
      messageType: 'response',
      narration: `The resolver instantly responds from cache -- no need to contact Root, TLD, or Authoritative servers. This is why DNS caching makes browsing faster!`,
    },
  ];
}

function buildNxdomainSteps(domain: string): Step[] {
  const parts = domain.split('.');
  const tld = parts.length >= 2 ? `.${parts[parts.length - 1]}` : '.com';
  const authZone = parts.length >= 2 ? parts.slice(-2).join('.') : domain;
  return [
    {
      from: 'client',
      to: 'localDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The client asks the Local DNS Resolver: "What's the IP for ${domain}?"`,
    },
    {
      from: 'localDns',
      to: 'rootDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver doesn't have it cached, so it starts the resolution chain with the Root Server.`,
    },
    {
      from: 'rootDns',
      to: 'localDns',
      messageLabel: `Referral: ask ${tld} TLD`,
      messageType: 'referral',
      narration: `Root Server refers the resolver to the ${tld} TLD server.`,
    },
    {
      from: 'localDns',
      to: 'tldDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver queries the ${tld} TLD Server.`,
    },
    {
      from: 'tldDns',
      to: 'localDns',
      messageLabel: `Referral: ask ${authZone}`,
      messageType: 'referral',
      narration: `The TLD Server refers the resolver to the authoritative server for ${authZone}.`,
    },
    {
      from: 'localDns',
      to: 'authDns',
      messageLabel: `Query: ${domain}?`,
      messageType: 'query',
      narration: `The resolver queries the Authoritative Server for ${authZone}.`,
    },
    {
      from: 'authDns',
      to: 'localDns',
      messageLabel: `NXDOMAIN`,
      messageType: 'error',
      narration: `The Authoritative Server responds with NXDOMAIN -- this domain does not exist! There is no DNS record for "${domain}".`,
    },
    {
      from: 'localDns',
      to: 'client',
      messageLabel: `Error: NXDOMAIN`,
      messageType: 'error',
      narration: `The resolver passes the NXDOMAIN error back to the client. The browser will show "This site can't be reached" or similar.`,
    },
  ];
}

// --- Default scenarios ---

const DEFAULT_DOMAIN = 'www.example.com';

function buildScenarios(domain: string): Scenario[] {
  return [
    {
      id: 'recursive',
      name: 'Recursive Query',
      hint: 'The local DNS resolver does all the work -- the client just waits for the final answer.',
      steps: buildRecursiveSteps(domain),
    },
    {
      id: 'iterative',
      name: 'Iterative Query',
      hint: 'The local resolver gets "try asking X instead" at each step and follows the chain itself.',
      steps: buildIterativeSteps(domain),
    },
    {
      id: 'cached',
      name: 'Cached Response',
      hint: 'The local DNS already has the answer from a previous query. Notice how much faster this is!',
      steps: buildCachedSteps(domain),
    },
    {
      id: 'nxdomain',
      name: 'NXDOMAIN (Not Found)',
      hint: "The authoritative server doesn't have a record for this domain -- NXDOMAIN is returned.",
      steps: buildNxdomainSteps(domain),
    },
  ];
}

// --- SVG Arrow ---

interface ArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string;
  messageType: MessageType;
  isActive: boolean;
  isPast: boolean;
}

const AnimatedArrow = ({ fromX, fromY, toX, toY, label, messageType, isActive, isPast }: ArrowProps) => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  // Shorten arrow by 30px on each end to not overlap entity boxes
  const shortenPx = 40;
  const ux = dx / len;
  const uy = dy / len;
  const x1 = fromX + ux * shortenPx;
  const y1 = fromY + uy * shortenPx;
  const x2 = toX - ux * shortenPx;
  const y2 = toY - uy * shortenPx;

  // Mid point for label
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Perpendicular offset for label so it doesn't sit on the line
  const perpX = -uy * 14;
  const perpY = ux * 14;

  const opacity = isActive ? 1 : isPast ? 0.35 : 0;

  return (
    <g
      className="transition-opacity duration-500"
      style={{ opacity }}
    >
      {/* Line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={ARROW_COLORS[messageType]}
        strokeWidth={isActive ? 2.5 : 1.5}
        markerEnd={`url(#arrowhead-${messageType})`}
      />
      {/* Label background */}
      <rect
        x={mx + perpX - (label.length * 3.5 + 8)}
        y={my + perpY - 10}
        width={label.length * 7 + 16}
        height={20}
        rx={4}
        fill="rgba(0,0,0,0.75)"
        stroke={
          messageType === 'query'
            ? 'rgba(129,140,248,0.4)'
            : messageType === 'response'
              ? 'rgba(52,211,153,0.4)'
              : messageType === 'referral'
                ? 'rgba(251,191,36,0.4)'
                : 'rgba(248,113,113,0.4)'
        }
        strokeWidth={1}
      />
      {/* Label text */}
      <text
        x={mx + perpX}
        y={my + perpY + 3}
        textAnchor="middle"
        className={`text-[10px] font-mono fill-current ${
          messageType === 'query'
            ? 'text-indigo-300'
            : messageType === 'response'
              ? 'text-emerald-300'
              : messageType === 'referral'
                ? 'text-amber-300'
                : 'text-red-300'
        }`}
      >
        {label}
      </text>
    </g>
  );
};

// --- Entity box component ---

const EntityBox = ({ entity, isHighlighted }: { entity: EntityDef; isHighlighted: boolean }) => {
  const IconComponent =
    entity.icon === 'monitor' ? Monitor : entity.icon === 'globe' ? Globe : Server;

  return (
    <div
      className={`absolute flex flex-col items-center gap-1 transition-all duration-300 -tranzinc-x-1/2 -tranzinc-y-1/2 ${
        isHighlighted ? 'scale-110' : 'scale-100'
      }`}
      style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
    >
      <div
        className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-all duration-300 ${
          isHighlighted
            ? 'border-primary/60 bg-primary/15 shadow-lg shadow-primary/10'
            : 'border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50'
        }`}
      >
        <IconComponent
          className={`h-5 w-5 ${
            isHighlighted ? 'text-primary' : 'text-zinc-600 dark:text-zinc-400'
          }`}
        />
        <span
          className={`text-[11px] font-semibold whitespace-nowrap ${
            isHighlighted ? 'text-foreground' : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          {entity.label}
        </span>
        {entity.sublabel && (
          <span className="text-[10px] font-mono text-zinc-600/70 dark:text-zinc-400/70">
            {entity.sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

export const DnsResolutionSimulator = ({ onStepChange }: SimulatorStepProps) => {
  const [domainInput, setDomainInput] = useState(DEFAULT_DOMAIN);
  const [scenarios, setScenarios] = useState(() => buildScenarios(DEFAULT_DOMAIN));
  const [activePreset, setActivePreset] = useState('recursive');
  const [activeHint, setActiveHint] = useState(buildScenarios(DEFAULT_DOMAIN)[0].hint);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('simulation');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 700, height: 420 });

  const scenario = scenarios.find((s) => s.id === activePreset) ?? scenarios[0];
  const totalSteps = scenario.steps.length;

  useEffect(() => {
    if (onStepChange && currentStep >= 0) {
      onStepChange(Math.min(currentStep, totalSteps - 1));
    }
  }, [currentStep, onStepChange, totalSteps]);

  // Narration
  const narration =
    currentStep < 0
      ? 'Choose a scenario above, then press Play or Step to begin.'
      : currentStep < totalSteps
        ? scenario.steps[currentStep].narration
        : 'Simulation complete! Try another scenario or reset to replay.';

  // Resize observer
  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
      const sc = scenarios.find((s) => s.id === id);
      if (sc) {
        setActivePreset(id);
        setActiveHint(sc.hint);
        setCurrentStep(-1);
      }
    },
    [stopAutoPlay, scenarios]
  );

  const applyDomain = useCallback(() => {
    const d = domainInput.trim() || DEFAULT_DOMAIN;
    const newScenarios = buildScenarios(d);
    setScenarios(newScenarios);
    const currentScenario = newScenarios.find((s) => s.id === activePreset);
    if (currentScenario) {
      setActiveHint(currentScenario.hint);
    }
    stopAutoPlay();
    setCurrentStep(-1);
  }, [domainInput, activePreset, stopAutoPlay]);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
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
      }, 1500);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, totalSteps, stopAutoPlay, currentStep]);

  // Determine which entities are highlighted (involved in current step)
  const highlightedEntities = new Set<EntityId>();
  if (currentStep >= 0 && currentStep < totalSteps) {
    highlightedEntities.add(scenario.steps[currentStep].from);
    highlightedEntities.add(scenario.steps[currentStep].to);
  }

  // Entity positions in pixels
  const entityPixelPos = (id: EntityId) => {
    const e = getEntityPos(id);
    return {
      x: (e.x / 100) * containerSize.width,
      y: (e.y / 100) * containerSize.height,
    };
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">DNS Resolution Simulator</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Visualize recursive and iterative DNS lookups from client query to final response.
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
          <SimulatorToolbar
            label="Simulation Controls"
            status={
              <Badge variant="outline" className="border-white/10 bg-transparent text-xs text-gray-300">
                Step {Math.max(0, currentStep + 1)} / {totalSteps}
              </Badge>
            }
          >
            <div className={toolbarControlGroupClass}>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Domain</label>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyDomain();
                  }}
                  placeholder="www.example.com"
                  className={`${toolbarInputClass} w-56`}
                />
                <Button size="sm" variant="outline" onClick={applyDomain} className={`text-xs ${toolbarSecondaryButtonClass}`}>Apply</Button>

                <label htmlFor="dns-scenario" className="ml-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Scenario</label>
                <select
                  id="dns-scenario"
                  value={activePreset}
                  onChange={(e) => selectPreset(e.target.value)}
                  className={`${toolbarSelectClass} min-w-[180px]`}
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

            <div className={toolbarControlGroupClass}>
                <Button size="sm" onClick={togglePlay} className={toolbarPrimaryButtonClass}>
                  {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={toolbarSecondaryButtonClass}
                  onClick={stepForward}
                  disabled={isPlaying || currentStep >= totalSteps}
                >
                  <StepForward className="h-4 w-4 mr-1" />
                  Step
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} className={toolbarGhostButtonClass}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
            </div>
          </SimulatorToolbar>

          <SimulationCanvas isLive={isPlaying}>
            <div className="space-y-3">
              <p className="text-sm italic text-zinc-900 dark:text-zinc-200">{narration}</p>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 overflow-hidden">
                <div ref={svgContainerRef} className="relative w-full" style={{ height: 420 }}>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                    <defs>
                      <marker id="arrowhead-query" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="rgb(129,140,248)" />
                      </marker>
                      <marker id="arrowhead-response" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="rgb(52,211,153)" />
                      </marker>
                      <marker id="arrowhead-referral" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="rgb(251,191,36)" />
                      </marker>
                      <marker id="arrowhead-error" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="rgb(248,113,113)" />
                      </marker>
                    </defs>
                    {scenario.steps.map((step, idx) => {
                      const fromPos = entityPixelPos(step.from);
                      const toPos = entityPixelPos(step.to);
                      return (
                        <AnimatedArrow
                          key={`arrow-${activePreset}-${idx}`}
                          fromX={fromPos.x}
                          fromY={fromPos.y}
                          toX={toPos.x}
                          toY={toPos.y}
                          label={step.messageLabel}
                          messageType={step.messageType}
                          isActive={idx === currentStep}
                          isPast={idx < currentStep}
                        />
                      );
                    })}
                  </svg>

                  {ENTITIES.map((entity) => (
                    <EntityBox
                      key={entity.id}
                      entity={entity}
                      isHighlighted={highlightedEntities.has(entity.id)}
                    />
                  ))}
                </div>
              </div>

              {currentStep >= 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Message Log</p>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.steps.map((step, idx) => {
                      if (idx > currentStep) return null;
                      return (
                        <div
                          key={`log-${idx}`}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-mono transition-all duration-300 ${
                            idx === currentStep
                              ? LABEL_BG[step.messageType]
                              : 'border-border/30 bg-muted/20 text-zinc-600/60 dark:text-zinc-400/60'
                          }`}
                        >
                          <span className="font-semibold">{idx + 1}.</span>
                          {step.messageLabel}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </SimulationCanvas>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground text-sm">What Is This?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              DNS translates human-readable names into IP addresses through a hierarchy: Root, TLD, and Authoritative servers.
              The resolver follows this chain and returns the final record to the client.
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
            <h4 className="text-sm font-semibold text-foreground">Key Concepts</h4>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><span className="font-semibold text-indigo-400">Recursive Query</span> - resolver does all lookup steps for the client.</li>
              <li><span className="font-semibold text-amber-400">Iterative Query</span> - resolver follows referrals one step at a time.</li>
              <li><span className="font-semibold text-emerald-400">Caching</span> - stored answers reduce later lookup latency.</li>
              <li><span className="font-semibold text-foreground">DNS Hierarchy</span> - Root to TLD to Authoritative.</li>
              <li><span className="font-semibold text-red-400">NXDOMAIN</span> - authoritative server confirms domain does not exist.</li>
            </ul>
          </div>

          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong className="text-foreground">Try this:</strong> Compare Recursive vs Iterative and track who sends each message.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};



