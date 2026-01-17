/**
 * Quiz Analysis Functions
 * Analyze quiz results and generate review suggestions
 */

import { logger } from '@/lib/logger';
import { hybridSearch } from '@/lib/rag';
import type { Quiz, QuizResult, Subject } from '@/types';
import type { QuizAnalysis, ReviewSuggestion } from './types';
import { REVIEW_THRESHOLD, MASTERY_THRESHOLD } from './types';

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
