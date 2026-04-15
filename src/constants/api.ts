// Centralized n8n webhook URLs.
//
// The app now targets the hosted n8n instance by default.
// `VITE_N8N_BASE_URL` remains available as a single override if needed.

const DEFAULT_N8N_BASE = "https://n8n.learningpacer.org";
const N8N_BASE = (import.meta.env.VITE_N8N_BASE_URL || DEFAULT_N8N_BASE).replace(/\/+$/, "");

export const WEBHOOKS = {
  // Chat AI webhook - Smart Answer (AI Agent with RAG tools)
  CHAT_RESEARCH: `${N8N_BASE}/webhook-test/6f2a40a0-765a-44f0-a012-b24f418869bb`,

  // Mock exam generator webhook
  EXAM_GENERATOR: `${N8N_BASE}/webhook-test/bfdb1a10-c848-4bd1-8f50-5dbca106ccdb`,

  // Course Mode SlideChat - context-aware Q&A
  COURSE_SLIDE_CHAT: `${N8N_BASE}/webhook/course/slide-chat`,
} as const;

// Request timeouts in milliseconds
export const TIMEOUTS = {
  CHAT: 120000, // 2 minutes for Smart Answer (agent with tools)
  EXAM_GENERATION: 180000, // 3 minutes for exam generation
  SLIDE_EXPLANATION: 60000, // 60 seconds for slide explanations
} as const;
