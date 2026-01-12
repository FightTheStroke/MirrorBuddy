// ============================================================================
// ADAPTIVE QUIZ ANALYSIS TESTS
// Comprehensive unit tests for quiz performance analysis and difficulty adjustment
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Quiz, QuizResult, Question } from '@/types';
import {
  analyzeQuizPerformance,
  calculateDifficultyAdjustment,
  selectQuestionsForDifficulty,
  REVIEW_THRESHOLD,
  MASTERY_THRESHOLD,
} from '../adaptive-quiz-analysis';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Adaptive Quiz Analysis', () => {
  describe('Constants', () => {
    it('should export REVIEW_THRESHOLD as 60', () => {
      expect(REVIEW_THRESHOLD).toBe(60);
    });

    it('should export MASTERY_THRESHOLD as 80', () => {
      expect(MASTERY_THRESHOLD).toBe(80);
    });
  });

  describe('analyzeQuizPerformance', () => {
    const mockQuiz: Quiz = {
      id: 'quiz-1',
      title: 'Test Quiz',
      topic: 'Math',
      questions: [
        { id: 'q1', text: 'Q1', topic: 'algebra', difficulty: 3, options: [], correctIndex: 0 },
        { id: 'q2', text: 'Q2', topic: 'algebra', difficulty: 3, options: [], correctIndex: 0 },
        { id: 'q3', text: 'Q3', topic: 'geometry', difficulty: 3, options: [], correctIndex: 0 },
        { id: 'q4', text: 'Q4', topic: 'geometry', difficulty: 3, options: [], correctIndex: 0 },
      ],
    };

    it('should identify needs review for low score', () => {
      const result: QuizResult = { quizId: 'quiz-1', score: 40, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'q1', correct: false, timeSpent: 10 },
        { questionId: 'q2', correct: true, timeSpent: 15 },
        { questionId: 'q3', correct: false, timeSpent: 12 },
        { questionId: 'q4', correct: false, timeSpent: 8 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.score).toBe(40);
      expect(analysis.needsReview).toBe(true);
    });

    it('should not need review for high score', () => {
      const result: QuizResult = { quizId: 'quiz-1', score: 85, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 10 },
        { questionId: 'q2', correct: true, timeSpent: 15 },
        { questionId: 'q3', correct: true, timeSpent: 12 },
        { questionId: 'q4', correct: false, timeSpent: 8 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.score).toBe(85);
      expect(analysis.needsReview).toBe(false);
    });

    it('should identify weak topics', () => {
      const result: QuizResult = { quizId: 'quiz-1', score: 50, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'q1', correct: false, timeSpent: 10 },
        { questionId: 'q2', correct: false, timeSpent: 15 },
        { questionId: 'q3', correct: true, timeSpent: 12 },
        { questionId: 'q4', correct: true, timeSpent: 8 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.weakTopics).toContain('algebra');
      expect(analysis.weakTopics).not.toContain('geometry');
    });

    it('should identify strong topics', () => {
      const result: QuizResult = { quizId: 'quiz-1', score: 75, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 10 },
        { questionId: 'q2', correct: true, timeSpent: 15 },
        { questionId: 'q3', correct: true, timeSpent: 12 },
        { questionId: 'q4', correct: false, timeSpent: 8 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.strongTopics).toContain('algebra');
    });

    it('should calculate average time per question', () => {
      const result: QuizResult = { quizId: 'quiz-1', score: 75, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 10 },
        { questionId: 'q2', correct: true, timeSpent: 20 },
        { questionId: 'q3', correct: true, timeSpent: 30 },
        { questionId: 'q4', correct: false, timeSpent: 40 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.averageTimePerQuestion).toBe(25);
    });

    it('should handle empty question results', () => {
      const result: QuizResult = { quizId: 'quiz-1', score: 0, completedAt: new Date().toISOString() };
      const questionResults: { questionId: string; correct: boolean; timeSpent: number }[] = [];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.averageTimePerQuestion).toBe(0);
    });

    it('should detect difficulty too easy', () => {
      const easyQuiz: Quiz = {
        id: 'quiz-1',
        title: 'Easy Quiz',
        topic: 'Math',
        questions: [
          { id: 'q1', text: 'Q1', topic: 'algebra', difficulty: 1, options: [], correctIndex: 0 },
          { id: 'q2', text: 'Q2', topic: 'algebra', difficulty: 2, options: [], correctIndex: 0 },
        ],
      };

      const result: QuizResult = { quizId: 'quiz-1', score: 90, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 5 },
        { questionId: 'q2', correct: true, timeSpent: 5 },
      ];

      const analysis = analyzeQuizPerformance(easyQuiz, result, questionResults);

      expect(analysis.difficultyVsPerformance).toBe('too_easy');
    });

    it('should detect difficulty too hard', () => {
      const hardQuiz: Quiz = {
        id: 'quiz-1',
        title: 'Hard Quiz',
        topic: 'Math',
        questions: [
          { id: 'q1', text: 'Q1', topic: 'algebra', difficulty: 4, options: [], correctIndex: 0 },
          { id: 'q2', text: 'Q2', topic: 'algebra', difficulty: 5, options: [], correctIndex: 0 },
        ],
      };

      const result: QuizResult = { quizId: 'quiz-1', score: 30, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'q1', correct: false, timeSpent: 60 },
        { questionId: 'q2', correct: false, timeSpent: 60 },
      ];

      const analysis = analyzeQuizPerformance(hardQuiz, result, questionResults);

      expect(analysis.difficultyVsPerformance).toBe('too_hard');
    });

    it('should detect appropriate difficulty', () => {
      const result: QuizResult = { quizId: 'quiz-1', score: 70, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 15 },
        { questionId: 'q2', correct: true, timeSpent: 15 },
        { questionId: 'q3', correct: true, timeSpent: 15 },
        { questionId: 'q4', correct: false, timeSpent: 15 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.difficultyVsPerformance).toBe('appropriate');
    });

    it('should skip unknown question IDs', () => {
      const result: QuizResult = { quizId: 'quiz-1', score: 50, completedAt: new Date().toISOString() };
      const questionResults = [
        { questionId: 'unknown-1', correct: true, timeSpent: 10 },
        { questionId: 'q1', correct: true, timeSpent: 10 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      // Should still work, just ignoring unknown questions
      expect(analysis.score).toBe(50);
    });
  });

  describe('calculateDifficultyAdjustment', () => {
    it('should return no change with insufficient data', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 80, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 85, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, recentResults);

      expect(adjustment.currentDifficulty).toBe(3);
      expect(adjustment.suggestedDifficulty).toBe(3);
      expect(adjustment.confidence).toBe(0.1);
      expect(adjustment.reason).toContain('abbastanza dati');
    });

    it('should increase difficulty for high scores', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 90, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 85, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 92, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, recentResults);

      expect(adjustment.suggestedDifficulty).toBeGreaterThan(3);
      expect(adjustment.confidence).toBe(0.8);
      expect(adjustment.reason).toContain('eccellenti');
    });

    it('should decrease difficulty for low scores', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 40, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 35, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 45, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, recentResults);

      expect(adjustment.suggestedDifficulty).toBeLessThan(3);
      expect(adjustment.confidence).toBe(0.8);
      expect(adjustment.reason).toContain('Riduciamo');
    });

    it('should not exceed max difficulty of 5', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 95, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 100, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 98, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(5, recentResults);

      expect(adjustment.suggestedDifficulty).toBeLessThanOrEqual(5);
    });

    it('should not go below min difficulty of 1', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 10, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 15, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 20, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(1, recentResults);

      expect(adjustment.suggestedDifficulty).toBeGreaterThanOrEqual(1);
    });

    it('should increase slightly for improving trend', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 60, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 68, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 75, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, recentResults);

      expect(adjustment.suggestedDifficulty).toBeGreaterThanOrEqual(3);
      expect(adjustment.reason).toContain('migliorando');
    });

    it('should decrease slightly for declining trend', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 75, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 68, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 60, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, recentResults);

      expect(adjustment.suggestedDifficulty).toBeLessThanOrEqual(3);
      expect(adjustment.reason).toContain('passo indietro');
    });

    it('should maintain difficulty for appropriate scores', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 70, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 72, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 71, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, recentResults);

      expect(adjustment.suggestedDifficulty).toBe(3);
      expect(adjustment.reason).toContain('appropriata');
    });

    it('should use custom window size', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 50, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 55, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 90, completedAt: new Date().toISOString() },
        { quizId: 'q4', score: 95, completedAt: new Date().toISOString() },
        { quizId: 'q5', score: 100, completedAt: new Date().toISOString() },
      ];

      // With window of 3, should only consider last 3 (90, 95, 100)
      const adjustment = calculateDifficultyAdjustment(3, recentResults, 3);

      expect(adjustment.suggestedDifficulty).toBeGreaterThan(3);
    });

    it('should round difficulty to nearest 0.5', () => {
      const recentResults: QuizResult[] = [
        { quizId: 'q1', score: 85, completedAt: new Date().toISOString() },
        { quizId: 'q2', score: 82, completedAt: new Date().toISOString() },
        { quizId: 'q3', score: 80, completedAt: new Date().toISOString() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, recentResults);

      // Check that it's a multiple of 0.5
      expect(adjustment.suggestedDifficulty % 0.5).toBe(0);
    });
  });

  describe('selectQuestionsForDifficulty', () => {
    const mockQuestions: Question[] = [
      { id: 'q1', text: 'Easy', topic: 'math', difficulty: 1, options: [], correctIndex: 0 },
      { id: 'q2', text: 'Medium', topic: 'math', difficulty: 3, options: [], correctIndex: 0 },
      { id: 'q3', text: 'Hard', topic: 'math', difficulty: 5, options: [], correctIndex: 0 },
      { id: 'q4', text: 'Easy2', topic: 'math', difficulty: 2, options: [], correctIndex: 0 },
      { id: 'q5', text: 'Hard2', topic: 'math', difficulty: 4, options: [], correctIndex: 0 },
    ];

    it('should select questions closest to target difficulty', () => {
      const selected = selectQuestionsForDifficulty(mockQuestions, 3, 2);

      expect(selected).toHaveLength(2);
      // Should prefer questions closer to difficulty 3
      const difficulties = selected.map((q) => q.difficulty);
      expect(difficulties).toContain(3);
    });

    it('should respect count limit', () => {
      const selected = selectQuestionsForDifficulty(mockQuestions, 3, 3);
      expect(selected).toHaveLength(3);
    });

    it('should handle count larger than available questions', () => {
      const selected = selectQuestionsForDifficulty(mockQuestions, 3, 10);
      expect(selected).toHaveLength(5);
    });

    it('should not duplicate questions', () => {
      const selected = selectQuestionsForDifficulty(mockQuestions, 3, 5);
      const ids = selected.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should shuffle selected questions', () => {
      // Run multiple times to verify shuffling (statistical test)
      const results: string[][] = [];
      for (let i = 0; i < 10; i++) {
        const selected = selectQuestionsForDifficulty(mockQuestions, 3, 3);
        results.push(selected.map((q) => q.id));
      }

      // Not all results should be identical (shuffling should vary)
      const firstResult = JSON.stringify(results[0]);
      const allSame = results.every((r) => JSON.stringify(r) === firstResult);
      // This might occasionally fail due to randomness, but very unlikely
      expect(allSame).toBe(false);
    });

    it('should handle empty questions array', () => {
      const selected = selectQuestionsForDifficulty([], 3, 5);
      expect(selected).toHaveLength(0);
    });

    it('should select easiest questions for low target', () => {
      const selected = selectQuestionsForDifficulty(mockQuestions, 1, 2);

      // Should include difficulty 1 question
      const difficulties = selected.map((q) => q.difficulty);
      expect(difficulties).toContain(1);
    });

    it('should select hardest questions for high target', () => {
      const selected = selectQuestionsForDifficulty(mockQuestions, 5, 2);

      // Should include difficulty 5 question
      const difficulties = selected.map((q) => q.difficulty);
      expect(difficulties).toContain(5);
    });
  });
});
