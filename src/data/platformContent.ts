export type PlatformModeId = "chat" | "compare" | "course" | "exam" | "simulations";

export type SimulationModuleName = "Foundations" | "Transport Layer" | "Network Layer" | "Link Layer";
export type SimulationDifficulty = "Introductory" | "Intermediate" | "Advanced";
export type SimulationCheckpoint = "Project Checkpoint 2" | "Project Checkpoint 3" | "Project Checkpoint 4" | null;

export type PlatformModeSummary = {
  id: PlatformModeId;
  label: string;
  landingTitle: string;
  landingDescription: string;
  accent: string;
  boothPriority: "primary" | "secondary";
};

export type SimulationCatalogEntry = {
  id: string;
  label: string;
  module: SimulationModuleName;
  difficulty: SimulationDifficulty;
  lectureRef: string;
  checkpointRel: SimulationCheckpoint;
  summary: string;
  learningFocus: string;
};

export const platformModeSummaries: Record<PlatformModeId, PlatformModeSummary> = {
  chat: {
    id: "chat",
    label: "Chat",
    landingTitle: "Chat",
    landingDescription: "Ask ELEC3120 questions and get answers grounded in your course material.",
    accent: "#22d3ee",
    boothPriority: "primary",
  },
  compare: {
    id: "compare",
    label: "Compare",
    landingTitle: "Compare",
    landingDescription: "Contrast LearningPacer with a general AI answer side by side when you want a groundedness check.",
    accent: "#f59e0b",
    boothPriority: "secondary",
  },
  course: {
    id: "course",
    label: "Course",
    landingTitle: "Course",
    landingDescription: "Walk lecture by lecture through the ELEC3120 syllabus with guided explanations and checkpoints.",
    accent: "#4ade80",
    boothPriority: "primary",
  },
  exam: {
    id: "exam",
    label: "Mock Exam",
    landingTitle: "Mock Exam",
    landingDescription: "Generate practice exams with marking and explanations tied to the course content.",
    accent: "#a78bfa",
    boothPriority: "primary",
  },
  simulations: {
    id: "simulations",
    label: "Simulations",
    landingTitle: "Simulations",
    landingDescription: "Open the simulator hub for transport, routing, switching, wireless, and fundamentals labs.",
    accent: "#f97316",
    boothPriority: "primary",
  },
};

export const landingPrimaryModeIds: PlatformModeId[] = ["chat", "course", "simulations", "exam"];
export const landingSecondaryModeIds: PlatformModeId[] = ["compare"];

export const simulationModuleOrder: SimulationModuleName[] = [
  "Foundations",
  "Transport Layer",
  "Network Layer",
  "Link Layer",
];

export const simulationModuleDescriptions: Record<SimulationModuleName, string> = {
  Foundations: "Build baseline packet and naming intuition.",
  "Transport Layer": "Master connection setup, reliability, and congestion behavior.",
  "Network Layer": "Study forwarding, routing, and path selection.",
  "Link Layer": "Understand LAN switching, loop control, wireless sync, and queueing.",
};

