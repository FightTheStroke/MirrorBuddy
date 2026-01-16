/**
 * Types for i18n-ready frustration pattern detection
 */

export type SupportedLocale = 'it' | 'en' | 'es' | 'fr' | 'de';

export interface FrustrationPattern {
  pattern: RegExp;
  weight: number; // 0-1, how strongly this indicates frustration
  category: 'explicit' | 'implicit' | 'question' | 'repeat';
}

export interface LocalePatterns {
  locale: SupportedLocale;
  frustration: FrustrationPattern[];
  repeatRequest: FrustrationPattern[];
  confusion: FrustrationPattern[];
  // Filler words that indicate hesitation
  fillers: string[];
}

export interface PatternMatch {
  locale: SupportedLocale;
  category: FrustrationPattern['category'];
  weight: number;
  matchedText: string;
}

export interface TextAnalysisResult {
  frustrationScore: number; // 0-1
  repeatRequestScore: number; // 0-1
  confusionScore: number; // 0-1
  matches: PatternMatch[];
  detectedLocale: SupportedLocale | null;
}

export interface RepeatedAttemptTracker {
  questionHash: string;
  count: number;
  firstAskedAt: number;
  lastAskedAt: number;
}

export interface ConversationTrend {
  windowSize: number;
  recentScores: number[];
  trend: 'improving' | 'stable' | 'declining';
  averageScore: number;
}
