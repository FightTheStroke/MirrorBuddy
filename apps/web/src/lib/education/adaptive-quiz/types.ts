/**
 * Adaptive Quiz Types
 * Type definitions for adaptive quiz functionality
 */

import type { Subject } from '@/types';

/**
 * Review suggestion for low-performing topics
 */
export interface ReviewSuggestion {
  topic: string;
  subject: Subject;
  /** Why this is suggested */
  reason: string;
  /** Related materials to review */
  materials: Array<{
    id: string;
    title: string;
    type: 'material' | 'flashcard' | 'studykit';
    relevance: number;
  }>;
  /** Priority (1 = highest) */
  priority: number;
}

/**
 * Seen concept record
 */
export interface SeenConcept {
  concept: string;
  subject: Subject;
  firstSeenAt: Date;
  lastSeenAt: Date;
  timesReviewed: number;
  masteryLevel: number; // 0-100
}

/**
 * Difficulty adjustment result
 */
export interface DifficultyAdjustment {
  currentDifficulty: number;
  suggestedDifficulty: number;
  reason: string;
  /** Confidence in the suggestion (0-1) */
  confidence: number;
}

/**
 * Quiz performance analysis
 */
export interface QuizAnalysis {
  score: number;
  needsReview: boolean;
  weakTopics: string[];
  strongTopics: string[];
  averageTimePerQuestion: number;
  difficultyVsPerformance: 'too_easy' | 'appropriate' | 'too_hard';
}

/**
 * Thresholds for review suggestions
 */
export const REVIEW_THRESHOLD = 60; // Suggest review if score < 60%
export const MASTERY_THRESHOLD = 80; // Consider mastered if score >= 80%
export const MIN_QUESTIONS_FOR_ANALYSIS = 3; // Minimum questions for reliable analysis
