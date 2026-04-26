import type { Subject, ToolType } from '@/types';
import type { EmotionalIndicator } from './types';
import {
  SUBJECT_PATTERNS,
  EMOTIONAL_PATTERNS,
  METHOD_PATTERNS,
  TOOL_PATTERNS,
  TECH_SUPPORT_PATTERNS,
  TOOL_TYPE_PATTERNS,
  CRISIS_PATTERNS,
} from './patterns';

export function detectSubject(message: string): Subject | undefined {
  for (const [subject, patterns] of Object.entries(SUBJECT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return subject as Subject;
      }
    }
  }
  return undefined;
}

export function detectEmotions(message: string): EmotionalIndicator[] {
  const detected: EmotionalIndicator[] = [];

  for (const [emotion, patterns] of Object.entries(EMOTIONAL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        detected.push(emotion as EmotionalIndicator);
        break;
      }
    }
  }

  return detected;
}

export function isCrisis(message: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(message));
}

export function isMethodRequest(message: string): boolean {
  if (METHOD_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }

  // Fallback keywords to catch wording variations for method/coaching needs
  return /\b(metodo\s+di\s+studio|organizzarmi|organizz\w*|concentrarmi|concentrar[ei]|gestire\s+(meglio\s+)?(il\s+)?tempo|strategia(\s+di\s+studio)?|tecnica(\s+di\s+studio)?|non\s+so\s+da\s+dove\s+iniziare|studiare\s+meglio|consiglio\s+.*studiare|come\s+(devo|posso)\s+studiare)\b/i.test(message);
}

export function isToolRequest(message: string): boolean {
  return TOOL_PATTERNS.some((pattern) => pattern.test(message));
}

export function isTechSupport(message: string): boolean {
  return TECH_SUPPORT_PATTERNS.some((pattern) => pattern.test(message));
}

export function detectToolType(message: string): ToolType | null {
  const normalizedMessage = message.toLowerCase().trim();

  for (const [toolType, patterns] of Object.entries(TOOL_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedMessage)) {
        return toolType as ToolType;
      }
    }
  }

  return null;
}

