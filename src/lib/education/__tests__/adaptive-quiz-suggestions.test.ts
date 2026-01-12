// ============================================================================
// ADAPTIVE QUIZ SUGGESTIONS TESTS
// Unit tests for review suggestions and seen concept tracking
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Subject } from '@/types';
import type { QuizAnalysis } from '../adaptive-quiz-analysis';

// Helper to create mock QuizAnalysis with extended test-only fields
// The test uses additional fields not in the production interface
const mockAnalysis = (partial: {
  percentageCorrect: number;
  totalQuestions: number;
  correctAnswers: number;
  averageResponseTime: number;
  needsReview: boolean;
  weakTopics: string[];
  strongTopics: string[];
  difficultyTrend: string;
  suggestedNextDifficulty: string;
}) => partial as unknown as QuizAnalysis;

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock hybridSearch
const mockHybridSearch = vi.fn();
vi.mock('@/lib/rag', () => ({
  hybridSearch: (...args: unknown[]) => mockHybridSearch(...args),
}));

// Import after mocks
import {
  generateReviewSuggestions,
  checkSeenConcepts,
} from '../adaptive-quiz-suggestions';

describe('Adaptive Quiz Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHybridSearch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateReviewSuggestions', () => {
    const mockUserId = 'user-123';
    const mockSubject: Subject = 'mathematics';

    it('should return empty array when needsReview is false', async () => {
      const analysis = mockAnalysis({
        percentageCorrect: 85,
        totalQuestions: 10,
        correctAnswers: 8.5,
        averageResponseTime: 15000,
        needsReview: false,
        weakTopics: [],
        strongTopics: ['algebra'],
        difficultyTrend: 'stable',
        suggestedNextDifficulty: 'intermediate',
      });

      const result = await generateReviewSuggestions(
        mockUserId,
        analysis,
        mockSubject
      );

      expect(result).toEqual([]);
      expect(mockHybridSearch).not.toHaveBeenCalled();
    });

    it('should return empty array when weakTopics is empty', async () => {
      const analysis = mockAnalysis({
        percentageCorrect: 55,
        totalQuestions: 10,
        correctAnswers: 5.5,
        averageResponseTime: 20000,
        needsReview: true,
        weakTopics: [],
        strongTopics: [],
        difficultyTrend: 'declining',
        suggestedNextDifficulty: 'easy',
      });

      const result = await generateReviewSuggestions(
        mockUserId,
        analysis,
        mockSubject
      );

      expect(result).toEqual([]);
    });

    it('should generate suggestions with materials for weak topics', async () => {
      mockHybridSearch.mockResolvedValue([
        {
          sourceId: 'mat-1',
          content: 'Detailed explanation of fractions and their operations',
          sourceType: 'material',
          combinedScore: 0.85,
        },
        {
          sourceId: 'mat-2',
          content: 'Practice problems for fractions',
          sourceType: 'material',
          combinedScore: 0.75,
        },
      ]);

      const analysis = mockAnalysis({
        percentageCorrect: 45,
        totalQuestions: 10,
        correctAnswers: 4.5,
        averageResponseTime: 25000,
        needsReview: true,
        weakTopics: ['frazioni'],
        strongTopics: [],
        difficultyTrend: 'declining',
        suggestedNextDifficulty: 'easy',
      });

      const result = await generateReviewSuggestions(
        mockUserId,
        analysis,
        mockSubject
      );

      expect(result).toHaveLength(1);
      expect(result[0].topic).toBe('frazioni');
      expect(result[0].subject).toBe('mathematics');
      expect(result[0].materials).toHaveLength(2);
      expect(result[0].priority).toBe(1); // Has materials
      expect(result[0].reason).toContain('meno del');
    });

    it('should handle multiple weak topics', async () => {
      mockHybridSearch.mockResolvedValue([]);

      const analysis = mockAnalysis({
        percentageCorrect: 30,
        totalQuestions: 10,
        correctAnswers: 3,
        averageResponseTime: 30000,
        needsReview: true,
        weakTopics: ['frazioni', 'decimali', 'percentuali'],
        strongTopics: [],
        difficultyTrend: 'declining',
        suggestedNextDifficulty: 'easy',
      });

      const result = await generateReviewSuggestions(
        mockUserId,
        analysis,
        mockSubject
      );

      expect(result).toHaveLength(3);
      expect(result.map((s) => s.topic)).toEqual([
        'frazioni',
        'decimali',
        'percentuali',
      ]);
    });

    it('should set priority 2 when no materials found', async () => {
      mockHybridSearch.mockResolvedValue([]);

      const analysis = mockAnalysis({
        percentageCorrect: 50,
        totalQuestions: 10,
        correctAnswers: 5,
        averageResponseTime: 20000,
        needsReview: true,
        weakTopics: ['argomento_raro'],
        strongTopics: [],
        difficultyTrend: 'declining',
        suggestedNextDifficulty: 'easy',
      });

      const result = await generateReviewSuggestions(
        mockUserId,
        analysis,
        mockSubject
      );

      expect(result[0].priority).toBe(2);
      expect(result[0].materials).toHaveLength(0);
    });

    it('should handle search errors gracefully', async () => {
      mockHybridSearch.mockRejectedValue(new Error('Search failed'));

      const analysis = mockAnalysis({
        percentageCorrect: 40,
        totalQuestions: 10,
        correctAnswers: 4,
        averageResponseTime: 20000,
        needsReview: true,
        weakTopics: ['algebra'],
        strongTopics: [],
        difficultyTrend: 'declining',
        suggestedNextDifficulty: 'easy',
      });

      const result = await generateReviewSuggestions(
        mockUserId,
        analysis,
        mockSubject
      );

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe(3); // Error priority
      expect(result[0].materials).toHaveLength(0);
      expect(result[0].reason).toContain('ripasso');
    });

    it('should sort suggestions by priority', async () => {
      let callCount = 0;
      mockHybridSearch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([]); // No materials for first topic
        }
        return Promise.resolve([
          { sourceId: 'mat-1', content: 'Content', sourceType: 'material', combinedScore: 0.8 },
        ]);
      });

      const analysis = mockAnalysis({
        percentageCorrect: 40,
        totalQuestions: 10,
        correctAnswers: 4,
        averageResponseTime: 20000,
        needsReview: true,
        weakTopics: ['no_materials', 'has_materials'],
        strongTopics: [],
        difficultyTrend: 'declining',
        suggestedNextDifficulty: 'easy',
      });

      const result = await generateReviewSuggestions(
        mockUserId,
        analysis,
        mockSubject
      );

      expect(result[0].topic).toBe('has_materials'); // Priority 1
      expect(result[1].topic).toBe('no_materials'); // Priority 2
    });

    it('should call hybridSearch with correct parameters', async () => {
      mockHybridSearch.mockResolvedValue([]);

      const analysis = mockAnalysis({
        percentageCorrect: 50,
        totalQuestions: 10,
        correctAnswers: 5,
        averageResponseTime: 20000,
        needsReview: true,
        weakTopics: ['geometria'],
        strongTopics: [],
        difficultyTrend: 'declining',
        suggestedNextDifficulty: 'easy',
      });

      await generateReviewSuggestions(mockUserId, analysis, mockSubject);

      expect(mockHybridSearch).toHaveBeenCalledWith({
        userId: 'user-123',
        query: 'geometria',
        limit: 5,
        sourceType: 'material',
        subject: 'mathematics',
        minScore: 0.4,
      });
    });
  });

  describe('checkSeenConcepts', () => {
    const mockUserId = 'user-456';
    const mockSubject: Subject = 'biology';

    it('should return map with null for unseen concepts', async () => {
      mockHybridSearch.mockResolvedValue([]);

      const concepts = ['fotosintesi', 'cellula'];
      const result = await checkSeenConcepts(mockUserId, concepts, mockSubject);

      expect(result.size).toBe(2);
      expect(result.get('fotosintesi')).toBeNull();
      expect(result.get('cellula')).toBeNull();
    });

    it('should return SeenConcept for concepts with high similarity', async () => {
      mockHybridSearch.mockResolvedValue([
        { sourceId: 'mat-1', content: 'Fotosintesi', combinedScore: 0.95 },
      ]);

      const concepts = ['fotosintesi'];
      const result = await checkSeenConcepts(mockUserId, concepts, mockSubject);

      const seenConcept = result.get('fotosintesi');
      expect(seenConcept).not.toBeNull();
      expect(seenConcept?.concept).toBe('fotosintesi');
      expect(seenConcept?.subject).toBe('biology');
      expect(seenConcept?.masteryLevel).toBe(95);
      expect(seenConcept?.timesReviewed).toBe(1);
    });

    it('should return null for concepts below similarity threshold', async () => {
      mockHybridSearch.mockResolvedValue([
        { sourceId: 'mat-1', content: 'Related topic', combinedScore: 0.75 },
      ]);

      const concepts = ['nuovoConcetto'];
      const result = await checkSeenConcepts(
        mockUserId,
        concepts,
        mockSubject
      );

      expect(result.get('nuovoConcetto')).toBeNull();
    });

    it('should handle search errors gracefully', async () => {
      mockHybridSearch.mockRejectedValue(new Error('Search error'));

      const concepts = ['errore_test'];
      const result = await checkSeenConcepts(mockUserId, concepts, mockSubject);

      expect(result.get('errore_test')).toBeNull();
    });

    it('should process multiple concepts independently', async () => {
      let callCount = 0;
      mockHybridSearch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([{ combinedScore: 0.9 }]);
        }
        return Promise.resolve([]);
      });

      const concepts = ['concetto_visto', 'concetto_nuovo'];
      const result = await checkSeenConcepts(mockUserId, concepts, mockSubject);

      expect(result.get('concetto_visto')).not.toBeNull();
      expect(result.get('concetto_nuovo')).toBeNull();
    });

    it('should call hybridSearch with high minScore threshold', async () => {
      mockHybridSearch.mockResolvedValue([]);

      await checkSeenConcepts(mockUserId, ['test_concept'], mockSubject);

      expect(mockHybridSearch).toHaveBeenCalledWith({
        userId: 'user-456',
        query: 'test_concept',
        limit: 1,
        subject: 'biology',
        minScore: 0.7,
      });
    });
  });
});
