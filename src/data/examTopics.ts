// Mock exam lecture topics
// Centralized data for exam generation topic selection

export const LECTURE_TOPICS = [
  "Lecture 1: Introduction to Computer Networks",
  "Lecture 2: Physical Layer - Overview",
  "Lecture 3: Physical Layer - Transmission Media",
  "Lecture 4: Data Link Layer - Error Detection",
  "Lecture 5: Data Link Layer - Multiple Access Protocols",
  "Lecture 6: Data Link Layer - Switched LANs",
  "Lecture 7: Network Layer - Overview",
  "Lecture 8: Network Layer - Routing Algorithms",
  "Lecture 9: Network Layer - Internet Protocol",
  "Lecture 10: Transport Layer - UDP",
  "Lecture 11: Transport Layer - TCP",
  "Lecture 12: Application Layer - HTTP",
  "Lecture 13: Application Layer - DNS",
  "Lecture 14: Application Layer - Email Protocols",
  "Lecture 15: Network Security Fundamentals",
] as const;

export type LectureTopic = typeof LECTURE_TOPICS[number];
