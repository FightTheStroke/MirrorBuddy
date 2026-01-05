/**
 * Tests for Adaptive Quiz Service
 * @module education/adaptive-quiz
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock hybrid retrieval - use vi.hoisted
const { mockHybridSearch } = vi.hoisted(() => ({
  mockHybridSearch: vi.fn(),
}));

vi.mock('@/lib/rag', () => ({
  hybridSearch: mockHybridSearch,
}));

import {
  analyzeQuizPerformance,
  generateReviewSuggestions,
  checkSeenConcepts,
  calculateDifficultyAdjustment,
  selectQuestionsForDifficulty,
  type QuizAnalysis,
} from '../adaptive-quiz';
import type { Quiz, QuizResult, Question } from '@/types';

describe('Adaptive Quiz Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeQuizPerformance', () => {
    const mockQuiz: Quiz = {
      id: 'quiz-1',
      title: 'Math Quiz',
      subject: 'mathematics',
      masteryThreshold: 70,
      xpReward: 100,
      questions: [
        { id: 'q1', text: 'Q1', type: 'multiple_choice', correctAnswer: 0, hints: [], explanation: '', difficulty: 2, subject: 'mathematics', topic: 'algebra' },
        { id: 'q2', text: 'Q2', type: 'multiple_choice', correctAnswer: 1, hints: [], explanation: '', difficulty: 3, subject: 'mathematics', topic: 'algebra' },
        { id: 'q3', text: 'Q3', type: 'multiple_choice', correctAnswer: 2, hints: [], explanation: '', difficulty: 3, subject: 'mathematics', topic: 'geometry' },
        { id: 'q4', text: 'Q4', type: 'multiple_choice', correctAnswer: 0, hints: [], explanation: '', difficulty: 4, subject: 'mathematics', topic: 'geometry' },
      ],
    };

    it('should identify weak topics when score < 60%', () => {
      const result: QuizResult = {
        quizId: 'quiz-1',
        score: 50,
        totalQuestions: 4,
        correctAnswers: 2,
        timeSpent: 120,
        masteryAchieved: false,
        xpEarned: 50,
        completedAt: new Date(),
      };

      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 30 },
        { questionId: 'q2', correct: false, timeSpent: 30 },
        { questionId: 'q3', correct: true, timeSpent: 30 },
        { questionId: 'q4', correct: false, timeSpent: 30 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.needsReview).toBe(true);
      expect(analysis.score).toBe(50);
    });

    it('should not require review when score >= 60%', () => {
      const result: QuizResult = {
        quizId: 'quiz-1',
        score: 75,
        totalQuestions: 4,
        correctAnswers: 3,
        timeSpent: 120,
        masteryAchieved: true,
        xpEarned: 75,
        completedAt: new Date(),
      };

      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 30 },
        { questionId: 'q2', correct: true, timeSpent: 30 },
        { questionId: 'q3', correct: true, timeSpent: 30 },
        { questionId: 'q4', correct: false, timeSpent: 30 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.needsReview).toBe(false);
    });

    it('should identify strong topics when score >= 80%', () => {
      const result: QuizResult = {
        quizId: 'quiz-1',
        score: 100,
        totalQuestions: 4,
        correctAnswers: 4,
        timeSpent: 120,
        masteryAchieved: true,
        xpEarned: 100,
        completedAt: new Date(),
      };

      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 20 },
        { questionId: 'q2', correct: true, timeSpent: 20 },
        { questionId: 'q3', correct: true, timeSpent: 20 },
        { questionId: 'q4', correct: true, timeSpent: 20 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.strongTopics).toContain('algebra');
      expect(analysis.strongTopics).toContain('geometry');
      expect(analysis.weakTopics.length).toBe(0);
    });

    it('should detect difficulty is too hard when score < 60% and avg difficulty > 3', () => {
      const hardQuiz: Quiz = {
        ...mockQuiz,
        questions: mockQuiz.questions.map((q) => ({ ...q, difficulty: 4 as const })),
      };

      const result: QuizResult = {
        quizId: 'quiz-1',
        score: 25,
        totalQuestions: 4,
        correctAnswers: 1,
        timeSpent: 120,
        masteryAchieved: false,
        xpEarned: 25,
        completedAt: new Date(),
      };

      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 40 },
        { questionId: 'q2', correct: false, timeSpent: 40 },
        { questionId: 'q3', correct: false, timeSpent: 40 },
        { questionId: 'q4', correct: false, timeSpent: 40 },
      ];

      const analysis = analyzeQuizPerformance(hardQuiz, result, questionResults);

      expect(analysis.difficultyVsPerformance).toBe('too_hard');
    });

    it('should detect difficulty is too easy when score >= 80% and avg difficulty < 3', () => {
      const easyQuiz: Quiz = {
        ...mockQuiz,
        questions: mockQuiz.questions.map((q) => ({ ...q, difficulty: 1 as const })),
      };

      const result: QuizResult = {
        quizId: 'quiz-1',
        score: 100,
        totalQuestions: 4,
        correctAnswers: 4,
        timeSpent: 40,
        masteryAchieved: true,
        xpEarned: 100,
        completedAt: new Date(),
      };

      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 10 },
        { questionId: 'q2', correct: true, timeSpent: 10 },
        { questionId: 'q3', correct: true, timeSpent: 10 },
        { questionId: 'q4', correct: true, timeSpent: 10 },
      ];

      const analysis = analyzeQuizPerformance(easyQuiz, result, questionResults);

      expect(analysis.difficultyVsPerformance).toBe('too_easy');
    });

    it('should calculate average time per question', () => {
      const result: QuizResult = {
        quizId: 'quiz-1',
        score: 75,
        totalQuestions: 4,
        correctAnswers: 3,
        timeSpent: 120,
        masteryAchieved: true,
        xpEarned: 75,
        completedAt: new Date(),
      };

      const questionResults = [
        { questionId: 'q1', correct: true, timeSpent: 20 },
        { questionId: 'q2', correct: true, timeSpent: 40 },
        { questionId: 'q3', correct: true, timeSpent: 30 },
        { questionId: 'q4', correct: false, timeSpent: 30 },
      ];

      const analysis = analyzeQuizPerformance(mockQuiz, result, questionResults);

      expect(analysis.averageTimePerQuestion).toBe(30);
    });
  });

  describe('generateReviewSuggestions', () => {
    it('should return empty array when no review needed', async () => {
      const analysis: QuizAnalysis = {
        score: 85,
        needsReview: false,
        weakTopics: [],
        strongTopics: ['algebra'],
        averageTimePerQuestion: 25,
        difficultyVsPerformance: 'appropriate',
      };

      const suggestions = await generateReviewSuggestions('user-1', analysis, 'mathematics');

      expect(suggestions).toEqual([]);
    });

    it('should generate suggestions for weak topics', async () => {
      const analysis: QuizAnalysis = {
        score: 40,
        needsReview: true,
        weakTopics: ['algebra', 'geometry'],
        strongTopics: [],
        averageTimePerQuestion: 45,
        difficultyVsPerformance: 'appropriate',
      };

      mockHybridSearch.mockResolvedValue([
        {
          id: 'emb-1',
          sourceId: 'mat-1',
          sourceType: 'material',
          content: 'Algebra fundamentals explained simply',
          combinedScore: 0.85,
        },
      ]);

      const suggestions = await generateReviewSuggestions('user-1', analysis, 'mathematics');

      expect(suggestions.length).toBe(2);
      expect(suggestions[0].topic).toBe('algebra');
      expect(suggestions[0].materials.length).toBeGreaterThan(0);
    });

    it('should handle search errors gracefully', async () => {
      const analysis: QuizAnalysis = {
        score: 30,
        needsReview: true,
        weakTopics: ['trigonometry'],
        strongTopics: [],
        averageTimePerQuestion: 60,
        difficultyVsPerformance: 'too_hard',
      };

      mockHybridSearch.mockRejectedValue(new Error('Search failed'));

      const suggestions = await generateReviewSuggestions('user-1', analysis, 'mathematics');

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].materials).toEqual([]);
      expect(suggestions[0].priority).toBe(3);
    });
  });

  describe('checkSeenConcepts', () => {
    it('should identify seen concepts with high similarity', async () => {
      mockHybridSearch.mockResolvedValue([
        {
          id: 'emb-1',
          sourceId: 'mat-1',
          sourceType: 'material',
          content: 'Pythagorean theorem',
          combinedScore: 0.95,
        },
      ]);

      const result = await checkSeenConcepts('user-1', ['Pythagorean theorem'], 'mathematics');

      expect(result.get('Pythagorean theorem')).not.toBeNull();
    });

    it('should return null for unseen concepts', async () => {
      mockHybridSearch.mockResolvedValue([]);

      const result = await checkSeenConcepts('user-1', ['new concept'], 'mathematics');

      expect(result.get('new concept')).toBeNull();
    });

    it('should handle multiple concepts', async () => {
      mockHybridSearch
        .mockResolvedValueOnce([{ combinedScore: 0.9 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ combinedScore: 0.85 }]);

      const result = await checkSeenConcepts(
        'user-1',
        ['concept-a', 'concept-b', 'concept-c'],
        'mathematics'
      );

      expect(result.size).toBe(3);
    });
  });

  describe('calculateDifficultyAdjustment', () => {
    it('should not adjust with insufficient data', () => {
      const results: QuizResult[] = [
        { quizId: 'q1', score: 80, totalQuestions: 5, correctAnswers: 4, timeSpent: 100, masteryAchieved: true, xpEarned: 80, completedAt: new Date() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, results);

      expect(adjustment.suggestedDifficulty).toBe(3);
      expect(adjustment.confidence).toBeLessThan(0.5);
    });

    it('should increase difficulty when performing well', () => {
      const results: QuizResult[] = [
        { quizId: 'q1', score: 90, totalQuestions: 5, correctAnswers: 4, timeSpent: 100, masteryAchieved: true, xpEarned: 90, completedAt: new Date() },
        { quizId: 'q2', score: 85, totalQuestions: 5, correctAnswers: 4, timeSpent: 100, masteryAchieved: true, xpEarned: 85, completedAt: new Date() },
        { quizId: 'q3', score: 95, totalQuestions: 5, correctAnswers: 5, timeSpent: 100, masteryAchieved: true, xpEarned: 95, completedAt: new Date() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, results);

      expect(adjustment.suggestedDifficulty).toBeGreaterThan(3);
    });

    it('should decrease difficulty when struggling', () => {
      const results: QuizResult[] = [
        { quizId: 'q1', score: 40, totalQuestions: 5, correctAnswers: 2, timeSpent: 100, masteryAchieved: false, xpEarned: 40, completedAt: new Date() },
        { quizId: 'q2', score: 35, totalQuestions: 5, correctAnswers: 2, timeSpent: 100, masteryAchieved: false, xpEarned: 35, completedAt: new Date() },
        { quizId: 'q3', score: 45, totalQuestions: 5, correctAnswers: 2, timeSpent: 100, masteryAchieved: false, xpEarned: 45, completedAt: new Date() },
      ];

      const adjustment = calculateDifficultyAdjustment(4, results);

      expect(adjustment.suggestedDifficulty).toBeLessThan(4);
    });

    it('should maintain difficulty when in learning zone', () => {
      const results: QuizResult[] = [
        { quizId: 'q1', score: 70, totalQuestions: 5, correctAnswers: 3, timeSpent: 100, masteryAchieved: true, xpEarned: 70, completedAt: new Date() },
        { quizId: 'q2', score: 72, totalQuestions: 5, correctAnswers: 4, timeSpent: 100, masteryAchieved: true, xpEarned: 72, completedAt: new Date() },
        { quizId: 'q3', score: 68, totalQuestions: 5, correctAnswers: 3, timeSpent: 100, masteryAchieved: false, xpEarned: 68, completedAt: new Date() },
      ];

      const adjustment = calculateDifficultyAdjustment(3, results);

      expect(adjustment.suggestedDifficulty).toBeCloseTo(3, 0.5);
    });

    it('should not exceed max difficulty of 5', () => {
      const results: QuizResult[] = Array(5).fill(null).map((_, i) => ({
        quizId: `q${i}`,
        score: 100,
        totalQuestions: 5,
        correctAnswers: 5,
        timeSpent: 50,
        masteryAchieved: true,
        xpEarned: 100,
        completedAt: new Date(),
      }));

      const adjustment = calculateDifficultyAdjustment(5, results);

      expect(adjustment.suggestedDifficulty).toBeLessThanOrEqual(5);
    });

    it('should not go below min difficulty of 1', () => {
      const results: QuizResult[] = Array(5).fill(null).map((_, i) => ({
        quizId: `q${i}`,
        score: 10,
        totalQuestions: 5,
        correctAnswers: 0,
        timeSpent: 200,
        masteryAchieved: false,
        xpEarned: 10,
        completedAt: new Date(),
      }));

      const adjustment = calculateDifficultyAdjustment(1, results);

      expect(adjustment.suggestedDifficulty).toBeGreaterThanOrEqual(1);
    });
  });

  describe('selectQuestionsForDifficulty', () => {
    const questions: Question[] = [
      { id: 'q1', text: 'Easy', type: 'multiple_choice', correctAnswer: 0, hints: [], explanation: '', difficulty: 1, subject: 'mathematics', topic: 'basic' },
      { id: 'q2', text: 'Medium-Easy', type: 'multiple_choice', correctAnswer: 0, hints: [], explanation: '', difficulty: 2, subject: 'mathematics', topic: 'basic' },
      { id: 'q3', text: 'Medium', type: 'multiple_choice', correctAnswer: 0, hints: [], explanation: '', difficulty: 3, subject: 'mathematics', topic: 'basic' },
      { id: 'q4', text: 'Medium-Hard', type: 'multiple_choice', correctAnswer: 0, hints: [], explanation: '', difficulty: 4, subject: 'mathematics', topic: 'basic' },
      { id: 'q5', text: 'Hard', type: 'multiple_choice', correctAnswer: 0, hints: [], explanation: '', difficulty: 5, subject: 'mathematics', topic: 'basic' },
    ];

    it('should select questions closest to target difficulty', () => {
      const selected = selectQuestionsForDifficulty(questions, 3, 3);

      expect(selected.length).toBe(3);
      // Should include the medium difficulty question
      expect(selected.some((q) => q.difficulty === 3)).toBe(true);
    });

    it('should not select more than available', () => {
      const selected = selectQuestionsForDifficulty(questions, 3, 10);

      expect(selected.length).toBe(5);
    });

    it('should select unique questions', () => {
      const selected = selectQuestionsForDifficulty(questions, 3, 5);
      const ids = selected.map((q) => q.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should prefer easier questions when target is low', () => {
      const selected = selectQuestionsForDifficulty(questions, 1, 2);
      const avgDifficulty = selected.reduce((sum, q) => sum + q.difficulty, 0) / selected.length;

      expect(avgDifficulty).toBeLessThan(3);
    });

    it('should prefer harder questions when target is high', () => {
      const selected = selectQuestionsForDifficulty(questions, 5, 2);
      const avgDifficulty = selected.reduce((sum, q) => sum + q.difficulty, 0) / selected.length;

      expect(avgDifficulty).toBeGreaterThan(3);
    });
  });
});
