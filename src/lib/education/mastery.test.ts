/**
 * Unit Tests for Mastery Learning System
 *
 * Tests cover:
 * - Topic progress tracking
 * - Mastery calculation
 * - Skill status transitions
 * - Difficulty adjustment
 * - Prerequisites and topic access
 * - Recommendations and gap identification
 * - Statistics calculation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock csrfFetch before importing the module that uses it
const mockCsrfFetch = vi.fn();
vi.mock('@/lib/auth/csrf-client', () => ({
  csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
}));

import {
  SkillStatus,
  recordAnswer,
  getMasteryLevel,
  isMastered,
  getDifficulty,
  getStatus,
  canAccessTopic,
  getRecommendedTopics,
  identifyGaps,
  resetTopic,
  resetAllProgress,
  getMasteryStats,
  getTopicProgress,
  getStatusLabel,
  getStatusEmoji,
  getStatusColor,
  createExampleCurriculum,
  loadMasteryState,
  clearMasteryState,
  type MasteryState,
  type Topic,
} from './mastery';

// Mock fetch for GET calls (loadMasteryState uses regular fetch)
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', { value: mockFetch, writable: true });

describe('Mastery Learning System', () => {
  let emptyState: MasteryState;
  let sampleTopics: Topic[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockCsrfFetch.mockReset();
    // Default mock: successful API responses
    mockFetch.mockResolvedValue({ ok: true });
    mockCsrfFetch.mockResolvedValue({ ok: true });
    emptyState = { topics: new Map() };
    sampleTopics = createExampleCurriculum();
  });

  describe('recordAnswer', () => {
    it('should create new progress for first answer', () => {
      const state = recordAnswer(emptyState, 'math.addition', true);
      const progress = state.topics.get('math.addition');

      expect(progress).toBeDefined();
      expect(progress?.attempts).toBe(1);
      expect(progress?.correctAnswers).toBe(1);
      expect(progress?.totalQuestions).toBe(1);
    });

    it('should increment attempts on each answer', () => {
      let state = recordAnswer(emptyState, 'topic1', true);
      state = recordAnswer(state, 'topic1', false);
      state = recordAnswer(state, 'topic1', true);

      const progress = state.topics.get('topic1');
      expect(progress?.attempts).toBe(3);
      expect(progress?.correctAnswers).toBe(2);
    });

    it('should increase mastery with correct answers', () => {
      let state = emptyState;
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'topic1', true);
      }

      const mastery = getMasteryLevel(state, 'topic1');
      expect(mastery).toBeGreaterThan(80); // Should be mastered
    });

    it('should decrease mastery with incorrect answers', () => {
      let state = emptyState;
      // First get some mastery
      for (let i = 0; i < 3; i++) {
        state = recordAnswer(state, 'topic1', true);
      }
      const initialMastery = getMasteryLevel(state, 'topic1');

      // Then fail
      for (let i = 0; i < 3; i++) {
        state = recordAnswer(state, 'topic1', false);
      }

      const finalMastery = getMasteryLevel(state, 'topic1');
      expect(finalMastery).toBeLessThan(initialMastery);
    });

    it('should set isMastered when reaching 80% threshold', () => {
      let state = emptyState;
      // 5 correct in a row should achieve mastery
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'topic1', true);
      }

      expect(isMastered(state, 'topic1')).toBe(true);
    });

    it('should auto-save to API', () => {
      recordAnswer(emptyState, 'topic1', true);
      // recordAnswer calls saveMasteryState which uses csrfFetch
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/progress', expect.objectContaining({
        method: 'PUT',
      }));
    });
  });

  describe('getDifficulty', () => {
    it('should return 1.0 for new topics', () => {
      expect(getDifficulty(emptyState, 'new_topic')).toBe(1.0);
    });

    it('should increase difficulty after correct answer', () => {
      const state = recordAnswer(emptyState, 'topic1', true);
      expect(getDifficulty(state, 'topic1')).toBeGreaterThan(1.0);
    });

    it('should decrease difficulty after incorrect answer', () => {
      const state = recordAnswer(emptyState, 'topic1', false);
      expect(getDifficulty(state, 'topic1')).toBeLessThan(1.0);
    });

    it('should stay within bounds (0.5 - 2.0)', () => {
      let state = emptyState;
      // Many correct answers
      for (let i = 0; i < 20; i++) {
        state = recordAnswer(state, 'topic1', true);
      }
      expect(getDifficulty(state, 'topic1')).toBeLessThanOrEqual(2.0);

      // Many incorrect answers
      for (let i = 0; i < 20; i++) {
        state = recordAnswer(state, 'topic1', false);
      }
      expect(getDifficulty(state, 'topic1')).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('getStatus', () => {
    it('should return NOT_STARTED for new topics', () => {
      expect(getStatus(emptyState, 'new_topic')).toBe(SkillStatus.NOT_STARTED);
    });

    it('should return ATTEMPTED for few attempts', () => {
      const state = recordAnswer(emptyState, 'topic1', true);
      expect(getStatus(state, 'topic1')).toBe(SkillStatus.ATTEMPTED);
    });

    it('should return MASTERED after reaching 80%', () => {
      let state = emptyState;
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'topic1', true);
      }
      expect(getStatus(state, 'topic1')).toBe(SkillStatus.MASTERED);
    });
  });

  describe('canAccessTopic', () => {
    it('should allow access to topics without prerequisites', () => {
      const topic: Topic = { id: 'basic', name: 'Basic', prerequisites: [] };
      expect(canAccessTopic(emptyState, topic)).toBe(true);
    });

    it('should deny access when prerequisites not mastered', () => {
      const topic: Topic = {
        id: 'advanced',
        name: 'Advanced',
        prerequisites: ['basic'],
      };
      expect(canAccessTopic(emptyState, topic)).toBe(false);
    });

    it('should allow access when all prerequisites mastered', () => {
      // Master the prerequisite
      let state = emptyState;
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'basic', true);
      }

      const topic: Topic = {
        id: 'advanced',
        name: 'Advanced',
        prerequisites: ['basic'],
      };
      expect(canAccessTopic(state, topic)).toBe(true);
    });
  });

  describe('getRecommendedTopics', () => {
    it('should recommend accessible non-mastered topics', () => {
      const recommended = getRecommendedTopics(emptyState, sampleTopics);
      // Only topics without prerequisites should be recommended initially
      expect(recommended.length).toBeGreaterThan(0);
      expect(recommended[0].prerequisites).toEqual([]);
    });

    it('should not recommend mastered topics', () => {
      let state = emptyState;
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'math.arithmetic.addition', true);
      }

      const recommended = getRecommendedTopics(state, sampleTopics);
      const masteredRecommended = recommended.find(
        (t) => t.id === 'math.arithmetic.addition'
      );
      expect(masteredRecommended).toBeUndefined();
    });

    it('should prioritize gaps over new topics', () => {
      let state = emptyState;
      // Create a gap: attempted but struggling
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'math.arithmetic.addition', false);
      }

      const recommended = getRecommendedTopics(state, sampleTopics);
      expect(recommended[0].id).toBe('math.arithmetic.addition');
    });
  });

  describe('identifyGaps', () => {
    it('should return empty array with no attempts', () => {
      const gaps = identifyGaps(emptyState, sampleTopics);
      expect(gaps).toEqual([]);
    });

    it('should identify topics with low mastery despite attempts', () => {
      let state = emptyState;
      // Create a gap: 3+ attempts but below 60%
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'math.arithmetic.addition', i < 2);
      }

      const gaps = identifyGaps(state, sampleTopics);
      expect(gaps.some((g) => g.id === 'math.arithmetic.addition')).toBe(true);
    });

    it('should filter by subject', () => {
      let state = emptyState;
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'math.arithmetic.addition', false);
      }

      const mathGaps = identifyGaps(state, sampleTopics, 'math');
      const scienceGaps = identifyGaps(state, sampleTopics, 'science');

      expect(mathGaps.length).toBeGreaterThan(0);
      expect(scienceGaps.length).toBe(0);
    });
  });

  describe('resetTopic', () => {
    it('should remove topic progress', () => {
      let state = recordAnswer(emptyState, 'topic1', true);
      state = resetTopic(state, 'topic1');

      expect(state.topics.has('topic1')).toBe(false);
    });

    it('should preserve other topics', () => {
      let state = recordAnswer(emptyState, 'topic1', true);
      state = recordAnswer(state, 'topic2', true);
      state = resetTopic(state, 'topic1');

      expect(state.topics.has('topic1')).toBe(false);
      expect(state.topics.has('topic2')).toBe(true);
    });
  });

  describe('resetAllProgress', () => {
    it('should clear all topics', () => {
      let state = recordAnswer(emptyState, 'topic1', true);
      state = recordAnswer(state, 'topic2', true);
      state = resetAllProgress(state);

      expect(state.topics.size).toBe(0);
    });

    it('should preserve studentId', () => {
      const state: MasteryState = {
        topics: new Map(),
        studentId: 'student-123',
      };
      const reset = resetAllProgress(state);
      expect(reset.studentId).toBe('student-123');
    });
  });

  describe('getMasteryStats', () => {
    it('should return zeros for empty state', () => {
      const stats = getMasteryStats(emptyState);
      expect(stats.totalTopics).toBe(0);
      expect(stats.masteredCount).toBe(0);
      expect(stats.totalAttempts).toBe(0);
    });

    it('should calculate correct counts', () => {
      let state = emptyState;
      // Master one topic
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'topic1', true);
      }
      // Attempt another
      state = recordAnswer(state, 'topic2', true);

      const stats = getMasteryStats(state);
      expect(stats.masteredCount).toBe(1);
      expect(stats.totalAttempts).toBe(6);
    });

    it('should calculate accuracy', () => {
      let state = emptyState;
      // 3 correct, 2 incorrect = 60% accuracy
      state = recordAnswer(state, 'topic1', true);
      state = recordAnswer(state, 'topic1', true);
      state = recordAnswer(state, 'topic1', true);
      state = recordAnswer(state, 'topic1', false);
      state = recordAnswer(state, 'topic1', false);

      const stats = getMasteryStats(state);
      expect(stats.accuracy).toBe(60);
    });
  });

  describe('getTopicProgress', () => {
    it('should return null for non-existent topic', () => {
      expect(getTopicProgress(emptyState, 'nonexistent')).toBeNull();
    });

    it('should return progress for existing topic', () => {
      const state = recordAnswer(emptyState, 'topic1', true);
      const progress = getTopicProgress(state, 'topic1');

      expect(progress).not.toBeNull();
      expect(progress?.topicId).toBe('topic1');
    });
  });

  describe('Display Helpers', () => {
    it('should return correct status labels', () => {
      expect(getStatusLabel(SkillStatus.MASTERED)).toBe('Mastered');
      expect(getStatusLabel(SkillStatus.PROFICIENT)).toBe('Proficient');
      expect(getStatusLabel(SkillStatus.FAMILIAR)).toBe('Familiar');
      expect(getStatusLabel(SkillStatus.ATTEMPTED)).toBe('In Progress');
      expect(getStatusLabel(SkillStatus.NOT_STARTED)).toBe('Not Started');
    });

    it('should return correct status emojis', () => {
      expect(getStatusEmoji(SkillStatus.MASTERED)).toBe('✅');
      expect(getStatusEmoji(SkillStatus.NOT_STARTED)).toBe('⚪');
    });

    it('should return correct status colors', () => {
      expect(getStatusColor(SkillStatus.MASTERED)).toBe('#22c55e');
      expect(getStatusColor(SkillStatus.NOT_STARTED)).toBe('#94a3b8');
    });
  });

  describe('Persistence', () => {
    it('should save and load state correctly', async () => {
      // Mock successful API calls
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          masteries: [
            {
              id: 'topic1', // Key field used by deserializer
              topicId: 'topic1',
              masteryLevel: 50,
              isMastered: false,
              totalQuestions: 2,
              attempts: 2,
              correctAnswers: 2,
              lastAttempt: new Date().toISOString(),
              currentDifficulty: 1.0,
              status: 'attempted',
            },
          ],
        }),
      });

      const loaded = await loadMasteryState();
      expect(loaded.topics.size).toBe(1);
      const progress = loaded.topics.get('topic1');
      expect(progress?.attempts).toBe(2);
    });

    it('should handle empty API response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ masteries: [] }),
      });

      const loaded = await loadMasteryState();
      expect(loaded.topics.size).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const loaded = await loadMasteryState();
      expect(loaded.topics.size).toBe(0);
    });

    it('should clear state via API', async () => {
      mockCsrfFetch.mockResolvedValue({ ok: true });

      await clearMasteryState();
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/progress', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ masteries: [] }),
      }));
    });
  });

  describe('createExampleCurriculum', () => {
    it('should create a valid curriculum', () => {
      const curriculum = createExampleCurriculum();
      expect(curriculum.length).toBeGreaterThan(0);
      expect(curriculum[0].id).toBeDefined();
      expect(curriculum[0].name).toBeDefined();
    });

    it('should have proper prerequisite chain', () => {
      const curriculum = createExampleCurriculum();
      const addition = curriculum.find(
        (t) => t.id === 'math.arithmetic.addition'
      );
      const subtraction = curriculum.find(
        (t) => t.id === 'math.arithmetic.subtraction'
      );

      expect(addition?.prerequisites).toEqual([]);
      expect(subtraction?.prerequisites).toContain('math.arithmetic.addition');
    });
  });
});
