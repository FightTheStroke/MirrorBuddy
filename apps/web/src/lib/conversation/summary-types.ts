/**
 * Conversation Summary Types
 */

export interface Message {
  role: string;
  content: string;
}

export interface ConversationSummaryResult {
  summary: string;
  keyFacts: {
    decisions: string[];
    preferences: string[];
    learned: string[];
  };
  topics: string[];
  learningsCount: number;
}

export interface Learning {
  category: string;
  insight: string;
  confidence: number;
}
