// ============================================================================
// CONVERSATION TYPES - Chat Messages, Conversations, Evaluations
// ============================================================================

export type ChatRole = 'system' | 'user' | 'assistant';

/**
 * Session evaluation data displayed inline in chat.
 * Generated when a Maestro session ends.
 */
export interface SessionEvaluation {
  score: number; // 1-10
  feedback: string; // Maestro's comment
  strengths: string[]; // Punti di forza
  areasToImprove: string[]; // Da migliorare
  sessionDuration: number; // minutes
  questionsAsked: number;
  xpEarned: number;
  savedToDiary: boolean; // If written to Learning table
}

export type ChatMessageType = 'text' | 'voice' | 'evaluation' | 'tool';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  tokens?: number;
  cost?: number;
  /** Message type for special rendering */
  type?: ChatMessageType;
  /** Evaluation data when type is 'evaluation' */
  evaluation?: SessionEvaluation;
  /** Indicates this was from voice transcript */
  isVoice?: boolean;
  /**
   * Optional per-message speaker override (display name + avatar). Set only for
   * assistant messages spoken by someone other than the session's Maestro — e.g.
   * the neutral study-coach opener, which is the coach (Melissa) speaking, not
   * the Maestro. When unset, the UI attributes the message to the session Maestro.
   */
  speaker?: { name: string; avatar: string };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  maestroId?: string;
  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}
