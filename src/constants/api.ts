// Centralized API endpoints and webhook URLs
// Update these in one place when endpoints change

export const WEBHOOKS = {
  // Chat AI webhook - Quick Answer (LangChain) - TEST MODE
  CHAT_QUICK: "https://n8n.learningpacer.org/webhook-test/e6c27aaa-0aa0-42a6-b497-337430e319f8",

  // Chat AI webhook - Deep Research (AI Agent) - TEST MODE
  CHAT_RESEARCH: "https://n8n.learningpacer.org/webhook-test/6f2a40a0-765a-44f0-a012-b24f418869bb",

  // Mock exam generator webhook - PRODUCTION
  EXAM_GENERATOR: "https://n8n.learningpacer.org/webhook-test/bfdb1a10-c848-4bd1-8f50-5dbca106ccdb",

  // Course Mode AI Tutor - slide explanations
  COURSE_SLIDE_EXPLAIN:
    "https://smellycat9286.app.n8n.cloud/webhook/56bcc2db-cee9-4158-a0b2-1675ecdd2423/course/slide-explain",

  // Course Mode SlideChat - context-aware Q&A (TEST MODE)
  COURSE_SLIDE_CHAT: "https://smellycat9286.app.n8n.cloud/webhook-test/course/slide-chat",
} as const;

// Request timeouts in milliseconds
export const TIMEOUTS = {
  CHAT: 120000, // 2 minutes for chat responses
  EXAM_GENERATION: 180000, // 3 minutes for exam generation
  SLIDE_EXPLANATION: 60000, // 60 seconds for slide explanations
} as const;
