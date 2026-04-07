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
  common_mistakes?: string;
}

export interface StructuredAnswer {
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
  page_number?: number;
  slide_number?: number;      // For lecture_slides_course
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
  attachments?: ChatMessageAttachment[];
  created_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
