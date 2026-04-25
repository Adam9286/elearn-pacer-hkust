import {
  ChatResponseStyle,
  ChatTrace,
  ChatTraceErrorStage,
  ChatTraceRoute,
  DEFAULT_CHAT_RESPONSE_STYLE,
  StructuredAnswer,
  isStructuredAnswer,
  normalizeChatResponseStyle,
} from '@/types/chatTypes';

export interface ParsedWebhookAnswer {
  rawContent: string;
  structured: StructuredAnswer | null;
}

const EMPTY_WEBHOOK_ANSWER_MESSAGE =
  'The AI workflow returned an empty answer. This usually means the n8n webhook completed without passing model output back to the app.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withResponseStyle(
  answer: StructuredAnswer,
  fallbackStyle: ChatResponseStyle
): StructuredAnswer {
  return {
    ...answer,
    response_style: normalizeChatResponseStyle(answer.response_style, fallbackStyle),
  };
}

export function parseWebhookAnswer(
  payload: unknown,
  fallbackStyle: ChatResponseStyle = DEFAULT_CHAT_RESPONSE_STYLE
): ParsedWebhookAnswer {
  const raw = isRecord(payload)
    ? payload.answer ??
      payload.output ??
      payload.response ??
      payload.message ??
      payload.content ??
      payload.text
    : payload;

  if (typeof raw === 'object' && raw !== null) {
    if (isStructuredAnswer(raw)) {
      const structured = withResponseStyle(raw, fallbackStyle);
      return {
        rawContent: JSON.stringify(structured),
        structured,
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
        const structured = withResponseStyle(parsed, fallbackStyle);
        return {
          rawContent: JSON.stringify(structured),
          structured,
        };
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

const VALID_ROUTES: ReadonlySet<ChatTraceRoute> = new Set(['chat', 'casual', 'off_topic']);
const VALID_ERROR_STAGES: ReadonlySet<ChatTraceErrorStage> = new Set([
  'json_parse',
  'retrieval',
  'ocr',
  'classifier',
  'diagram_validation',
  'vision',
]);

/**
 * Extract trace metadata from the webhook response envelope.
 * Phase 1 contract: { answer, retrieved_materials, citations, trace }.
 * Returns null if no valid trace is present (e.g., old workflow still deployed).
 */
export function parseWebhookTrace(payload: unknown): ChatTrace | null {
  if (!isRecord(payload)) return null;
  const raw = payload.trace;
  if (!isRecord(raw)) return null;

  const traceId = typeof raw.trace_id === 'string' ? raw.trace_id : null;
  if (!traceId) return null;

  const trace: ChatTrace = { trace_id: traceId };

  if (typeof raw.route === 'string' && VALID_ROUTES.has(raw.route as ChatTraceRoute)) {
    trace.route = raw.route as ChatTraceRoute;
  }

  const style = normalizeChatResponseStyle(raw.response_style, DEFAULT_CHAT_RESPONSE_STYLE);
  if (typeof raw.response_style === 'string') {
    trace.response_style = style;
  }

  if (typeof raw.used_lecture_rag === 'boolean') trace.used_lecture_rag = raw.used_lecture_rag;
  if (typeof raw.used_textbook_rag === 'boolean') trace.used_textbook_rag = raw.used_textbook_rag;
  if (typeof raw.retrieved_count === 'number') trace.retrieved_count = raw.retrieved_count;
  if (typeof raw.latency_ms === 'number') trace.latency_ms = raw.latency_ms;

  if (raw.error_stage === null) {
    trace.error_stage = null;
  } else if (
    typeof raw.error_stage === 'string' &&
    VALID_ERROR_STAGES.has(raw.error_stage as ChatTraceErrorStage)
  ) {
    trace.error_stage = raw.error_stage as ChatTraceErrorStage;
  }

  return trace;
}
