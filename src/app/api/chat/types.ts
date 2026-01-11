/**
 * Chat API types
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  maestroId: string;
  enableTools?: boolean; // Optional: enable tool calling (default: true)
  enableMemory?: boolean; // Optional: enable conversation memory (default: true)
  requestedTool?: 'mindmap' | 'quiz' | 'flashcard' | 'demo' | 'summary' | 'search'; // Tool context injection
}
