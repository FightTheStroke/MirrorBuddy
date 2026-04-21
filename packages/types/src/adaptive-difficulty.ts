export type AdaptiveDifficultyMode = 'manual' | 'guided' | 'balanced' | 'automatic';

export type AdaptiveSignalType =
  | 'question'
  | 'repeat_request'
  | 'frustration'
  | 'response_time_ms'
  | 'quiz_result'
  | 'flashcard_rating'
  | 'summary_request';

export type AdaptiveSignalSource =
  | 'chat'
  | 'voice'
  | 'quiz'
  | 'flashcard'
  | 'summary'
  | 'study-kit';

export interface AdaptiveSignalInput {
  type: AdaptiveSignalType;
  source: AdaptiveSignalSource;
  subject?: string;
  topic?: string;
  value?: number;
  rating?: 'again' | 'hard' | 'good' | 'easy';
  responseTimeMs?: number;
  baselineDifficulty?: number;
  mode?: AdaptiveDifficultyMode;
  metadata?: Record<string, string | number | boolean>;
}

export interface AdaptiveGlobalSignals {
  frustration: number;
  repeatRate: number;
  questionRate: number;
  averageResponseMs: number;
  lastUpdatedAt: string;
}

export interface AdaptiveSubjectProfile {
  mastery: number;
  targetDifficulty: number;
  lastUpdatedAt: string;
  lastQuizScore?: number;
}

export interface AdaptiveProfile {
  global: AdaptiveGlobalSignals;
  subjects: Record<string, AdaptiveSubjectProfile>;
  updatedAt: string;
}

export interface AdaptiveContext {
  mode: AdaptiveDifficultyMode;
  subject?: string;
  baselineDifficulty: number;
  targetDifficulty: number;
  apply: boolean;
  reason: string;
  pragmatic: boolean;
  constraints: {
    minDifficulty: number;
    maxDifficulty: number;
  };
}
