import { StructuredAnswer, isStructuredAnswer } from '@/types/chatTypes';

export interface ParsedWebhookAnswer {
  /** Always a string — safe to persist directly to Supabase `content` column. */
  rawContent: string;
  /** Non-null when n8n returned the new structured JSON format. */
  structured: StructuredAnswer | null;
}

/**
 * Parse the answer field from an n8n webhook payload.
 *
 * Handles three cases:
 *   A) n8n returned a JS object directly as `answer`  → common when LangChain
 *      agent output is an object rather than a string.
 *   B) n8n returned a JSON-encoded string as `answer` → model output the JSON
 *      as text; may or may not be wrapped in a ```json fence.
 *   C) n8n returned plain markdown text (legacy)      → no structured data.
 */
export function parseWebhookAnswer(
  payload: Record<string, unknown>
): ParsedWebhookAnswer {
  const raw = payload.answer ?? payload.output;

  // ── Path A: already an object ────────────────────────────────────────────
  if (typeof raw === 'object' && raw !== null) {
    if (isStructuredAnswer(raw)) {
      return {
        rawContent: JSON.stringify(raw),
        structured: raw as StructuredAnswer,
      };
    }
    // Object but not a StructuredAnswer — stringify and treat as legacy
    return { rawContent: JSON.stringify(raw), structured: null };
  }

  if (typeof raw !== 'string') {
    return {
      rawContent: "I received your question and I'm processing it.",
      structured: null,
    };
  }

  // ── Path B: string — try to parse as JSON ────────────────────────────────
  const trimmed = raw.trim();

  // Strip optional ```json ... ``` fences the model may add
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
      // Not valid JSON — fall through to legacy
    }
  }

  // ── Path C: legacy plain-markdown string ─────────────────────────────────
  return { rawContent: trimmed || "I received your question and I'm processing it.", structured: null };
}
