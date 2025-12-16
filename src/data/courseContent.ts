// Course content data - Single source of truth for all course structure
// ELEC3120 Computer Networks - 11 Sections

export interface Lesson {
  id: string;
  number: string;
  title: string;
  lectureFile?: string;
  pdfUrl?: string;
  textbookSections?: string;
  estimatedMinutes: number;
  contentType?: "review";
}

export interface Chapter {
  id: number;
  title: string;
  description: string;
  textbookPages?: string;
  topics: string[];
  lessons: Lesson[];
}

export const chapters: Chapter[] = [
  // Section 1 — Foundations & Internet Overview
  {
    id: 1,
    title: "Foundations & Internet Overview",
    description: "Introduction to networks, Web basics, and Video streaming",
    textbookPages: "1-80",
    topics: ["Network Fundamentals", "Web & HTTP", "Video Streaming"],
    lessons: [
      {
        id: "1-1",
        number: "1.1",
        title: "Introduction",
        lectureFile: "01-Introduction",
        pdfUrl: "https://drive.google.com/file/d/1w34TPqz8BftrSc8TEB03RJ5sKOqqnvjq/preview",
        textbookSections: "1.1-1.3",
        estimatedMinutes: 45,
      },
      {
        id: "1-2",
        number: "1.2",
        title: "Web Basics",
        lectureFile: "02-Web",
        pdfUrl: "https://drive.google.com/file/d/1U58Ei-u0b9mkd37Jh6dvsFhWxoI9LZ1c/preview",
        textbookSections: "1.4-1.5",
        estimatedMinutes: 40,
      },
      {
        id: "1-3",
        number: "1.3",
        title: "Video Streaming",
        lectureFile: "04-Video",
        pdfUrl: "https://drive.google.com/file/d/1Ufw6W92LOJZeFleE9X-iOxSqqhnbQ64E/preview",
        textbookSections: "1.6",
        estimatedMinutes: 35,
      },
      {
        id: "1-review",
        number: "1.R",
        title: "Section 1 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 30,
      },
    ],
  },
  // Section 2 — Transport Layer & End-to-End Communication
  {
    id: 2,
    title: "Transport Layer & End-to-End Communication",
    description: "TCP mechanics, reliability, flow control, and congestion",
    textbookPages: "181-260",
    topics: ["Transport Model", "TCP Basics", "Congestion Control", "Advanced CC"],
    lessons: [
      {
        id: "2-1",
        number: "2.1",
        title: "Transport Model",
        lectureFile: "05-Transport_Model",
        textbookSections: "3.1-3.2",
        estimatedMinutes: 45,
      },
      {
        id: "2-2",
        number: "2.2",
        title: "TCP Basics",
        lectureFile: "06-TCP_Basics",
        textbookSections: "3.3-3.4",
        estimatedMinutes: 50,
      },
      {
        id: "2-3",
        number: "2.3",
        title: "Congestion Control",
        lectureFile: "07-Congestion_Control",
        textbookSections: "3.5-3.6",
        estimatedMinutes: 45,
      },
      {
        id: "2-4",
        number: "2.4",
        title: "Advanced Congestion Control",
        lectureFile: "08-AdvancedCC",
        textbookSections: "3.7",
        estimatedMinutes: 40,
      },
      {
        id: "2-review",
        number: "2.R",
        title: "Section 2 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 45,
      },
    ],
  },
  // Section 3 — Queueing & In-Network Resource Management
  {
    id: 3,
    title: "Queueing & Resource Management",
    description: "Queueing theory, fairness, and token buckets",
    textbookPages: "261-280",
    topics: ["Queueing Theory", "Fairness", "Token Buckets", "Traffic Shaping"],
    lessons: [
      {
        id: "3-1",
        number: "3.1",
        title: "Queue Management",
        lectureFile: "09-Queue",
        textbookSections: "3.8",
        estimatedMinutes: 50,
      },
      {
        id: "3-review",
        number: "3.R",
        title: "Section 3 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 25,
      },
    ],
  },
  // Section 4 — Network Layer: IP & Addressing
  {
    id: 4,
    title: "Network Layer: IP & Addressing",
    description: "IP fundamentals, addressing, fragmentation, DNS, NAT",
    textbookPages: "303-376",
    topics: ["IPv4/IPv6", "Addressing", "Fragmentation", "DNS", "NAT"],
    lessons: [
      {
        id: "4-1",
        number: "4.1",
        title: "IP Fundamentals",
        lectureFile: "10-IP",
        textbookSections: "4.1-4.3",
        estimatedMinutes: 55,
      },
      {
        id: "4-review",
        number: "4.R",
        title: "Section 4 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 25,
      },
    ],
  },
  // Section 5 — Interdomain Routing & the Global Internet
  {
    id: 5,
    title: "Interdomain Routing & Global Internet",
    description: "BGP, Internet structure, policy, and economics",
    textbookPages: "377-448",
    topics: ["BGP Basics", "BGP Advanced", "Internet Structure", "Routing Policy"],
    lessons: [
      {
        id: "5-1",
        number: "5.1",
        title: "BGP Introduction",
        lectureFile: "11-BGP",
        textbookSections: "5.1-5.3",
        estimatedMinutes: 45,
      },
      {
        id: "5-2",
        number: "5.2",
        title: "BGP Advanced",
        lectureFile: "12-BGP2",
        textbookSections: "5.4",
        estimatedMinutes: 40,
      },
      {
        id: "5-3",
        number: "5.3",
        title: "Internet Structure",
        lectureFile: "13-Internet",
        textbookSections: "5.5",
        estimatedMinutes: 35,
      },
      {
        id: "5-review",
        number: "5.R",
        title: "Section 5 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 35,
      },
    ],
  },
  // Section 6 — Local Area Networks & Intra-Domain Routing
  {
    id: 6,
    title: "Local Area Networks & Intra-Domain Routing",
    description: "Ethernet, ARP, DHCP, spanning tree, DV vs LS",
    textbookPages: "449-530",
    topics: ["LANs", "Ethernet", "ARP/DHCP", "Spanning Tree", "DV vs LS"],
    lessons: [
      {
        id: "6-1",
        number: "6.1",
        title: "Local Area Networks",
        lectureFile: "14-Local_Area_Network",
        textbookSections: "6.1-6.3",
        estimatedMinutes: 50,
      },
      {
        id: "6-2",
        number: "6.2",
        title: "LAN Routing",
        lectureFile: "15-LAN_Routing",
        textbookSections: "6.4",
        estimatedMinutes: 40,
      },
      {
        id: "6-3",
        number: "6.3",
        title: "Link Layer Challenges",
        lectureFile: "16-Link_Layer_Challenge",
        textbookSections: "6.5-6.6",
        estimatedMinutes: 45,
      },
      {
        id: "6-review",
        number: "6.R",
        title: "Section 6 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 35,
      },
    ],
  },
  // Section 7 — Wireless Networks
  {
    id: 7,
    title: "Wireless Networks",
    description: "Wireless constraints, interference, mobility",
    textbookPages: "531-580",
    topics: ["Wireless Links", "802.11 WiFi", "Interference", "Mobility"],
    lessons: [
      {
        id: "7-1",
        number: "7.1",
        title: "Wireless Networks",
        lectureFile: "17-Wireless_Network_updated",
        textbookSections: "7.1-7.4",
        estimatedMinutes: 55,
      },
      {
        id: "7-review",
        number: "7.R",
        title: "Section 7 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 25,
      },
    ],
  },
  // Section 8 — Content Delivery & Internet Performance
  {
    id: 8,
    title: "Content Delivery & Internet Performance",
    description: "CDNs, caching, performance optimization",
    textbookPages: "581-606",
    topics: ["CDN Architecture", "Caching", "Performance", "Edge Computing"],
    lessons: [
      {
        id: "8-1",
        number: "8.1",
        title: "Content Delivery Networks",
        lectureFile: "18-CDN",
        textbookSections: "8.1",
        estimatedMinutes: 45,
      },
      {
        id: "8-review",
        number: "8.R",
        title: "Section 8 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 25,
      },
    ],
  },
  // Section 9 — Datacenter Networks
  {
    id: 9,
    title: "Datacenter Networks",
    description: "Scale, topology, control in datacenter environments",
    textbookPages: "607-630",
    topics: ["Datacenter Topology", "Scale", "Traffic Patterns", "SDN"],
    lessons: [
      {
        id: "9-1",
        number: "9.1",
        title: "Datacenter Networks",
        lectureFile: "19-Datacenter",
        textbookSections: "8.2",
        estimatedMinutes: 50,
      },
      {
        id: "9-review",
        number: "9.R",
        title: "Section 9 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 25,
      },
    ],
  },
  // Section 10 — Network Security
  {
    id: 10,
    title: "Network Security",
    description: "Threat models, cryptography, secure channels",
    textbookPages: "631-664",
    topics: ["Threat Models", "Cryptography", "Authentication", "SSL/TLS", "Firewalls"],
    lessons: [
      {
        id: "10-1",
        number: "10.1",
        title: "Security Fundamentals",
        lectureFile: "20-Security",
        textbookSections: "8.3-8.5",
        estimatedMinutes: 50,
      },
      {
        id: "10-2",
        number: "10.2",
        title: "Advanced Security",
        lectureFile: "21-Security2",
        textbookSections: "8.6-8.8",
        estimatedMinutes: 45,
      },
      {
        id: "10-review",
        number: "10.R",
        title: "Section 10 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 30,
      },
    ],
  },
  // Section 11 — Real-Time Systems & Future Networking
  {
    id: 11,
    title: "Real-Time Systems & Future Networking",
    description: "Real-time video, bringing everything together",
    textbookPages: "665-680",
    topics: ["Real-Time Video", "Latency", "QoS", "Future Challenges"],
    lessons: [
      {
        id: "11-1",
        number: "11.1",
        title: "Real-Time Video",
        lectureFile: "22-Real_Time_Video",
        textbookSections: "8.9",
        estimatedMinutes: 45,
      },
      {
        id: "11-review",
        number: "11.R",
        title: "Section 11 Review & Quiz",
        contentType: "review",
        textbookSections: "Review",
        estimatedMinutes: 25,
      },
    ],
  },
];

// Helper to get chapter by ID
export const getChapterById = (id: number): Chapter | undefined => {
  return chapters.find(c => c.id === id);
};

// Helper to find lesson across all chapters
export const findLesson = (lessonId: string): { chapter: Chapter; lesson: Lesson; lessonIndex: number } | null => {
  for (const chapter of chapters) {
    const idx = chapter.lessons.findIndex(l => l.id === lessonId);
    if (idx !== -1) {
      return { chapter, lesson: chapter.lessons[idx], lessonIndex: idx };
    }
  }
  return null;
};
