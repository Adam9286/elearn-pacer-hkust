import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import { ArpSimulator } from './simulations/ArpSimulator';
import { CwndSimulator } from './simulations/CwndSimulator';
import { DijkstraSimulator } from './simulations/DijkstraSimulator';
import { DistanceVectorSimulator } from './simulations/DistanceVectorSimulator';
import { DnsResolutionSimulator } from './simulations/DnsResolutionSimulator';
import { EncapsulationSimulator } from './simulations/EncapsulationSimulator';
import { GbnSrSimulator } from './simulations/GbnSrSimulator';
import { LearningSwitchSimulator } from './simulations/LearningSwitchSimulator';
import { LpmSimulator } from './simulations/LpmSimulator';
import { MplsSimulator } from './simulations/MplsSimulator';
import { PipeAckClockingSimulator } from './simulations/PipeAckClockingSimulator';
import { QueueManagementSimulator } from './simulations/QueueManagementSimulator';
import { SimulationHub } from './simulations/SimulationHub';
import { SimulationShell } from './simulations/SimulationShell';
import { SlidingWindowSimulator } from './simulations/SlidingWindowSimulator';
import { StpSimulator } from './simulations/StpSimulator';
import { SubnettingCalculator } from './simulations/SubnettingCalculator';
import { TcpHandshakeSimulator } from './simulations/TcpHandshakeSimulator';
import { WirelessAssociationSimulator } from './simulations/WirelessAssociationSimulator';
import {
  simulatorGuideConfigById,
  type SimulatorGuideState,
  type SimulatorStepProps,
} from './simulations/simulatorStepConfig';

type ModuleName = 'Foundations' | 'Transport Layer' | 'Network Layer' | 'Link Layer';
type Difficulty = 'Introductory' | 'Intermediate' | 'Advanced';
type Checkpoint = 'Project Checkpoint 2' | 'Project Checkpoint 3' | 'Project Checkpoint 4' | null;

interface SimulatorConfig {
  id: string;
  label: string;
  module: ModuleName;
  difficulty: Difficulty;
  lectureRef: string;
  checkpointRel: Checkpoint;
  summary: string;
  learningFocus: string;
  component: ComponentType<SimulatorStepProps>;
}

const moduleOrder: ModuleName[] = ['Foundations', 'Transport Layer', 'Network Layer', 'Link Layer'];

const moduleDescriptions: Record<ModuleName, string> = {
  Foundations: 'Build baseline packet and naming intuition.',
  'Transport Layer': 'Master connection setup and reliable delivery.',
  'Network Layer': 'Study forwarding, routing, and path selection.',
  'Link Layer': 'Understand LAN switching, loop control, wireless sync, and queueing.',
};

