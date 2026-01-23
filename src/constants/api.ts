// Centralized API endpoints and webhook URLs
// Update these in one place when endpoints change

export const WEBHOOKS = {
  // Chat AI webhook for processing messages
  CHAT: 'https://smellycat9286.app.n8n.cloud/webhook/6f2a40a0-765a-44f0-a012-b24f418869bb',
  
  // Mock exam generator webhook - TEST URL
  EXAM_GENERATOR: 'https://smellycat9286.app.n8n.cloud/webhook-test/bfdb1a10-c848-4bd1-8f50-5dbca106ccdb',
} as const;

// Request timeouts in milliseconds
export const TIMEOUTS = {
  CHAT: 120000,        // 2 minutes for chat responses
  EXAM_GENERATION: 180000, // 3 minutes for exam generation
} as const;
