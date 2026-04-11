import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarGhostButtonClass,
  toolbarPrimaryButtonClass,
  toolbarSecondaryButtonClass,
  toolbarSelectClass,
  toolbarToggleButtonClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';
import {
  ArrowDown,
  ArrowUp,
  StepForward,
  RotateCcw,
  Info,
  Layers,
  Play,
  Pause,
} from 'lucide-react';

// --- Types ---

type Direction = 'encapsulate' | 'decapsulate';
type ScenarioId = 'http' | 'dns' | 'icmp';
type ContentTab = 'simulation' | 'theory';

interface HeaderField {
  label: string;
  value: string;
}

interface LayerInfo {
  id: string;
  name: string;
  pduName: string;
  headerSize: number;
  trailerSize?: number;
  color: {
    border: string;
    bg: string;
    text: string;
    badge: string;
  };
  headerFields: HeaderField[];
}

interface Scenario {
  id: ScenarioId;
  name: string;
  hint: string;
  appData: string;
  appDataSize: number;
  layers: LayerInfo[];
  narrations: string[];
}

const ENCAPSULATION_LESSON_META: Record<ScenarioId, Omit<SimulationLesson, 'steps'>> = {
  http: {
    intro: 'This scenario teaches how a web request is wrapped layer by layer before it leaves your computer.',
    focus: 'Watch each layer add its own header. Each header solves a different problem.',
    glossary: [
      { term: 'Header', definition: 'Extra control information placed in front of the real data.' },
      { term: 'PDU', definition: 'The name of the data unit at a specific network layer.' },
      { term: 'TCP', definition: 'The transport protocol that adds reliability and port numbers.' },
      { term: 'Ethernet Frame', definition: 'The data-link layer unit sent on the local network.' },
    ],
    takeaway: 'Encapsulation means each layer wraps the data so lower layers can carry it across the network.',
    commonMistake: 'Students often think the application sends frames directly. It does not. Lower layers add the transport, network, and link information.',
    nextObservation: 'Notice that the real payload stays the same while the surrounding control information changes by layer.',
  },
  dns: {
    intro: 'This scenario teaches how a DNS query is packaged for the network.',
    focus: 'Compare this with the HTTP example and notice that DNS usually uses UDP, which has a smaller transport header.',
    glossary: [
      { term: 'UDP', definition: 'A lightweight transport protocol with a smaller header than TCP.' },
      { term: 'DNS Query', definition: 'A request asking for the IP address of a domain name.' },
      { term: 'Overhead', definition: 'The extra bytes added by headers and trailers.' },
      { term: 'Default Gateway', definition: 'The local router that forwards traffic to other networks.' },
    ],
    takeaway: 'Different applications can use different transport behavior, but they still rely on encapsulation to travel across the network.',
    commonMistake: 'Beginners sometimes think every internet application uses TCP. DNS often uses UDP because the exchange is short and simple.',
    nextObservation: 'Small messages can have surprisingly high overhead because the headers still need to be added.',
  },
  icmp: {
    intro: 'This scenario teaches that not every message uses a transport header. Ping works with ICMP at the network layer.',
    focus: 'Notice that the transport layer is skipped, but IP and Ethernet still wrap the message for delivery.',
    glossary: [
      { term: 'ICMP', definition: 'A network-layer protocol used for control and diagnostic messages such as ping.' },
      { term: 'Ping', definition: 'A simple test that checks whether another host can be reached.' },
      { term: 'Network Layer', definition: 'The layer that handles IP addressing and routing.' },
      { term: 'Decapsulation', definition: 'Removing headers as the packet moves up the stack at the receiver.' },
    ],
    takeaway: 'Encapsulation is flexible. Some protocols skip layers, but the packet still needs enough information to cross the network.',
    commonMistake: 'Skipping the transport layer does not mean the packet is sent raw. IP and Ethernet still do important work.',
    nextObservation: 'Compare the ICMP stack with HTTP and DNS to see how different protocols use the layers differently.',
  },
};

// --- Color config per layer ---

