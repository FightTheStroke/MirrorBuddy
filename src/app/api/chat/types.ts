/**
 * Chat API types
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Supported UI languages */
export type SupportedLanguage = "it" | "en" | "es" | "fr" | "de";

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  maestroId: string;
  conversationId?: string; // Optional: for tool context injection
  enableTools?: boolean; // Optional: enable tool calling (default: true)
  enableMemory?: boolean; // Optional: enable conversation memory (default: true)
  requestedTool?:
    | "mindmap"
    | "quiz"
    | "flashcard"
    | "demo"
    | "summary"
    | "search"
    | "pdf"
    | "webcam"
    | "homework"
    | "study-kit"; // Tool context injection
  language?: SupportedLanguage; // User's preferred language (default: 'it')
}
