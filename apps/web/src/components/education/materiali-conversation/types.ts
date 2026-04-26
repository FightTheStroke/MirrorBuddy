/**
 * @file types.ts
 * @brief Types for materiali conversation
 */

import type { ChatMessage, ToolCall } from '@/types';

export interface Character {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: 'learning_coach' | 'buddy' | 'maestro';
  greeting: string;
  systemPrompt: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  url: string;
  mimeType: string;
}

export interface ConversationMessage extends ChatMessage {
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
}

