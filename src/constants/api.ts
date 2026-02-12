// Centralized API endpoints and webhook URLs
// Update these in one place when endpoints change

export const WEBHOOKS = {
  // Chat AI webhook - Quick Answer (LangChain) - LOCAL DOCKER
  CHAT_QUICK: "http://localhost:5678/webhook/e6c27aaa-0aa0-42a6-b497-337430e319f8",

  // Chat AI webhook - Deep Research (AI Agent) - LOCAL DOCKER
  CHAT_RESEARCH: "http://localhost:5678/webhook/6f2a40a0-765a-44f0-a012-b24f418869bb",

  // Mock exam generator webhook - LOCAL DOCKER
  EXAM_GENERATOR: "http://localhost:5678/webhook-test/bfdb1a10-c848-4bd1-8f50-5dbca106ccdb",

  // Course Mode SlideChat - context-aware Q&A - LOCAL DOCKER
  COURSE_SLIDE_CHAT: "http://localhost:5678/webhook/course/slide-chat",
} as const;

// Request timeouts in milliseconds
export const TIMEOUTS = {
  CHAT_QUICK: 120000, // 2 minutes for Quick Answer
  CHAT: 120000, // 2 minutes for Smart Answer / Deep Research (agent with tools)
  EXAM_GENERATION: 180000, // 3 minutes for exam generation
  SLIDE_EXPLANATION: 60000, // 60 seconds for slide explanations
} as const;
