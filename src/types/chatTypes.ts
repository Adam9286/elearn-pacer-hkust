// Centralized types for the chat citation system

export interface ParsedCitation {
  documentTitle: string;      // "ELEC3120 Textbook" or "Lecture Notes"
  chapter?: string;           // "Chapter 3: Transport Layer"
  pageNumber?: number;        // 199
  slideNumber?: number;       // 12
  sourceType: 'textbook' | 'lecture' | 'unknown';
}

export interface RetrievedMaterial {
  content: string;
  excerpt?: string;           // NEW - n8n returns excerpt, normalize with getMaterialContent()
  page_number?: number;
  chapter?: string;
  document_title: string;
  source_url: string;
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
  content: string;
  source?: string;                            // Legacy - kept for backwards compatibility
  citations?: string[];                       // NEW - Raw citation strings from backend
  retrieved_materials?: RetrievedMaterial[];  // NEW - Full material data from backend
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
