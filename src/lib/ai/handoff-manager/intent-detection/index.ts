/**
 * Intent detection for handoff analysis
 */

import type { IntentType } from './types';

export interface DetectedIntent {
  type: IntentType;
  confidence: number;
  subject?: string;
}

/**
 * Detect intent from user message
 */
export function detectIntent(message: string): DetectedIntent {
  const lowerMessage = message.toLowerCase();

  // Crisis detection
  if (/(?:help|aiuto|crisis|disperato|emergency|nessuno|abbandonato)/i.test(lowerMessage)) {
    return { type: 'crisis', confidence: 0.95 };
  }

  // Emotional support
  if (/(?:feel|sento|triste|worried|stressed|ansioso|preoccupato|difficile)/i.test(lowerMessage)) {
    return { type: 'emotional_support', confidence: 0.85 };
  }

  // Method/study help
  if (/(?:organize|method|come studiare|come|strategia|plan|help me study)/i.test(lowerMessage)) {
    return { type: 'method_help', confidence: 0.8 };
  }

  // Academic help - subject specific
  const subjectPatterns: Record<string, string> = {
    mathematics: 'math|matematica|algebra|calculus|geometry',
    physics: 'physics|fisica|quantum|motion|force',
    chemistry: 'chemistry|chimica|reaction|element',
    history: 'history|storia|war|empire|revolution',
  };

  for (const [subject, pattern] of Object.entries(subjectPatterns)) {
    if (new RegExp(pattern, 'i').test(lowerMessage)) {
      return { type: 'academic_help', confidence: 0.9, subject };
    }
  }

  // Tool request
  if (/(?:map|quiz|card|flashcard|diagram|timeline|summary)/i.test(lowerMessage)) {
    return { type: 'tool_request', confidence: 0.8 };
  }

  // Default: general chat
  return { type: 'general_chat', confidence: 0.6 };
}

export type { IntentType } from './types';
