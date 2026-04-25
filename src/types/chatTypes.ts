// Centralized types for the chat citation system

// ---------------------------------------------------------------------------
// Structured response types (new JSON-output architecture)
// ---------------------------------------------------------------------------

export type QuestionType =
  | 'comparison'
  | 'concept'
  | 'process'
  | 'calculation'
  | 'factual'
  | 'casual';

export type ChatResponseStyle =
  | 'quick_answer'
  | 'full_explanation';

export type LegacyChatResponseStyle =
  | 'explain'
  | 'exam_focus'
  | 'worked_example';

export type ChatResponseStyleInput = ChatResponseStyle | LegacyChatResponseStyle;

export const DEFAULT_CHAT_RESPONSE_STYLE: ChatResponseStyle = 'quick_answer';

export function normalizeChatResponseStyle(
  value: unknown,
  fallback: ChatResponseStyle = DEFAULT_CHAT_RESPONSE_STYLE
): ChatResponseStyle {
  const raw = typeof value === 'string' ? value.toLowerCase().trim() : '';

  if (raw === 'quick_answer' || raw === 'quick') return 'quick_answer';
  if (raw === 'full_explanation' || raw === 'full') return 'full_explanation';

  // Temporary compatibility for saved clients and exported n8n workflows.
  if (raw === 'exam_focus') return 'quick_answer';
  if (raw === 'explain' || raw === 'worked_example') return 'full_explanation';

  return fallback;
}

export interface StructuredTable {
  headers: string[];
  rows: string[][];
}

export interface StructuredDiagram {
  type: 'mermaid';
  code: string;
}

export interface CalculationSteps {
  setup: string;
  steps: string[];
  answer: string;
  common_mistakes?: string | null;
}

export interface StructuredAnswer {
  response_style?: ChatResponseStyle | null;
  question_type: QuestionType;
  title: string;
  summary?: string;
  main_explanation: string;
  table?: StructuredTable | null;
  diagram?: StructuredDiagram | null;
  elec3120_context?: string | null;
  exam_tip?: string | null;
  check_understanding?: string | null;
  calculation_steps?: CalculationSteps | null;
}

/** Type guard — single source of truth for detecting structured vs legacy answers */
export function isStructuredAnswer(value: unknown): value is StructuredAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.question_type === 'string' &&
    typeof v.title === 'string' &&
    typeof v.main_explanation === 'string'
  );
}

// ---------------------------------------------------------------------------

export interface ParsedCitation {
  documentTitle: string;      // "ELEC3120 Textbook" or "Lecture Notes"
  chapter?: string;           // "Chapter 3: Transport Layer"
  pageNumber?: number;        // 199
  slideNumber?: number;       // 12
  sourceType: 'textbook' | 'lecture' | 'unknown';
}

export interface RetrievedMaterial {
  content: string;
  excerpt?: string;           // n8n may return excerpt, normalize with getMaterialContent()
  page_number?: number | string | null;
  slide_number?: number | string | null;      // For lecture_slides_course
  lecture_id?: string;        // For lecture_slides_course
  lecture_title?: string;     // For lecture_slides_course
  chapter?: string;
  document_title: string;
  source_type?: string;       // "Textbook" or "Lecture Slides"
  source_url?: string;        // Optional; n8n may not send it
  similarity?: number;
}

export interface ChatMessageAttachment {
  name: string;
  url: string;
  type: string;
}

export type ChatTraceRoute = 'chat' | 'casual' | 'off_topic';

export type ChatTraceErrorStage =
  | 'json_parse'
  | 'retrieval'
  | 'ocr'
  | 'classifier'
  | 'diagram_validation'
  | 'vision';

export interface ChatTrace {
  trace_id: string;
  route?: ChatTraceRoute;
  response_style?: ChatResponseStyle;
  used_lecture_rag?: boolean;
  used_textbook_rag?: boolean;
  retrieved_count?: number;
  latency_ms?: number;
  error_stage?: ChatTraceErrorStage | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  /** DB column — always a string. New responses store JSON.stringify(StructuredAnswer). */
  content: string;
  /** Parsed at runtime from content or from the webhook response. Never persisted separately. */
  structured_answer?: StructuredAnswer;
  source?: string;                            // Legacy - kept for backwards compatibility
  citations?: string[];                       // Raw citation strings from backend
  retrieved_materials?: RetrievedMaterial[];  // Full material data from backend
  responseTime?: string;                      // Debug timer - local only, not persisted
  responseStyle?: ChatResponseStyle;          // Local only, not persisted to DB
  attachments?: ChatMessageAttachment[];
  /** Workflow trace metadata - local only, not persisted. Dev debugging aid. */
  trace?: ChatTrace;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
