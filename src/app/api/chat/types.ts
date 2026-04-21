/**
 * Chat API types
 */
// Re-export SupportedLanguage from the shared types package to keep a
// single source of truth for locale discrimination across the app and
// shared packages. ChatMessage / ChatRequest stay here because the app
// uses a richer ChatMessage shape (see src/types/conversation.ts) that
// would collide if merged into @mirrorbuddy/types.
export type { SupportedLanguage } from '@mirrorbuddy/types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  maestroId: string;
  conversationId?: string; // Optional: for tool context injection
  enableTools?: boolean; // Optional: enable tool calling (default: true)
  enableMemory?: boolean; // Optional: enable conversation memory (default: true)
  requestedTool?:
    | 'mindmap'
    | 'quiz'
    | 'flashcard'
    | 'demo'
    | 'summary'
    | 'search'
    | 'pdf'
    | 'webcam'
    | 'homework'
    | 'study-kit'; // Tool context injection
  language?: import('@mirrorbuddy/types').SupportedLanguage; // User's preferred language (default: 'it')
}
