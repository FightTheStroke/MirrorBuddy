/**
 * Adaptive Quiz Service
 * Handles quiz review suggestions, seen concept tracking, and difficulty adjustment
 *
 * Plan 9 - Wave 4 [F-18, F-19, F-20]
 *
 * @module education/adaptive-quiz
 */

import { logger } from '@/lib/logger';
import { hybridSearch, type HybridRetrievalResult } from '@/lib/rag';
import type { Quiz, QuizResult, Question, Subject } from '@/types';

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
const REVIEW_THRESHOLD = 60; // Suggest review if score < 60%
const MASTERY_THRESHOLD = 80; // Consider mastered if score >= 80%
const MIN_QUESTIONS_FOR_ANALYSIS = 3; // Minimum questions for reliable analysis

/**
 * Analyze quiz results to identify weak areas
 */
export function analyzeQuizPerformance(
  quiz: Quiz,
  result: QuizResult,
  questionResults: Array<{ questionId: string; correct: boolean; timeSpent: number }>
): QuizAnalysis {
  const score = result.score;
  const needsReview = score < REVIEW_THRESHOLD;

  // Group by topic
  const topicPerformance = new Map<string, { correct: number; total: number }>();

  for (const qr of questionResults) {
    const question = quiz.questions.find((q) => q.id === qr.questionId);
    if (!question) continue;

    const current = topicPerformance.get(question.topic) ?? { correct: 0, total: 0 };
    current.total++;
    if (qr.correct) current.correct++;
    topicPerformance.set(question.topic, current);
  }

  // Identify weak and strong topics
  const weakTopics: string[] = [];
  const strongTopics: string[] = [];

  for (const [topic, perf] of topicPerformance) {
    const topicScore = (perf.correct / perf.total) * 100;
    if (topicScore < REVIEW_THRESHOLD) {
      weakTopics.push(topic);
    } else if (topicScore >= MASTERY_THRESHOLD) {
      strongTopics.push(topic);
    }
  }

  // Calculate average time per question
  const averageTimePerQuestion =
    questionResults.length > 0
      ? questionResults.reduce((sum, qr) => sum + qr.timeSpent, 0) / questionResults.length
      : 0;

  // Determine if difficulty is appropriate
  const avgDifficulty =
    quiz.questions.reduce((sum, q) => sum + q.difficulty, 0) / quiz.questions.length;
  let difficultyVsPerformance: 'too_easy' | 'appropriate' | 'too_hard';

  if (score >= MASTERY_THRESHOLD && avgDifficulty < 3) {
    difficultyVsPerformance = 'too_easy';
  } else if (score < REVIEW_THRESHOLD && avgDifficulty > 3) {
    difficultyVsPerformance = 'too_hard';
  } else {
    difficultyVsPerformance = 'appropriate';
  }

  logger.debug('[AdaptiveQuiz] Performance analyzed', {
    score,
    needsReview,
    weakTopics: weakTopics.length,
    strongTopics: strongTopics.length,
    difficultyVsPerformance,
  });

  return {
    score,
    needsReview,
    weakTopics,
    strongTopics,
    averageTimePerQuestion,
    difficultyVsPerformance,
  };
}

/**
 * Generate review suggestions for weak topics
 * [F-18]: Quiz < 60% review suggestions
 */
export async function generateReviewSuggestions(
  userId: string,
  analysis: QuizAnalysis,
  subject: Subject
): Promise<ReviewSuggestion[]> {
  if (!analysis.needsReview || analysis.weakTopics.length === 0) {
    return [];
  }

  const suggestions: ReviewSuggestion[] = [];

  for (const topic of analysis.weakTopics) {
    try {
      // Search for related materials using hybrid retrieval
      const searchResults = await hybridSearch({
        userId,
        query: topic,
        limit: 5,
        sourceType: 'material',
        subject: subject.toLowerCase(),
        minScore: 0.4,
      });

      const materials = searchResults.map((r) => ({
        id: r.sourceId,
        title: r.content.substring(0, 50) + (r.content.length > 50 ? '...' : ''),
        type: r.sourceType as 'material' | 'flashcard' | 'studykit',
        relevance: r.combinedScore,
      }));

      suggestions.push({
        topic,
        subject,
        reason: `Hai risposto correttamente a meno del ${REVIEW_THRESHOLD}% delle domande su questo argomento`,
        materials,
        priority: materials.length > 0 ? 1 : 2,
      });
    } catch (error) {
      logger.error('[AdaptiveQuiz] Error generating review suggestion', {
        topic,
        error: String(error),
      });

      // Add suggestion without materials
      suggestions.push({
        topic,
        subject,
        reason: `Hai bisogno di ripasso su questo argomento`,
        materials: [],
        priority: 3,
      });
    }
  }

  // Sort by priority
  suggestions.sort((a, b) => a.priority - b.priority);

  logger.info('[AdaptiveQuiz] Generated review suggestions', {
    userId,
    count: suggestions.length,
    topics: suggestions.map((s) => s.topic),
  });

  return suggestions;
}

/**
 * Check if concepts have been seen before
 * [F-19]: Flag already-seen concepts
 */
export async function checkSeenConcepts(
  userId: string,
  concepts: string[],
  subject: Subject
): Promise<Map<string, SeenConcept | null>> {
  const results = new Map<string, SeenConcept | null>();

  for (const concept of concepts) {
    try {
      // Search for this concept in user's history
      const searchResults = await hybridSearch({
        userId,
        query: concept,
        limit: 1,
        subject: subject.toLowerCase(),
        minScore: 0.7, // High threshold for "same" concept
      });

      if (searchResults.length > 0 && searchResults[0].combinedScore > 0.8) {
        // Concept was seen before (would need to be enhanced with actual tracking)
        results.set(concept, {
          concept,
          subject,
          firstSeenAt: new Date(), // Would come from actual tracking
          lastSeenAt: new Date(),
          timesReviewed: 1,
          masteryLevel: Math.round(searchResults[0].combinedScore * 100),
        });
      } else {
        results.set(concept, null);
      }
    } catch (error) {
      logger.error('[AdaptiveQuiz] Error checking seen concept', {
        concept,
        error: String(error),
      });
      results.set(concept, null);
    }
  }

  logger.debug('[AdaptiveQuiz] Checked seen concepts', {
    total: concepts.length,
    seen: [...results.values()].filter((v) => v !== null).length,
  });

  return results;
}

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
