/**
 * Types for showcase chat page
 */

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  isTyping?: boolean;
}

export interface ConversationOption {
  id: string;
  text: string;
  nextMessages: Message[];
  nextOptions?: ConversationOption[];
}

export interface ConversationNode {
  initialMessages: Message[];
  options: ConversationOption[];
}