const simulators: SimulatorConfig[] = [
  {
    id: 'encapsulation',
    label: 'Packet Encapsulation',
    module: 'Foundations',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: Layered Internet Architecture and PDUs',
    checkpointRel: null,
    summary: 'Watch headers and trailers being added and removed across protocol layers.',
    learningFocus: 'Map PDU transformations from application data to on-the-wire frames.',
    component: EncapsulationSimulator,
  },
  {
    id: 'dns-resolution',
    label: 'DNS Resolution',
    module: 'Foundations',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: DNS Resolution, Caching, and Referrals',
    checkpointRel: null,
    summary: 'Follow recursive and iterative DNS query flow from client to authoritative server.',
    learningFocus: 'Understand referral chains and cached responses in domain lookup.',
    component: DnsResolutionSimulator,
  },
  {
    id: 'subnetting',
    label: 'Subnetting Calculator',
    module: 'Foundations',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: IPv4 Addressing and CIDR Subnetting',
    checkpointRel: 'Project Checkpoint 2',
    summary: 'Compute CIDR-based subnet ranges, host counts, and masks for common network plans.',
    learningFocus: 'Build confidence translating between prefix length and address capacity.',
    component: SubnettingCalculator,
  },
  {
    id: 'tcp-handshake',
    label: 'TCP Handshake',
    module: 'Transport Layer',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: TCP Connection Setup and Teardown',
    checkpointRel: 'Project Checkpoint 2',
    summary: 'Step through SYN, SYN-ACK, and ACK exchange to establish a reliable session.',
    learningFocus: 'Understand sequence/acknowledgment roles in connection setup.',
    component: TcpHandshakeSimulator,
  },
  {
    id: 'sliding-window',
    label: 'Sliding Window',
    module: 'Transport Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: Reliable Data Transfer Window Mechanics',
    checkpointRel: 'Project Checkpoint 2',
    summary: 'Visualize sender and receiver windows while packets and ACKs move through the link.',
    learningFocus: 'Understand in-flight limits, window movement, and throughput implications.',
    component: SlidingWindowSimulator,
  },
  {
    id: 'gbn-sr',
    label: 'Go-Back-N vs Selective Repeat',
    module: 'Transport Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: Reliable Data Transfer (GBN and SR)',
    checkpointRel: 'Project Checkpoint 2',
    summary: 'Compare retransmission strategies when losses happen within a shared send window.',
    learningFocus: 'See why SR buffers out-of-order packets while GBN resends a larger range.',
    component: GbnSrSimulator,
  },
  {
    id: 'cwnd',
    label: 'TCP Reno State Machine',
    module: 'Transport Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: TCP Reno (Slow Start, CA, Fast Recovery)',
    checkpointRel: 'Project Checkpoint 3',
    summary: 'Observe how congestion window growth reacts to clean links and packet loss events.',
    learningFocus: 'Contrast slow start, congestion avoidance, Triple-DupACK recovery, and timeout reset.',
    component: CwndSimulator,
  },
  {
    id: 'pipe-ack-clocking',
    label: 'BDP Pipe and ACK Clocking',
    module: 'Transport Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: BDP, Pipe Model, and ACK Clocking',
    checkpointRel: 'Project Checkpoint 3',
    summary: 'Model pipe volume using BDP and observe ACK-paced steady-state transmission.',
    learningFocus: 'Contrast efficient pipe filling with harmful queue filling under transient overload.',
    component: PipeAckClockingSimulator,
  },
  {
    id: 'lpm',
    label: 'Longest Prefix Match',
    module: 'Network Layer',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: Router Forwarding and Binary Prefix Matching',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Use binary prefix comparison to choose the most specific route among multiple matches.',
    learningFocus: 'Understand why longest matching prefix determines forwarding next-hop.',
    component: LpmSimulator,
  },
  {
    id: 'arp',
    label: 'ARP Broadcast and Cache',
    module: 'Network Layer',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: ARP Resolution on a LAN',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Broadcast "Who has IP X?" with FF:FF:FF:FF:FF:FF and observe the unicast reply from the owner.',
    learningFocus: 'See how IP-to-MAC resolution works and why senders cache resolved MAC addresses.',
    component: ArpSimulator,
  },
  {
    id: 'dijkstra',
    label: 'Dijkstra Shortest Path',
    module: 'Network Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: Link-State Routing and SPF (OSPF)',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Track shortest path discovery on weighted network graphs step-by-step.',
    learningFocus: 'Connect SPF decisions to router forwarding table outcomes.',
    component: DijkstraSimulator,
  },
  {
    id: 'distance-vector',
    label: 'Distance Vector (RIP)',
    module: 'Network Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: Distance Vector, Count-to-Infinity, Poison Reverse',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Run lock-step RIP-style updates and observe count-to-infinity after link failure.',
    learningFocus: 'See how Poison Reverse mitigates simple loops and compare to OSPF behavior.',
    component: DistanceVectorSimulator,
  },
  {
    id: 'mpls',
    label: 'MPLS Label Switching',
    module: 'Network Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: MPLS Virtual Circuits and Label Swapping',
    checkpointRel: 'Project Checkpoint 4',
    summary: 'Follow a one-way LSP as ingress pushes, transit swaps, and egress pops MPLS labels.',
    learningFocus: 'Understand virtual-circuit forwarding using LFIB label/interface mappings instead of prefix lookup.',
    component: MplsSimulator,
  },
  {
    id: 'learning-switch',
    label: 'Learning Switch',
    module: 'Link Layer',
    difficulty: 'Introductory',
    lectureRef: 'Lecture: Ethernet Learning Bridges and Flooding',
    checkpointRel: null,
    summary: 'Observe MAC-table learning, flooding for unknown destinations, and filtering to a learned output port.',
    learningFocus: 'Understand why source learning enables efficient unicast forwarding after initial floods.',
    component: LearningSwitchSimulator,
  },
  {
    id: 'stp',
    label: 'Spanning Tree Protocol',
    module: 'Link Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: STP Root Election and Loop Mitigation',
    checkpointRel: null,
    summary: 'Elect a root bridge, block loop-causing links, and recompute after root-link failure.',
    learningFocus: 'See how STP turns a looped physical topology into a loop-free logical tree.',
    component: StpSimulator,
  },
  {
    id: 'wireless-association',
    label: 'Wireless Association',
    module: 'Link Layer',
    difficulty: 'Intermediate',
    lectureRef: 'Lecture: Wireless Association and 5ms Synchronization Scan',
    checkpointRel: null,
    summary: 'Simulate 5ms synchronization scans and base-station association/handover decisions.',
    learningFocus: 'Understand periodic scan timing and decision thresholds for stable association.',
    component: WirelessAssociationSimulator,
  },
  {
    id: 'queue-management',
    label: 'Queue Management',
    module: 'Link Layer',
    difficulty: 'Advanced',
    lectureRef: 'Lecture: FIFO, RR/WFQ Scheduling, and Drop-Tail',
    checkpointRel: 'Project Checkpoint 3',
    summary: 'Compare FIFO, Round-Robin, and WFQ with drop-tail buffering under multi-flow load.',
    learningFocus: 'Relate fairness, burst drops, and queue occupancy to transport-layer behavior.',
    component: QueueManagementSimulator,
  },
];

