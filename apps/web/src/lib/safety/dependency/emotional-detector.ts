/**
 * Emotional Detector
 * Reference: Amodei "The Adolescence of Technology" (2026)
 */

import {
  EMOTIONAL_VENTING_PATTERNS,
  AI_PREFERENCE_PATTERNS,
  EmotionalAnalysisResult,
} from "./types";

export function detectEmotionalVenting(message: string): boolean {
  return EMOTIONAL_VENTING_PATTERNS.some((pattern) => pattern.test(message));
}

export function detectAIPreference(message: string): boolean {
  return AI_PREFERENCE_PATTERNS.some((pattern) => pattern.test(message));
}

export function analyzeMessage(message: string): EmotionalAnalysisResult {
  const emotionalPatterns: string[] = [];
  const preferencePatterns: string[] = [];

  for (const pattern of EMOTIONAL_VENTING_PATTERNS) {
    if (pattern.test(message)) {
      emotionalPatterns.push(pattern.source);
    }
  }

  for (const pattern of AI_PREFERENCE_PATTERNS) {
    if (pattern.test(message)) {
      preferencePatterns.push(pattern.source);
    }
  }

  return {
    hasEmotionalVenting: emotionalPatterns.length > 0,
    hasAIPreference: preferencePatterns.length > 0,
    emotionalPatterns,
    preferencePatterns,
  };
}

export function analyzeMessages(messages: string[]): {
  totalEmotionalVents: number;
  totalAIPreferences: number;
  details: EmotionalAnalysisResult[];
} {
  const details = messages.map(analyzeMessage);
  return {
    totalEmotionalVents: details.filter((d) => d.hasEmotionalVenting).length,
    totalAIPreferences: details.filter((d) => d.hasAIPreference).length,
    details,
  };
}
