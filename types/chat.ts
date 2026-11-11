export type MessageRole = 'user' | 'assistant';

/**
 * Separates UI preview conversations from real session messages
 * as required in Phase 1.
 */
export type ChatMode = 'live' | 'preview';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  durationSeconds?: number;
  isExamplePreview?: boolean;
  phaseNote?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  previewText: string;
  updatedAt: string;
  messageCount: number;
  isExamplePreview: boolean;
}