const LAYER_COLORS = {
  application: {
    border: 'ring-1 ring-indigo-500/40',
    bg: 'bg-indigo-500/25',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-300',
  },
  transport: {
    border: 'ring-1 ring-amber-500/40',
    bg: 'bg-amber-500/25',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
  },
  network: {
    border: 'ring-1 ring-emerald-500/40',
    bg: 'bg-emerald-500/25',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
  datalink: {
    border: 'ring-1 ring-purple-500/40',
    bg: 'bg-purple-500/25',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
  },
  data: {
    border: 'ring-1 ring-muted-foreground/30',
    bg: 'bg-muted/30',
    text: 'text-zinc-600 dark:text-zinc-400',
    badge: 'bg-muted/40 text-zinc-600 dark:text-zinc-400',
  },
};

// --- Scenarios ---

const SCENARIOS: Scenario[] = [
  {
    id: 'http',
    name: 'HTTP Web Request',
    hint: 'Watch your web request get wrapped: HTTP \u2192 TCP \u2192 IP \u2192 Ethernet. Each layer adds its own header.',
    appData: 'GET / HTTP/1.1\\r\\nHost: www.example.com',
    appDataSize: 50,
    layers: [
      {
        id: 'application',
        name: 'Application Layer',
        pduName: 'Data / Message',
        headerSize: 0,
        color: LAYER_COLORS.application,
        headerFields: [
          { label: 'Protocol', value: 'HTTP/1.1' },
          { label: 'Method', value: 'GET' },
          { label: 'Host', value: 'www.example.com' },
          { label: 'Payload', value: 'GET / HTTP/1.1\\r\\nHost: www.example.com' },
        ],
      },
      {
        id: 'transport',
        name: 'Transport Layer (TCP)',
        pduName: 'Segment',
        headerSize: 20,
        color: LAYER_COLORS.transport,
        headerFields: [
          { label: 'Src Port', value: '49152' },
          { label: 'Dst Port', value: '80' },
          { label: 'Sequence #', value: '1001' },
          { label: 'Ack #', value: '5001' },
          { label: 'Flags', value: 'PSH, ACK' },
          { label: 'Window Size', value: '65535' },
        ],
      },
      {
        id: 'network',
        name: 'Network Layer (IP)',
        pduName: 'Packet',
        headerSize: 20,
        color: LAYER_COLORS.network,
        headerFields: [
          { label: 'Version', value: '4 (IPv4)' },
          { label: 'Src IP', value: '192.168.1.5' },
          { label: 'Dst IP', value: '93.184.216.34' },
          { label: 'Protocol', value: '6 (TCP)' },
          { label: 'TTL', value: '64' },
          { label: 'Total Length', value: '90 bytes' },
        ],
      },
      {
        id: 'datalink',
        name: 'Data Link Layer (Ethernet)',
        pduName: 'Frame',
        headerSize: 14,
        trailerSize: 4,
        color: LAYER_COLORS.datalink,
        headerFields: [
          { label: 'Src MAC', value: 'AA:BB:CC:11:22:33' },
          { label: 'Dst MAC', value: 'DD:EE:FF:44:55:66' },
          { label: 'EtherType', value: '0x0800 (IPv4)' },
          { label: 'FCS (Trailer)', value: '0x3A2B1C4D' },
        ],
      },
    ],
    narrations: [
      'Your application creates the data: an HTTP GET request for www.example.com. This is the payload \u2014 the actual information you want to send.',
      'The Transport Layer (TCP) adds a 20-byte header: source port 49152, destination port 80 (HTTP). This identifies which application on each machine should handle the data. The segment also includes sequence numbers for reliable delivery.',
      'The Network Layer (IP) adds a 20-byte header: source IP 192.168.1.5, destination IP 93.184.216.34. This is how routers know where to forward the packet across the internet.',
      'The Data Link Layer (Ethernet) adds a 14-byte header and 4-byte trailer (FCS): source and destination MAC addresses for the local network hop, plus a checksum to detect transmission errors. The complete frame is ready for the wire!',
      'The complete frame is ready to be sent on the wire! Total overhead: 58 bytes of headers for 50 bytes of data (54% overhead).',
    ],
  },
  {
    id: 'dns',
    name: 'DNS Query',
    hint: 'DNS uses UDP instead of TCP \u2014 notice the difference in the transport layer header.',
    appData: 'Query: www.example.com (Type A)',
    appDataSize: 45,
    layers: [
      {
        id: 'application',
        name: 'Application Layer',
        pduName: 'Data / Message',
        headerSize: 0,
        color: LAYER_COLORS.application,
        headerFields: [
          { label: 'Protocol', value: 'DNS' },
          { label: 'Query Type', value: 'A (IPv4 Address)' },
          { label: 'Query Name', value: 'www.example.com' },
          { label: 'Transaction ID', value: '0xA1B2' },
        ],
      },
      {
        id: 'transport',
        name: 'Transport Layer (UDP)',
        pduName: 'Datagram',
        headerSize: 8,
        color: LAYER_COLORS.transport,
        headerFields: [
          { label: 'Src Port', value: '51234' },
          { label: 'Dst Port', value: '53' },
          { label: 'Length', value: '53 bytes' },
          { label: 'Checksum', value: '0xF1E2' },
        ],
      },
      {
        id: 'network',
        name: 'Network Layer (IP)',
        pduName: 'Packet',
        headerSize: 20,
        color: LAYER_COLORS.network,
        headerFields: [
          { label: 'Version', value: '4 (IPv4)' },
          { label: 'Src IP', value: '192.168.1.5' },
          { label: 'Dst IP', value: '8.8.8.8' },
          { label: 'Protocol', value: '17 (UDP)' },
          { label: 'TTL', value: '64' },
          { label: 'Total Length', value: '73 bytes' },
        ],
      },
      {
        id: 'datalink',
        name: 'Data Link Layer (Ethernet)',
        pduName: 'Frame',
        headerSize: 14,
        trailerSize: 4,
        color: LAYER_COLORS.datalink,
        headerFields: [
          { label: 'Src MAC', value: 'AA:BB:CC:11:22:33' },
          { label: 'Dst MAC', value: '00:1A:2B:3C:4D:5E' },
          { label: 'EtherType', value: '0x0800 (IPv4)' },
          { label: 'FCS (Trailer)', value: '0x7E8F9A0B' },
        ],
      },
    ],
    narrations: [
      'Your application creates a DNS query to resolve www.example.com into an IP address. DNS is like the phone book of the internet.',
      'The Transport Layer (UDP) adds an 8-byte header: source port 51234, destination port 53 (DNS). Notice UDP\u2019s header is much smaller than TCP\u2019s (8 vs 20 bytes) \u2014 no sequence numbers, no connection setup. DNS uses UDP because queries are small and speed matters.',
      'The Network Layer (IP) adds a 20-byte header: source IP 192.168.1.5, destination IP 8.8.8.8 (Google\u2019s public DNS). The protocol field is 17 for UDP (vs 6 for TCP).',
      'The Data Link Layer (Ethernet) adds a 14-byte header and 4-byte FCS trailer. The destination MAC is your default gateway\u2019s router \u2014 since Google DNS is on a different network, the frame goes to your router first.',
      'The complete frame is ready! Total overhead: 46 bytes of headers for 45 bytes of data (51% overhead). For small DNS queries, overhead is nearly equal to the payload!',
    ],
  },
  {
    id: 'icmp',
    name: 'Ping (ICMP)',
    hint: 'ICMP sits at the network layer \u2014 there\u2019s no transport layer header! Compare with the HTTP example.',
    appData: 'Echo Request (ping)',
    appDataSize: 40,
    layers: [
      {
        id: 'application',
        name: 'Application Layer',
        pduName: 'Data / Message',
        headerSize: 0,
        color: LAYER_COLORS.application,
        headerFields: [
          { label: 'Protocol', value: 'ICMP' },
          { label: 'Type', value: '8 (Echo Request)' },
          { label: 'Code', value: '0' },
          { label: 'Payload', value: '32 bytes of padding data' },
        ],
      },
      {
        id: 'network',
        name: 'Network Layer (IP + ICMP)',
        pduName: 'Packet',
        headerSize: 28,
        color: LAYER_COLORS.network,
        headerFields: [
          { label: 'Version', value: '4 (IPv4)' },
          { label: 'Src IP', value: '192.168.1.5' },
          { label: 'Dst IP', value: '93.184.216.34' },
          { label: 'Protocol', value: '1 (ICMP)' },
          { label: 'TTL', value: '64' },
          { label: 'ICMP Type', value: '8 (Echo Request)' },
          { label: 'ICMP Checksum', value: '0x4D5E' },
          { label: 'Total Length', value: '68 bytes' },
        ],
      },
      {
        id: 'datalink',
        name: 'Data Link Layer (Ethernet)',
        pduName: 'Frame',
        headerSize: 14,
        trailerSize: 4,
        color: LAYER_COLORS.datalink,
        headerFields: [
          { label: 'Src MAC', value: 'AA:BB:CC:11:22:33' },
          { label: 'Dst MAC', value: 'DD:EE:FF:44:55:66' },
          { label: 'EtherType', value: '0x0800 (IPv4)' },
          { label: 'FCS (Trailer)', value: '0xC3D4E5F6' },
        ],
      },
    ],
    narrations: [
      'Your application creates an ICMP Echo Request \u2014 the classic "ping" command. ICMP is a network-layer protocol, so there\u2019s no transport layer involved!',
      'The Network Layer adds an IP header (20 bytes) plus the ICMP header (8 bytes). Notice there\u2019s NO transport layer (no TCP/UDP) \u2014 ICMP operates directly at the network layer. The protocol field is 1 (ICMP).',
      'The Data Link Layer (Ethernet) adds its 14-byte header and 4-byte FCS trailer. Same as before \u2014 the data link layer doesn\u2019t care what\u2019s inside the payload.',
      'The complete frame is ready! Only 46 bytes of overhead for a 40-byte ping payload. Notice the frame has fewer layers than HTTP because ICMP skips the transport layer entirely.',
    ],
  },
];

// --- Helper: compute cumulative sizes ---

function computeSizes(scenario: Scenario): number[] {
  const sizes: number[] = [scenario.appDataSize];
  let running = scenario.appDataSize;
  for (let i = 1; i < scenario.layers.length; i++) {
    const layer = scenario.layers[i];
    running += layer.headerSize + (layer.trailerSize ?? 0);
    sizes.push(running);
  }
  return sizes;
}

// --- Component ---

export const EncapsulationSimulator = ({ onStepChange }: SimulatorStepProps) => {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<Direction>('encapsulate');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('simulation');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = SCENARIOS[scenarioIdx];
  const totalLayers = scenario.layers.length;
  const sizes = computeSizes(scenario);

  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  // The visible layers depend on step + direction
  const visibleCount =
    direction === 'encapsulate' ? currentStep + 1 : totalLayers - currentStep;

  const maxStep = totalLayers - 1;

  // Current narration index
  const narrationIdx =
    direction === 'encapsulate' ? currentStep : totalLayers - 1 - currentStep;
  const coachLesson: SimulationLesson = {
    ...ENCAPSULATION_LESSON_META[scenario.id],
    steps: scenario.narrations.map((narration, index) => ({
      title: index < scenario.layers.length
        ? scenario.layers[index].name
        : 'Complete Frame',
      explanation: narration,
      whatToNotice: index < scenario.layers.length
        ? `${scenario.layers[index].pduName} at this step adds ${scenario.layers[index].headerSize + (scenario.layers[index].trailerSize ?? 0)} bytes of control information.`
        : 'The payload is ready for transmission because all required wrapping information is now present.',
      whyItMatters: index === 0
        ? 'The application creates the message, but it cannot cross the network alone.'
        : index < scenario.layers.length
          ? `${scenario.layers[index].name} solves a different delivery problem than the layers above it.`
          : 'This is the full packet format that can be transmitted on the local link.',
    })),
  };

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, maxStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handleScenarioChange = useCallback((idx: number) => {
    setScenarioIdx(idx);
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handleDirectionToggle = useCallback(() => {
    setDirection((d) => (d === 'encapsulate' ? 'decapsulate' : 'encapsulate'));
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  // Build the ordered layers to display based on direction
  const orderedLayers =
    direction === 'encapsulate'
      ? scenario.layers.slice(0, visibleCount)
      : scenario.layers.slice(totalLayers - visibleCount);

  // For the nested box visual, we always render outermost first (reverse of orderedLayers for encapsulation)
  // Actually, for the nested visual, outermost layer wraps inner layers.
  // In encapsulation step 0: just app layer. step 1: transport wraps app. step 2: network wraps transport+app, etc.
  // So the visual order from outside-in is: orderedLayers reversed.
  const nestLayers =
    direction === 'encapsulate'
      ? [...orderedLayers].reverse()
      : [...orderedLayers];

  // Current active layer (the one just added)
  const activeLayer =
    direction === 'encapsulate'
      ? scenario.layers[currentStep]
      : scenario.layers[totalLayers - 1 - currentStep];

  // Size info
  const currentSizeIdx =
    direction === 'encapsulate' ? currentStep : totalLayers - 1 - currentStep;

  // Render nested box diagram
  const renderNestedBoxes = () => {
    if (nestLayers.length === 0) return null;

    // Build from innermost out
    const innerFirst =
      direction === 'encapsulate'
        ? orderedLayers
        : [...orderedLayers].reverse();

    let content: React.ReactNode = null;

    for (let i = 0; i < innerFirst.length; i++) {
      const layer = innerFirst[i];
      const isInnermost = i === 0;
      const isOutermost = i === innerFirst.length - 1;
      const isNewlyAdded = layer.id === activeLayer.id;

      if (isInnermost) {
        // The innermost layer: shows the data text
        content = (
          <div
            key={layer.id}
            className={`
              relative rounded-lg ${layer.color.border} ${layer.color.bg}
              p-3 transition-all duration-500 ease-out
              ${isNewlyAdded ? 'animate-in fade-in zoom-in-95 duration-500' : ''}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${layer.color.text}`}>
                {layer.id === 'application' ? 'Application Data' : layer.name}
              </span>
              <Badge variant="outline" className={`text-[10px] ${layer.color.badge}`}>
                {layer.pduName}
              </Badge>
            </div>
            <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400 break-all">
              {scenario.appData}
            </div>
          </div>
        );
      } else {
        // Wrapping layer
        const hasTrailer = layer.trailerSize && layer.trailerSize > 0;
        content = (
          <div
            key={layer.id}
            className={`
              relative rounded-xl ${layer.color.border} ${layer.color.bg}
              transition-all duration-500 ease-out
              ${isNewlyAdded ? 'animate-in fade-in zoom-in-95 duration-500' : ''}
            `}
          >
            {/* Header label on the left */}
            <div className="flex items-stretch">
              <div
                className={`
                  flex flex-col items-center justify-center px-3 py-2
                  min-w-[70px] bg-black/10
                `}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${layer.color.text}`}>
                  {layer.id === 'datalink' ? 'Eth Hdr' : layer.id === 'network' ? 'IP Hdr' : layer.id === 'transport' ? (scenario.id === 'dns' ? 'UDP Hdr' : 'TCP Hdr') : 'Hdr'}
                </span>
                <span className={`text-[9px] ${layer.color.text} opacity-70`}>
                  {layer.headerSize}B
                </span>
              </div>

              {/* Inner content */}
              <div className="flex-1 p-2">
                {content}
              </div>

              {/* Trailer (FCS) for data link */}
              {hasTrailer && (
                <div
                  className={`
                    flex flex-col items-center justify-center px-3 py-2
                    min-w-[55px] bg-black/10
                  `}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${layer.color.text}`}>
                    FCS
                  </span>
                  <span className={`text-[9px] ${layer.color.text} opacity-70`}>
                    {layer.trailerSize}B
                  </span>
                </div>
              )}
            </div>

            {/* Layer label */}
            {isOutermost && (
              <div className={`absolute -top-3 left-3 px-2 text-[10px] font-semibold uppercase tracking-wider ${layer.color.text} ${layer.color.bg} rounded`}>
                {layer.name}
              </div>
            )}
          </div>
        );
      }
    }

    return content;
  };

  // Size bar visualization
  const renderSizeBar = () => {
    const maxSize = sizes[sizes.length - 1];
    const segments: { label: string; size: number; color: string }[] = [];

    // App data always present
    segments.push({
      label: 'Data',
      size: scenario.appDataSize,
      color: 'bg-indigo-500/60',
    });

    const layerColors: Record<string, string> = {
      transport: 'bg-amber-500/60',
      network: 'bg-emerald-500/60',
      datalink: 'bg-purple-500/60',
    };

    // Add visible header segments
    for (let i = 1; i < orderedLayers.length; i++) {
      const layer = orderedLayers[i];
      segments.push({
        label: layer.id === 'datalink' ? 'Eth+FCS' : layer.id === 'network' ? 'IP' : scenario.id === 'dns' ? 'UDP' : layer.id === 'transport' ? 'TCP' : layer.name,
        size: layer.headerSize + (layer.trailerSize ?? 0),
        color: layerColors[layer.id] ?? 'bg-gray-500/60',
      });
    }

    const currentTotal = sizes[currentSizeIdx];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <span>Frame Size</span>
          <span className="font-mono font-bold text-foreground">{currentTotal} bytes</span>
        </div>
        <div className="relative flex h-7 overflow-hidden rounded-full border border-border bg-muted/50">
          {segments.map((seg, i) => {
            const widthPct = Math.max((seg.size / maxSize) * 100, 8);
            return (
              <div
                key={i}
                className={`${seg.color} flex items-center justify-center transition-all duration-500 ease-out shadow-[inset_-1px_0_0_rgba(0,0,0,0.28)] last:shadow-none`}
                style={{ width: `${widthPct}%` }}
              >
                <span className="text-[9px] font-bold text-white drop-shadow truncate px-1">
                  {seg.label} ({seg.size}B)
                </span>
              </div>
            );
          })}
        </div>
        {/* Size breakdown text */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          {currentStep === 0 && direction === 'encapsulate' && (
            <span>Application data: <span className="font-mono text-foreground">{scenario.appDataSize} bytes</span></span>
          )}
          {currentStep > 0 && direction === 'encapsulate' && (
            <span>
              + {activeLayer.id === 'datalink' ? 'Ethernet header + FCS' : `${activeLayer.name.split('(')[1]?.replace(')', '') ?? activeLayer.name} header`}:{' '}
              <span className="font-mono text-foreground">
                +{activeLayer.headerSize + (activeLayer.trailerSize ?? 0)} bytes = {currentTotal} bytes
              </span>
            </span>
          )}
          {direction === 'decapsulate' && (
            <span>Remaining after stripping: <span className="font-mono text-foreground">{currentTotal} bytes</span></span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Packet Encapsulation Simulator</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Follow how transport, network, and link headers wrap application data into a frame.
        </p>
      </div>

      <div className="flex w-fit rounded-lg border border-border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('simulation')}
          className={`transition-colors ${
            activeTab === 'simulation'
              ? 'rounded-md border border-border bg-background px-4 py-1.5 text-foreground shadow-sm'
              : 'px-4 py-1.5 text-muted-foreground hover:text-foreground'
          }`}
        >
          Simulation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('theory')}
          className={`transition-colors ${
            activeTab === 'theory'
              ? 'rounded-md border border-border bg-background px-4 py-1.5 text-foreground shadow-sm'
              : 'px-4 py-1.5 text-muted-foreground hover:text-foreground'
          }`}
        >
          Learn More
        </button>
      </div>

      {activeTab === 'simulation' ? (
        <div className="space-y-3">
          <SimulatorToolbar
            label="Simulation Controls"
            status={
              <Badge variant="outline" className="border-border bg-background/80 text-xs text-foreground">
                Step {currentStep + 1} / {totalLayers}
              </Badge>
            }
          >
            <div className={toolbarControlGroupClass}>
                <label htmlFor="encapsulation-scenario" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Scenario
                </label>
                <select
                  id="encapsulation-scenario"
                  value={scenarioIdx}
                  onChange={(event) => handleScenarioChange(Number(event.target.value))}
                  className={`${toolbarSelectClass} min-w-[200px]`}
                >
                  {SCENARIOS.map((scenarioOption, idx) => (
                    <option key={scenarioOption.id} value={idx}>
                      {scenarioOption.name}
                    </option>
                  ))}
                </select>
              </div>

            <div className={toolbarControlGroupClass}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                  disabled={currentStep <= 0 || isPlaying}
                  className={toolbarSecondaryButtonClass}
                >
                  <StepForward className="w-3.5 h-3.5 rotate-180 mr-1" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (isPlaying) {
                      setIsPlaying(false);
                    } else {
                      if (currentStep >= maxStep) setCurrentStep(0);
                      setIsPlaying(true);
                    }
                  }}
                  className={toolbarPrimaryButtonClass}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  {isPlaying ? 'Pause' : 'Auto-play'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep((s) => Math.min(maxStep, s + 1))}
                  disabled={currentStep >= maxStep || isPlaying}
                  className={toolbarSecondaryButtonClass}
                >
                  Next
                  <StepForward className="w-3.5 h-3.5 ml-1" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset} className={toolbarGhostButtonClass}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
                <Button
                  variant={direction === 'encapsulate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleDirectionToggle}
                  className={`text-xs ${toolbarToggleButtonClass(direction === 'encapsulate')}`}
                >
                  {direction === 'encapsulate' ? (
                    <>
                      <ArrowDown className="w-3.5 h-3.5 mr-1" />
                      Encapsulate
                    </>
                  ) : (
                    <>
                      <ArrowUp className="w-3.5 h-3.5 mr-1" />
                      Decapsulate
                    </>
                  )}
                </Button>
            </div>
          </SimulatorToolbar>

          <SimulationCanvas
            isLive={isPlaying}
            statusMode="terminal"
            isComplete={currentStep >= maxStep}
            coachPanel={(
              <SimulationCoachPanel
                lesson={coachLesson}
                currentStep={narrationIdx}
                isComplete={currentStep >= maxStep}
              />
            )}
          >
            <div className="space-y-4">
              <p className="text-sm italic text-zinc-900 dark:text-zinc-200">
                {scenario.narrations[narrationIdx] ?? scenario.narrations[scenario.narrations.length - 1]}
              </p>

              <div className="flex items-center gap-1.5">
                {scenario.layers.map((layer, i) => {
                  const isActive = direction === 'encapsulate' ? i <= currentStep : i >= totalLayers - 1 - currentStep;
                  const isCurrent = i === (direction === 'encapsulate' ? currentStep : totalLayers - 1 - currentStep);
                  return (
                    <button
                      key={layer.id}
                      onClick={() => {
                        const step = direction === 'encapsulate' ? i : totalLayers - 1 - i;
                        setCurrentStep(Math.max(0, Math.min(maxStep, step)));
                      }}
                      className={`
                        h-2 rounded-full transition-all duration-300
                        ${isCurrent ? 'w-8' : 'w-5'}
                        ${isActive ? (
                          layer.id === 'application' ? 'bg-indigo-500' :
                          layer.id === 'transport' ? 'bg-amber-500' :
                          layer.id === 'network' ? 'bg-emerald-500' :
                          'bg-purple-500'
                        ) : 'bg-muted/40'}
                      `}
                      title={layer.name}
                    />
                  );
                })}
              </div>

              <section className="space-y-4 py-2">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    {direction === 'encapsulate' ? 'Encapsulation' : 'Decapsulation'} &mdash; Nested View
                  </span>
                </div>
                <div className="transition-all duration-500">
                  {renderNestedBoxes()}
                </div>
              </section>

              <section className="py-2">
                {renderSizeBar()}
              </section>

              <section className="space-y-3 py-2">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    Header Details &mdash; {activeLayer.name}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${activeLayer.color.badge}`}>
                    {activeLayer.pduName}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeLayer.headerFields.map((field) => (
                    <div
                      key={field.label}
                      className={`rounded-lg ${activeLayer.color.border} ${activeLayer.color.bg} px-3 py-2`}
                    >
                      <div className={`text-[10px] font-semibold uppercase tracking-wider ${activeLayer.color.text} mb-0.5`}>
                        {field.label}
                      </div>
                      <div className="text-xs font-mono text-foreground truncate" title={field.value}>
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </SimulationCanvas>
        </div>
      ) : (
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground text-sm">What Is This?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Encapsulation wraps application data with transport, network, and link-layer headers. Decapsulation performs the reverse at the receiver.
            </p>
          </div>

          <div className="pl-3">
            <p className="text-sm text-zinc-900 dark:text-zinc-200">
              <span className="font-semibold text-foreground">Current scenario focus:</span> {scenario.hint}
            </p>
          </div>

          <div className="space-y-3 text-sm text-zinc-900 dark:text-zinc-200">
            <p><span className="font-semibold text-foreground">PDU naming:</span> Data/Message to Segment/Datagram to Packet to Frame.</p>
            <p><span className="font-semibold text-foreground">Header purpose:</span> each layer adds routing/control fields needed for its function.</p>
            <p><span className="font-semibold text-foreground">Overhead:</span> smaller payloads can have high percentage overhead from headers.</p>
          </div>

          <div className="pl-3">
            <p className="text-sm text-zinc-900 dark:text-zinc-200">
              <strong className="text-foreground">Try this:</strong> compare HTTP (TCP), DNS (UDP), and ICMP scenarios to see how layer stacks differ.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};



