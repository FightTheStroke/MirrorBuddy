/**
 * Difficulty Adjustment Functions
 * Calculate and adjust quiz difficulty based on performance
 */

import { logger } from '@/lib/logger';
import type { QuizResult, Question } from '@/types';
import type { DifficultyAdjustment } from './types';
import { REVIEW_THRESHOLD, MASTERY_THRESHOLD, MIN_QUESTIONS_FOR_ANALYSIS } from './types';

/**
 * Calculate difficulty adjustment based on performance
 * [F-20]: Adjust quiz difficulty
 */
export function calculateDifficultyAdjustment(
  currentDifficulty: number,
  recentResults: QuizResult[],
  windowSize: number = 5
): DifficultyAdjustment {
  if (recentResults.length < MIN_QUESTIONS_FOR_ANALYSIS) {
    return {
      currentDifficulty,
      suggestedDifficulty: currentDifficulty,
      reason: 'Non ci sono abbastanza dati per regolare la difficoltà',
      confidence: 0.1,
    };
  }

  // Take most recent results up to windowSize
  const window = recentResults.slice(-windowSize);
  const avgScore = window.reduce((sum, r) => sum + r.score, 0) / window.length;

  // Calculate trend (are scores improving or declining?)
  let trend = 0;
  for (let i = 1; i < window.length; i++) {
    trend += window[i].score - window[i - 1].score;
  }
  trend = trend / (window.length - 1);

  let suggestedDifficulty = currentDifficulty;
  let reason = 'La difficoltà attuale è appropriata';
  let confidence = 0.5;

  // Adjust based on average score
  if (avgScore >= MASTERY_THRESHOLD) {
    // Student is doing very well, increase difficulty
    suggestedDifficulty = Math.min(5, currentDifficulty + 1);
    reason = 'Le tue prestazioni sono eccellenti! Aumentiamo la difficoltà';
    confidence = 0.8;
  } else if (avgScore < REVIEW_THRESHOLD) {
    // Student is struggling, decrease difficulty
    suggestedDifficulty = Math.max(1, currentDifficulty - 1);
    reason = 'Riduciamo un po\' la difficoltà per consolidare le basi';
    confidence = 0.8;
  } else if (avgScore >= 60 && avgScore < 80) {
    // Student is in the learning zone
    if (trend > 5) {
      // Improving, might be ready for more challenge
      suggestedDifficulty = Math.min(5, currentDifficulty + 0.5);
      reason = 'Stai migliorando! Proviamo qualcosa di più sfidante';
      confidence = 0.6;
    } else if (trend < -5) {
      // Declining, might need easier content
      suggestedDifficulty = Math.max(1, currentDifficulty - 0.5);
      reason = 'Facciamo un passo indietro per consolidare';
      confidence = 0.6;
    }
  }

  // Round to nearest 0.5
  suggestedDifficulty = Math.round(suggestedDifficulty * 2) / 2;

  logger.debug('[AdaptiveQuiz] Difficulty adjustment calculated', {
    currentDifficulty,
    suggestedDifficulty,
    avgScore,
    trend,
    confidence,
  });

  return {
    currentDifficulty,
    suggestedDifficulty,
    reason,
    confidence,
  };
}

/**
 * Select questions based on target difficulty
 */
export function selectQuestionsForDifficulty(
  questions: Question[],
  targetDifficulty: number,
  count: number
): Question[] {
  // Sort by how close they are to target difficulty
  const sorted = [...questions].sort((a, b) => {
    const diffA = Math.abs(a.difficulty - targetDifficulty);
    const diffB = Math.abs(b.difficulty - targetDifficulty);
    return diffA - diffB;
  });

  // Take the closest ones, but add some variety
  const selected: Question[] = [];
  const used = new Set<string>();

  // First, get questions closest to target
  for (const q of sorted) {
    if (selected.length >= count) break;
    if (!used.has(q.id)) {
      selected.push(q);
      used.add(q.id);
    }
  }

  // Shuffle to avoid predictability
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}
