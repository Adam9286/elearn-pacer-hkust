// Centralized API endpoints and webhook URLs
// Update these in one place when endpoints change
//
// Set VITE_N8N_BASE_URL in your .env to point to a remote n8n instance
// (e.g. Cloudflare Tunnel URL). Defaults to localhost for local Docker dev.

const N8N_BASE = (import.meta.env.VITE_N8N_BASE_URL || "http://localhost:5678").replace(/\/+$/, "");

export const WEBHOOKS = {
  // Chat AI webhook - Quick Answer (LangChain)
  CHAT_QUICK: `${N8N_BASE}/webhook/e6c27aaa-0aa0-42a6-b497-337430e319f8`,

  // Chat AI webhook - Deep Research (AI Agent)
  CHAT_RESEARCH: `${N8N_BASE}/webhook/6f2a40a0-765a-44f0-a012-b24f418869bb`,

  // Mock exam generator webhook
  EXAM_GENERATOR: `${N8N_BASE}/webhook-test/bfdb1a10-c848-4bd1-8f50-5dbca106ccdb`,

  // Course Mode SlideChat - context-aware Q&A
  COURSE_SLIDE_CHAT: `${N8N_BASE}/webhook/course/slide-chat`,
} as const;

// Request timeouts in milliseconds
export const TIMEOUTS = {
  CHAT_QUICK: 120000, // 2 minutes for Quick Answer
  CHAT: 120000, // 2 minutes for Smart Answer / Deep Research (agent with tools)
  EXAM_GENERATION: 180000, // 3 minutes for exam generation
  SLIDE_EXPLANATION: 60000, // 60 seconds for slide explanations
} as const;
