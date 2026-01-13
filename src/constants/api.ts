// Centralized API endpoints and webhook URLs
// Update these in one place when endpoints change

export const WEBHOOKS = {
  // Chat AI webhook for processing messages
  CHAT: 'https://smellycat9286.app.n8n.cloud/webhook-test/638fa33f-5871-43b3-a34e-d318a2147001',
  
  // Mock exam generator webhook
  EXAM_GENERATOR: 'https://smellycat9286.app.n8n.cloud/webhook-test/mock-exam-generator',
} as const;

// Request timeouts in milliseconds
export const TIMEOUTS = {
  CHAT: 120000,        // 2 minutes for chat responses
  EXAM_GENERATION: 180000, // 3 minutes for exam generation
} as const;
