import type {
  OpenRouterChatMessage,
  OpenRouterModelOption,
} from '@/components/compare/types';

const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS_CACHE_KEY = 'openrouter.models';
const MODELS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface OpenRouterModelsResponse {
  data?: Array<{
    id: string;
    name?: string;
    context_length?: number;
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }>;
}

interface OpenRouterStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

function readCachedModels(): OpenRouterModelOption[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(MODELS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !Array.isArray(parsed?.models)) return null;

    if (Date.now() - parsed.timestamp > MODELS_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(MODELS_CACHE_KEY);
      return null;
    }

    return parsed.models;
  } catch {
    return null;
  }
}

function writeCachedModels(models: OpenRouterModelOption[]) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      MODELS_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        models,
      }),
    );
  } catch {
    // Ignore storage errors.
  }
}

export function clearCachedModels() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(MODELS_CACHE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export async function getModels({
  apiKey,
  signal,
}: {
  apiKey: string;
  signal?: AbortSignal;
}): Promise<OpenRouterModelOption[]> {
  const cached = readCachedModels();
  if (cached) return cached;

  const response = await fetch(MODELS_URL, {
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to load OpenRouter models`);
  }

  const data: OpenRouterModelsResponse = await response.json();
  const models = (data.data ?? [])
    .map((model) => ({
      id: model.id,
      name: model.name || model.id,
      context_length: model.context_length,
      pricing: model.pricing,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  writeCachedModels(models);
  return models;
}

function extractSseDataBlocks(chunk: string) {
  return chunk
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean);
}

export async function* streamOpenRouterResponse({
  apiKey,
  model,
  messages,
  signal,
}: {
  apiKey: string;
  model: string;
  messages: OpenRouterChatMessage[];
  signal?: AbortSignal;
}): AsyncGenerator<string, void, unknown> {
  if (!apiKey) {
    throw new Error('Missing OpenRouter API key');
  }

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'LearningPacer Compare',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    throw new Error('OpenRouter did not return a readable stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = extractSseDataBlocks(buffer);
      const endsWithBoundary = buffer.endsWith('\n\n');
      buffer = endsWithBoundary ? '' : events.pop() || '';

      for (const event of events) {
        const dataLines = event
          .split('\n')
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice(6).trim());

        for (const dataLine of dataLines) {
          if (dataLine === '[DONE]') {
            return;
          }

          let parsed: OpenRouterStreamChunk;
          try {
            parsed = JSON.parse(dataLine);
          } catch {
            continue;
          }

          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      }
    }

    const trailing = buffer.trim();
    if (trailing) {
      const dataLines = trailing
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6).trim());

      for (const dataLine of dataLines) {
        if (dataLine === '[DONE]') return;

        let parsed: OpenRouterStreamChunk;
        try {
          parsed = JSON.parse(dataLine);
        } catch {
          continue;
        }

        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
