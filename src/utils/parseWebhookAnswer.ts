import { StructuredAnswer, isStructuredAnswer } from '@/types/chatTypes';

export interface ParsedWebhookAnswer {
  rawContent: string;
  structured: StructuredAnswer | null;
}

const EMPTY_WEBHOOK_ANSWER_MESSAGE =
  'The AI workflow returned an empty answer. This usually means the n8n webhook completed without passing model output back to the app.';

export function parseWebhookAnswer(
  payload: Record<string, unknown>
): ParsedWebhookAnswer {
  const raw =
    payload.answer ??
    payload.output ??
    payload.response ??
    payload.message ??
    payload.content ??
    payload.text;

  if (typeof raw === 'object' && raw !== null) {
    if (isStructuredAnswer(raw)) {
      return {
        rawContent: JSON.stringify(raw),
        structured: raw as StructuredAnswer,
      };
    }

    return { rawContent: JSON.stringify(raw), structured: null };
  }

  if (typeof raw !== 'string') {
    return {
      rawContent: EMPTY_WEBHOOK_ANSWER_MESSAGE,
      structured: null,
    };
  }

  const trimmed = raw.trim();
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (fenceStripped.startsWith('{')) {
    try {
      const parsed = JSON.parse(fenceStripped);
      if (isStructuredAnswer(parsed)) {
        return { rawContent: fenceStripped, structured: parsed };
      }
    } catch {
      // Not valid JSON. Fall back to plain text handling.
    }
  }

  return {
    rawContent: trimmed || EMPTY_WEBHOOK_ANSWER_MESSAGE,
    structured: null,
  };
}
