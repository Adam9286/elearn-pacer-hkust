import type { ComponentType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity } from 'lucide-react';
import { ArpSimulator } from './simulations/ArpSimulator';
import { CwndSimulator } from './simulations/CwndSimulator';
import { DijkstraSimulator } from './simulations/DijkstraSimulator';
import { DistanceVectorSimulator } from './simulations/DistanceVectorSimulator';
import { DnsResolutionSimulator } from './simulations/DnsResolutionSimulator';
import { EncapsulationSimulator } from './simulations/EncapsulationSimulator';
import { GbnSrSimulator } from './simulations/GbnSrSimulator';
import { PipeAckClockingSimulator } from './simulations/PipeAckClockingSimulator';
import { SimulationShell } from './simulations/SimulationShell';
import { SlidingWindowSimulator } from './simulations/SlidingWindowSimulator';
import { LearningSwitchSimulator } from './simulations/LearningSwitchSimulator';
import { LpmSimulator } from './simulations/LpmSimulator';
import { MplsSimulator } from './simulations/MplsSimulator';
import { QueueManagementSimulator } from './simulations/QueueManagementSimulator';
import { StpSimulator } from './simulations/StpSimulator';
import { SubnettingCalculator } from './simulations/SubnettingCalculator';
import { TcpHandshakeSimulator } from './simulations/TcpHandshakeSimulator';
import { WirelessAssociationSimulator } from './simulations/WirelessAssociationSimulator';

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
  component: ComponentType;
}

const moduleOrder: ModuleName[] = ['Foundations', 'Transport Layer', 'Network Layer', 'Link Layer'];

const moduleDescriptions: Record<ModuleName, string> = {
  Foundations: 'Start here to build baseline packet and naming intuition.',
  'Transport Layer': 'Move from connection setup to reliability and congestion behavior.',
  'Network Layer': 'Study forwarding, routing convergence, and label-switched paths.',
  'Link Layer': 'Understand LAN switching, loop control, wireless sync, and queueing behavior.',
};

const difficultyBadgeClass: Record<Difficulty, string> = {
  Introductory: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
  Intermediate: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  Advanced: 'border-red-500/50 bg-red-500/15 text-red-300',
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
  const [activeSimulatorId, setActiveSimulatorId] = useState('encapsulation');
  const [openModule, setOpenModule] = useState<ModuleName>('Foundations');

  const activeConfig = simulators.find(sim => sim.id === activeSimulatorId) ?? simulators[0];
  const activeModule = activeConfig.module;

  const modules = useMemo(
    () =>
      moduleOrder.map(module => ({
        module,
        simulations: simulators.filter(sim => sim.module === module),
      })),
    []
  );

  useEffect(() => {
    setOpenModule(activeModule);
  }, [activeModule]);

  const setActiveById = (simulatorId: string) => {
    const config = simulators.find(sim => sim.id === simulatorId);
    if (!config) return;
    setActiveSimulatorId(simulatorId);
    setOpenModule(config.module);
  };

  const setActiveByModule = (module: ModuleName) => {
    const firstSimulator = simulators.find(sim => sim.module === module);
    if (!firstSimulator) return;
    setActiveSimulatorId(firstSimulator.id);
    setOpenModule(module);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Interactive Simulations</h2>
          <p className="text-sm text-muted-foreground">
            Explore networking concepts by changing parameters and observing behavior in real-time.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-xl bg-slate-900/80 p-4">
            <h3 className="text-base font-semibold text-foreground">Recommended First Steps</h3>
            <p className="mt-1 text-sm text-slate-400">
              You can explore any simulation — these are good starting points.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant={activeSimulatorId === 'encapsulation' ? 'default' : 'outline'}
                onClick={() => setActiveById('encapsulation')}
              >
                1. Packet Encapsulation
              </Button>
              <Button
                variant={activeSimulatorId === 'dns-resolution' ? 'default' : 'outline'}
                onClick={() => setActiveById('dns-resolution')}
              >
                2. DNS Resolution
              </Button>
            </div>
          </section>

          <section className="rounded-xl bg-slate-900/80 p-4">
            <h3 className="text-base font-semibold text-foreground">Simulation Modules</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Expand a module, choose a simulator, then focus on one concept at a time.
            </p>

            <Accordion
              type="single"
              value={openModule}
              onValueChange={value => {
                if (!value) return;
                setActiveByModule(value as ModuleName);
              }}
              className="mt-3"
            >
              {modules.map(({ module, simulations: moduleSims }) => {
                const selectedInModule =
                  module === activeModule
                    ? activeConfig
                    : moduleSims[0];
                return (
                  <AccordionItem key={module} value={module} className="border-border/50">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{module}</span>
                          <span className="text-xs text-slate-500">({moduleSims.length})</span>
                          <span className="flex items-center gap-0.5 ml-1">
                            {moduleSims.map((sim) => (
                              <span
                                key={sim.id}
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  sim.difficulty === 'Introductory' ? 'bg-emerald-500' :
                                  sim.difficulty === 'Intermediate' ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                                title={`${sim.label} (${sim.difficulty})`}
                              />
                            ))}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{moduleDescriptions[module]}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <Select
                        value={selectedInModule.id}
                        onValueChange={value => setActiveById(value)}
                      >
                        <SelectTrigger className="bg-background/50 border-border/40">
                          <SelectValue placeholder="Select a simulation" />
                        </SelectTrigger>
                        <SelectContent>
                          {moduleSims.map(sim => (
                            <SelectItem key={sim.id} value={sim.id}>
                              {sim.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="rounded-lg bg-slate-800/60 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{selectedInModule.label}</span>
                          <Badge className={`${difficultyBadgeClass[selectedInModule.difficulty]} text-[10px] px-1.5 py-0.5`}>
                            {selectedInModule.difficulty}
                          </Badge>
                          {selectedInModule.checkpointRel && (
                            <Badge className="border-blue-400/40 bg-blue-500/10 text-blue-200 text-[10px] px-1.5 py-0.5">
                              {selectedInModule.checkpointRel}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{selectedInModule.summary}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>
        </aside>

        <main className="min-w-0">
          <SimulationShell
            title={activeConfig.label}
            category={activeConfig.module}
            summary={activeConfig.summary}
            learningFocus={activeConfig.learningFocus}
          >
            <activeConfig.component />
          </SimulationShell>
        </main>
      </div>
    </div>
  );
};

export default SimulationsMode;