const SimulationsMode = () => {
  const [activeSimulatorId, setActiveSimulatorId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [runtimeGuideState, setRuntimeGuideState] = useState<SimulatorGuideState | null>(null);

  const activeConfig = activeSimulatorId
    ? simulators.find(sim => sim.id === activeSimulatorId) ?? null
    : null;

  const guideConfig = activeConfig
    ? simulatorGuideConfigById[activeConfig.id]
    : null;

  const activeGuideState = activeConfig && guideConfig
    ? runtimeGuideState ?? {
        steps: guideConfig.steps,
        currentStep,
        mode: guideConfig.mode,
        isComplete: guideConfig.mode === 'terminal'
          ? guideConfig.steps.length > 0 && currentStep >= guideConfig.steps.length - 1
          : false,
      }
    : null;

  const handleSelect = useCallback((id: string) => {
    setActiveSimulatorId(id);
    setCurrentStep(0);
    setRuntimeGuideState(null);
  }, []);

  const handleExit = useCallback(() => {
    setActiveSimulatorId(null);
    setCurrentStep(0);
    setRuntimeGuideState(null);
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleGuideStateChange = useCallback((nextState: SimulatorGuideState) => {
    setRuntimeGuideState(nextState);
  }, []);

  if (!activeConfig) {
    return (
      <SimulationHub
        simulators={simulators}
        moduleOrder={moduleOrder}
        moduleDescriptions={moduleDescriptions}
        onSelect={handleSelect}
      />
    );
  }

  const SimComponent = activeConfig.component;

  return (
    <SimulationShell
      title={activeConfig.label}
      category={activeConfig.module}
      difficulty={activeConfig.difficulty}
      lectureRef={activeConfig.lectureRef}
      checkpointRel={activeConfig.checkpointRel}
      summary={activeConfig.summary}
      learningFocus={activeConfig.learningFocus}
      conceptSteps={activeGuideState?.steps ?? []}
      guideMode={activeGuideState?.mode ?? 'exploratory'}
      guideStatusLabel={activeGuideState?.statusLabel}
      isGuideComplete={activeGuideState?.isComplete ?? false}
      currentStep={activeGuideState?.currentStep ?? currentStep}
      onExit={handleExit}
    >
      <SimComponent onStepChange={handleStepChange} onGuideStateChange={handleGuideStateChange} />
    </SimulationShell>
  );
};

export default SimulationsMode;