export const simulationCatalog: SimulationCatalogEntry[] = [
  {
    id: "encapsulation",
    label: "Packet Encapsulation",
    module: "Foundations",
    difficulty: "Introductory",
    lectureRef: "Lecture: Layered Internet Architecture and PDUs",
    checkpointRel: null,
    summary: "Watch headers and trailers being added and removed across protocol layers.",
    learningFocus: "Map PDU transformations from application data to on-the-wire frames.",
  },
  {
    id: "dns-resolution",
    label: "DNS Resolution",
    module: "Foundations",
    difficulty: "Introductory",
    lectureRef: "Lecture: DNS Resolution, Caching, and Referrals",
    checkpointRel: null,
    summary: "Follow recursive and iterative DNS query flow from client to authoritative server.",
    learningFocus: "Understand referral chains and cached responses in domain lookup.",
  },
  {
    id: "subnetting",
    label: "Subnetting Calculator",
    module: "Foundations",
    difficulty: "Intermediate",
    lectureRef: "Lecture: IPv4 Addressing and CIDR Subnetting",
    checkpointRel: "Project Checkpoint 2",
    summary: "Compute CIDR-based subnet ranges, host counts, and masks for common network plans.",
    learningFocus: "Build confidence translating between prefix length and address capacity.",
  },
  {
    id: "tcp-handshake",
    label: "TCP Handshake",
    module: "Transport Layer",
    difficulty: "Introductory",
    lectureRef: "Lecture: TCP Connection Setup and Teardown",
    checkpointRel: "Project Checkpoint 2",
    summary: "Step through SYN, SYN-ACK, and ACK exchange to establish a reliable session.",
    learningFocus: "Understand sequence and acknowledgment roles in connection setup.",
  },
  {
    id: "sliding-window",
    label: "Sliding Window",
    module: "Transport Layer",
    difficulty: "Intermediate",
    lectureRef: "Lecture: Reliable Data Transfer Window Mechanics",
    checkpointRel: "Project Checkpoint 2",
    summary: "Visualize sender and receiver windows while packets and ACKs move through the link.",
    learningFocus: "Understand in-flight limits, window movement, and throughput implications.",
  },
  {
    id: "gbn-sr",
    label: "Go-Back-N vs Selective Repeat",
    module: "Transport Layer",
    difficulty: "Intermediate",
    lectureRef: "Lecture: Reliable Data Transfer (GBN and SR)",
    checkpointRel: "Project Checkpoint 2",
    summary: "Compare retransmission strategies when losses happen within a shared send window.",
    learningFocus: "See why SR buffers out-of-order packets while GBN resends a larger range.",
  },
  {
    id: "cwnd",
    label: "TCP Reno State Machine",
    module: "Transport Layer",
    difficulty: "Advanced",
    lectureRef: "Lecture: TCP Reno (Slow Start, CA, Fast Recovery)",
    checkpointRel: "Project Checkpoint 3",
    summary: "Observe how congestion window growth reacts to clean links and packet loss events.",
    learningFocus: "Contrast slow start, congestion avoidance, triple-dupACK recovery, and timeout reset.",
  },
  {
    id: "pipe-ack-clocking",
    label: "BDP Pipe and ACK Clocking",
    module: "Transport Layer",
    difficulty: "Advanced",
    lectureRef: "Lecture: BDP, Pipe Model, and ACK Clocking",
    checkpointRel: "Project Checkpoint 3",
    summary: "Model pipe volume using BDP and observe ACK-paced steady-state transmission.",
    learningFocus: "Contrast efficient pipe filling with harmful queue filling under transient overload.",
  },
  {
    id: "lpm",
    label: "Longest Prefix Match",
    module: "Network Layer",
    difficulty: "Introductory",
    lectureRef: "Lecture: Router Forwarding and Binary Prefix Matching",
    checkpointRel: "Project Checkpoint 4",
    summary: "Use binary prefix comparison to choose the most specific route among multiple matches.",
    learningFocus: "Understand why longest matching prefix determines forwarding next-hop.",
  },
  {
    id: "arp",
    label: "ARP Broadcast and Cache",
    module: "Network Layer",
    difficulty: "Introductory",
    lectureRef: "Lecture: ARP Resolution on a LAN",
    checkpointRel: "Project Checkpoint 4",
    summary: "Broadcast ARP requests and observe the unicast reply from the owner.",
    learningFocus: "See how IP-to-MAC resolution works and why senders cache resolved MAC addresses.",
  },
  {
    id: "dijkstra",
    label: "Dijkstra Shortest Path",
    module: "Network Layer",
    difficulty: "Intermediate",
    lectureRef: "Lecture: Link-State Routing and SPF (OSPF)",
    checkpointRel: "Project Checkpoint 4",
    summary: "Track shortest path discovery on weighted network graphs step by step.",
    learningFocus: "Connect SPF decisions to router forwarding table outcomes.",
  },
  {
    id: "distance-vector",
    label: "Distance Vector (RIP)",
    module: "Network Layer",
    difficulty: "Advanced",
    lectureRef: "Lecture: Distance Vector, Count-to-Infinity, Poison Reverse",
    checkpointRel: "Project Checkpoint 4",
    summary: "Run lock-step RIP-style updates and observe count-to-infinity after link failure.",
    learningFocus: "See how poison reverse mitigates simple loops and compare it to OSPF behavior.",
  },
  {
    id: "mpls",
    label: "MPLS Label Switching",
    module: "Network Layer",
    difficulty: "Advanced",
    lectureRef: "Lecture: MPLS Virtual Circuits and Label Swapping",
    checkpointRel: "Project Checkpoint 4",
    summary: "Follow a one-way LSP as ingress pushes, transit swaps, and egress pops MPLS labels.",
    learningFocus: "Understand virtual-circuit forwarding using LFIB mappings instead of prefix lookup.",
  },
  {
    id: "learning-switch",
    label: "Learning Switch",
    module: "Link Layer",
    difficulty: "Introductory",
    lectureRef: "Lecture: Ethernet Learning Bridges and Flooding",
    checkpointRel: null,
    summary: "Observe MAC-table learning, flooding for unknown destinations, and filtering to a learned output port.",
    learningFocus: "Understand why source learning enables efficient unicast forwarding after initial floods.",
  },
  {
    id: "stp",
    label: "Spanning Tree Protocol",
    module: "Link Layer",
    difficulty: "Intermediate",
    lectureRef: "Lecture: STP Root Election and Loop Mitigation",
    checkpointRel: null,
    summary: "Elect a root bridge, block loop-causing links, and recompute after root-link failure.",
    learningFocus: "See how STP turns a looped physical topology into a loop-free logical tree.",
  },
  {
    id: "wireless-association",
    label: "Wireless Association",
    module: "Link Layer",
    difficulty: "Intermediate",
    lectureRef: "Lecture: Wireless Association and 5ms Synchronization Scan",
    checkpointRel: null,
    summary: "Simulate 5ms synchronization scans and base-station association and handover decisions.",
    learningFocus: "Understand periodic scan timing and decision thresholds for stable association.",
  },
  {
    id: "queue-management",
    label: "Queue Management",
    module: "Link Layer",
    difficulty: "Advanced",
    lectureRef: "Lecture: FIFO, RR/WFQ Scheduling, and Drop-Tail",
    checkpointRel: "Project Checkpoint 3",
    summary: "Compare FIFO, Round-Robin, and WFQ with drop-tail buffering under multi-flow load.",
    learningFocus: "Relate fairness, burst drops, and queue occupancy to transport-layer behavior.",
  },
];

export const totalSimulationCount = simulationCatalog.length;
