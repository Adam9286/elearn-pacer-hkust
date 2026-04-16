import type { ComprehensionQuestion } from '@/types/courseTypes';

export interface ConceptStep {
  title: string;
  description: string;
}

export type SimulatorGuideMode = 'terminal' | 'convergence' | 'exploratory';

export interface SimulatorGuideConfig {
  mode: SimulatorGuideMode;
  steps: ConceptStep[];
  quizQuestions?: ComprehensionQuestion[];
}

export interface SimulatorGuideState {
  steps: ConceptStep[];
  currentStep: number;
  mode: SimulatorGuideMode;
  isComplete: boolean;
  statusLabel?: string;
}

export interface SimulatorStepProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onGuideStateChange?: (state: SimulatorGuideState) => void;
}

export const getSimulatorStatusLabel = (
  mode: SimulatorGuideMode,
  isComplete: boolean,
  statusLabel?: string
) => {
  if (statusLabel) return statusLabel;
  if (mode === 'terminal') return isComplete ? 'Complete' : 'Running';
  if (mode === 'convergence') return isComplete ? 'Converged' : 'Not Converged';
  return 'Interactive Workspace';
};

export const simulatorGuideConfigById: Record<string, SimulatorGuideConfig> = {
  encapsulation: {
    mode: 'terminal',
    steps: [
      { title: 'Application Data', description: 'The application generates raw data to send across the network.' },
      { title: 'Transport Header', description: 'TCP/UDP header is prepended with port numbers and sequence info.' },
      { title: 'Network Header', description: 'IP header is added with source and destination addresses.' },
      { title: 'Link Frame', description: 'Ethernet frame wraps everything with MAC addresses and a trailer.' },
    ],
  },
  'dns-resolution': {
    mode: 'terminal',
    steps: [
      { title: 'Client Query', description: 'Your device asks its local DNS resolver to look up a domain name.' },
      { title: 'Root Referral', description: 'The root server refers the resolver to the correct TLD nameserver.' },
      { title: 'TLD Referral', description: 'The TLD nameserver points to the authoritative server for the domain.' },
      { title: 'Authoritative Answer', description: 'The authoritative server returns the actual IP address.' },
    ],
  },
  subnetting: {
    mode: 'exploratory',
    steps: [
      { title: 'Enter CIDR Block', description: 'Specify an IP address and prefix length, such as 192.168.1.0/24.' },
      { title: 'Compute Ranges', description: 'Calculate network address, broadcast address, and usable host range.' },
      { title: 'Verify Host Count', description: 'Confirm that the usable host count matches the requested network plan.' },
    ],
  },
  'tcp-handshake': {
    mode: 'terminal',
    steps: [
      { title: 'SYN', description: 'The client sends a SYN packet with a sequence number to initiate the connection.' },
      { title: 'SYN-ACK', description: 'The server responds with its own sequence number and acknowledges the client SYN.' },
      { title: 'ACK', description: 'The client confirms the server sequence number and the connection is established.' },
    ],
    quizQuestions: [
      {
        question: 'After a client sends a SYN in the normal TCP handshake, what should the server send back next?',
        options: [
          'Another SYN with no acknowledgment',
          'A SYN-ACK that acknowledges the client and shares the server sequence number',
          'An ACK that immediately closes the connection',
          'A FIN to start teardown',
        ],
        correctIndex: 1,
        explanation: 'The server replies with SYN-ACK so it can acknowledge the client SYN and advertise its own starting sequence number.',
      },
      {
        question: 'What does the client\'s final ACK accomplish in the three-way handshake?',
        options: [
          'It confirms the server response so both sides can enter ESTABLISHED',
          'It asks the server to retransmit the SYN-ACK',
          'It resets the connection if packets are delayed',
          'It carries the first application data payload',
        ],
        correctIndex: 0,
        explanation: 'The last ACK confirms the server side of the exchange, which completes the handshake and lets both endpoints move into ESTABLISHED.',
      },
    ],
  },
  'sliding-window': {
    mode: 'terminal',
    steps: [
      { title: 'Window Initialization', description: 'Sender sets the window size that limits how many packets can be in flight.' },
      { title: 'Packet Transmission', description: 'Packets are sent up to the window limit without waiting for individual ACKs.' },
      { title: 'ACK Reception', description: 'As ACKs return, the window slides forward and allows new packets to be sent.' },
      { title: 'Window Full', description: 'When the window is full, the sender must wait for ACKs before sending more.' },
    ],
    quizQuestions: [
      {
        question: 'What is the main benefit of using a sliding window instead of sending one packet and waiting each time?',
        options: [
          'It lets the sender keep several packets in flight before waiting for ACKs',
          'It guarantees packets can never be lost',
          'It removes the need for acknowledgments',
          'It makes every packet arrive in one step',
        ],
        correctIndex: 0,
        explanation: 'A sliding window improves efficiency by allowing multiple packets to be in flight at once instead of pausing after every single packet.',
      },
      {
        question: 'What happens when the sender\'s window is full and no new ACK has arrived yet?',
        options: [
          'The sender immediately doubles the window size',
          'The sender keeps sending anyway and ignores the limit',
          'The sender must wait until ACKs free space in the window',
          'The receiver automatically retransmits the missing packet',
        ],
        correctIndex: 2,
        explanation: 'The window size limits how many unacknowledged packets may be outstanding, so the sender must wait for ACKs before sending more.',
      },
    ],
  },
  'gbn-sr': {
    mode: 'terminal',
    steps: [
      { title: 'Normal Transmission', description: 'Both protocols send packets within the active send window.' },
      { title: 'Loss Event', description: 'A packet is lost in transit, creating a gap in the receiver sequence.' },
      { title: 'GBN Retransmission', description: 'Go-Back-N resends the lost packet and all subsequent packets.' },
      { title: 'SR Retransmission', description: 'Selective Repeat resends only the lost packet and buffers out-of-order arrivals.' },
    ],
  },
  cwnd: {
    mode: 'exploratory',
    steps: [
      { title: 'Slow Start', description: 'CWND grows exponentially until the slow-start threshold is reached.' },
      { title: 'Congestion Avoidance', description: 'CWND grows linearly to probe for more available bandwidth.' },
      { title: 'Triple Duplicate ACK', description: 'Three duplicate ACKs trigger fast retransmit and fast recovery behavior.' },
      { title: 'Timeout', description: 'A timeout resets CWND to 1 MSS and sends the sender back to slow start.' },
    ],
  },
  'pipe-ack-clocking': {
    mode: 'exploratory',
    steps: [
      { title: 'Pipe Model', description: 'Bandwidth-delay product estimates how many bytes the path can hold in transit.' },
      { title: 'Filling the Pipe', description: 'Efficient use happens when the sender fills the path without building a queue.' },
      { title: 'ACK Clocking', description: 'In steady state, ACK arrivals pace future sends at the bottleneck rate.' },
    ],
  },
  lpm: {
    mode: 'exploratory',
    steps: [
      { title: 'Destination Lookup', description: 'A packet arrives and the router checks the forwarding table for matches.' },
      { title: 'Binary Comparison', description: 'Multiple entries may match, so prefixes are compared bit by bit.' },
      { title: 'Longest Match Wins', description: 'The matching entry with the most prefix bits determines the next hop.' },
    ],
  },
  arp: {
    mode: 'exploratory',
    steps: [
      { title: 'ARP Request', description: 'Sender broadcasts a request asking which MAC address owns the target IP.' },
      { title: 'ARP Reply', description: 'The owner responds with a unicast reply containing its MAC address.' },
      { title: 'Cache Update', description: 'Sender stores the IP-to-MAC mapping in its ARP cache for future frames.' },
    ],
  },
  dijkstra: {
    mode: 'convergence',
    steps: [
      { title: 'Initialize Source', description: 'Set source distance to zero, all others to infinity, and start from the source.' },
      { title: 'Relax Neighbors', description: 'For the current node, update tentative distances to all unvisited neighbors.' },
      { title: 'Select Minimum', description: 'Choose the unvisited node with the smallest tentative distance.' },
      { title: 'Repeat Until Done', description: 'Continue until all nodes are visited and the shortest-path tree is complete.' },
    ],
    quizQuestions: [
      {
        question: 'In Dijkstra\'s algorithm, which node should be chosen next after each step?',
        options: [
          'The unvisited node with the largest tentative distance',
          'Any random neighbor of the current node',
          'The unvisited node with the smallest tentative distance',
          'The destination node, even if its cost is still unknown',
        ],
        correctIndex: 2,
        explanation: 'Dijkstra works by repeatedly finalizing the unvisited node with the smallest known tentative distance.',
      },
      {
        question: 'What does it mean to relax an edge in Dijkstra\'s algorithm?',
        options: [
          'Delete the edge from the graph',
          'Check whether going through the current node gives a cheaper path to a neighbor',
          'Mark the neighbor as permanently visited without comparing costs',
          'Increase all path costs by one hop',
        ],
        correctIndex: 1,
        explanation: 'Relaxation means testing whether the path through the current node improves the best-known cost to a neighboring node.',
      },
    ],
  },
  'distance-vector': {
    mode: 'convergence',
    steps: [
      { title: 'Initialize Tables', description: 'Each router knows only the cost to its direct neighbors.' },
      { title: 'Exchange Vectors', description: 'Routers send their full distance vectors to neighbors each round.' },
      { title: 'Bellman-Ford Update', description: 'Each router updates costs using neighbor cost plus link cost.' },
      { title: 'Convergence or Loop', description: 'Tables stabilize or, after a failure, count-to-infinity behavior can appear.' },
    ],
  },
  mpls: {
    mode: 'terminal',
    steps: [
      { title: 'Label Push', description: 'Ingress router classifies the packet and pushes an MPLS label onto the stack.' },
      { title: 'Label Swap', description: 'Transit routers swap labels using their LFIB and forward to the next hop.' },
      { title: 'Label Pop', description: 'Egress router pops the label and forwards the packet using normal IP routing.' },
    ],
  },
  'learning-switch': {
    mode: 'exploratory',
    steps: [
      { title: 'Unknown Destination', description: 'A frame arrives and the switch floods because it does not know the destination port.' },
      { title: 'Source Learning', description: 'The switch records the source MAC and ingress port in its MAC table.' },
      { title: 'Known Forwarding', description: 'Future frames to that MAC are forwarded only to the learned port.' },
    ],
  },
  stp: {
    mode: 'convergence',
    steps: [
      { title: 'Root Election', description: 'All switches claim to be root until the lowest Bridge ID wins.' },
      { title: 'Root Port Selection', description: 'Each non-root switch chooses the port with the lowest cost path to root.' },
      { title: 'Designated Ports', description: 'Each LAN segment gets one forwarding designated port and blocks alternatives.' },
      { title: 'Topology Change', description: 'If a link fails, STP reconverges by recalculating roles and unblocking backups.' },
    ],
  },
  'wireless-association': {
    mode: 'exploratory',
    steps: [
      { title: 'Scanning', description: 'Device performs periodic synchronization scans across available channels.' },
      { title: 'Association', description: 'Device selects the strongest suitable base station and sends an association request.' },
      { title: 'Handover', description: 'If signal degrades, the device scans again and associates with a better AP.' },
    ],
  },
  'queue-management': {
    mode: 'exploratory',
    steps: [
      { title: 'Arrival', description: 'Packets from multiple flows arrive at the router output queue.' },
      { title: 'FIFO Scheduling', description: 'First-In First-Out serves packets in arrival order, so bursts can dominate.' },
      { title: 'Round-Robin or WFQ', description: 'Per-flow queues improve fairness by alternating or weighting service.' },
      { title: 'Drop-Tail', description: 'When the buffer is full, new arrivals are dropped and synchronized loss can occur.' },
    ],
  },
};

export const conceptStepsById: Record<string, ConceptStep[]> = Object.fromEntries(
  Object.entries(simulatorGuideConfigById).map(([id, config]) => [id, config.steps])
);
