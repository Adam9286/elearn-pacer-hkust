import type { RetrievedMaterial } from '@/types/chatTypes';

export type ComparePaneId = 'learningPacer' | 'openRouter';

export interface CompareSourceLabel {
  id: string;
  label: string;
}

export interface CompareMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  isStreaming?: boolean;
  isPending?: boolean;
  pendingLabel?: string;
  citations?: string[];
  sources?: CompareSourceLabel[];
  sourceCount?: number;
  retrievedMaterials?: RetrievedMaterial[];
}

export interface ComparePaneState {
  messages: CompareMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  pendingStartedAt?: number;
  isDisabled?: boolean;
  disabledMessage?: string;
  emptyTitle: string;
  emptyDescription: string;
}

export interface OpenRouterModelOption {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
