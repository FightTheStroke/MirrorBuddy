/**
 * Mastery Stats Tests
 * Tests for mastery statistics functions
 */

import { describe, it, expect } from 'vitest';
import { getMasteryStats, getTopicProgress } from '../stats';
import { SkillStatus } from '../types';
import type { MasteryState, TopicProgress, Topic } from '../types';

const createProgress = (overrides: Partial<TopicProgress>): TopicProgress => ({
  topicId: 'test-topic',
  totalQuestions: 10,
  correctAnswers: 8,
  masteryLevel: 80,
  isMastered: true,
  attempts: 10,
  lastAttempt: new Date(),
  currentDifficulty: 1.0,
  status: SkillStatus.MASTERED,
  ...overrides,
});

describe('mastery stats', () => {
  describe('getMasteryStats', () => {
    it('should return empty stats for empty state', () => {
      const state: MasteryState = { topics: new Map() };
      const stats = getMasteryStats(state);

      expect(stats.totalTopics).toBe(0);
      expect(stats.masteredCount).toBe(0);
      expect(stats.averageMastery).toBe(0);
      expect(stats.accuracy).toBe(0);
    });

    it('should count mastered topics correctly', () => {
      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.MASTERED })],
          ['topic2', createProgress({ topicId: 'topic2', status: SkillStatus.MASTERED })],
        ]),
      };

      const stats = getMasteryStats(state);

      expect(stats.totalTopics).toBe(2);
      expect(stats.masteredCount).toBe(2);
    });

    it('should count proficient topics correctly', () => {
      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.PROFICIENT })],
        ]),
      };

      const stats = getMasteryStats(state);

      expect(stats.proficientCount).toBe(1);
    });

    it('should count in-progress topics for FAMILIAR status', () => {
      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.FAMILIAR })],
        ]),
      };

      const stats = getMasteryStats(state);

      expect(stats.inProgressCount).toBe(1);
    });

    it('should count in-progress topics for ATTEMPTED status', () => {
      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.ATTEMPTED })],
        ]),
      };

      const stats = getMasteryStats(state);

      expect(stats.inProgressCount).toBe(1);
    });

    it('should count not started topics', () => {
      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.NOT_STARTED })],
        ]),
      };

      const stats = getMasteryStats(state);

      expect(stats.notStartedCount).toBe(1);
    });

    it('should calculate average mastery correctly', () => {
      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1', masteryLevel: 100 })],
          ['topic2', createProgress({ topicId: 'topic2', masteryLevel: 50 })],
        ]),
      };

      const stats = getMasteryStats(state);

      expect(stats.averageMastery).toBe(75);
    });

    it('should calculate accuracy correctly', () => {
      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1', attempts: 10, correctAnswers: 8 })],
          ['topic2', createProgress({ topicId: 'topic2', attempts: 10, correctAnswers: 6 })],
        ]),
      };

      const stats = getMasteryStats(state);

      expect(stats.totalAttempts).toBe(20);
      expect(stats.totalCorrect).toBe(14);
      expect(stats.accuracy).toBe(70);
    });

    it('should filter by subject when topicId contains subject prefix', () => {
      const state: MasteryState = {
        topics: new Map([
          ['math.topic1', createProgress({ topicId: 'math.topic1', status: SkillStatus.MASTERED })],
          ['science.topic1', createProgress({ topicId: 'science.topic1', status: SkillStatus.MASTERED })],
        ]),
      };

      const stats = getMasteryStats(state, 'math');

      expect(stats.totalTopics).toBe(1);
      expect(stats.masteredCount).toBe(1);
    });

    describe('with allTopics provided', () => {
      const allTopics: Topic[] = [
        { id: 'topic1', name: 'Topic 1', prerequisites: [], subject: 'math' },
        { id: 'topic2', name: 'Topic 2', prerequisites: [], subject: 'math' },
        { id: 'topic3', name: 'Topic 3', prerequisites: [], subject: 'science' },
      ];

      it('should use allTopics to count total topics', () => {
        const state: MasteryState = {
          topics: new Map([
            ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.MASTERED })],
          ]),
        };

        const stats = getMasteryStats(state, undefined, allTopics);

        expect(stats.totalTopics).toBe(3);
        expect(stats.notStartedCount).toBe(2);
        expect(stats.masteredCount).toBe(1);
      });

      it('should filter allTopics by subject', () => {
        const state: MasteryState = {
          topics: new Map([
            ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.MASTERED })],
          ]),
        };

        const stats = getMasteryStats(state, 'math', allTopics);

        expect(stats.totalTopics).toBe(2);
      });

      it('should count progress for topics from allTopics', () => {
        const state: MasteryState = {
          topics: new Map([
            ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.PROFICIENT, masteryLevel: 70 })],
            ['topic2', createProgress({ topicId: 'topic2', status: SkillStatus.FAMILIAR, masteryLevel: 50 })],
          ]),
        };

        const stats = getMasteryStats(state, undefined, allTopics);

        expect(stats.proficientCount).toBe(1);
        expect(stats.inProgressCount).toBe(1);
        expect(stats.notStartedCount).toBe(1);
        expect(stats.averageMastery).toBe(60); // (70 + 50) / 2
      });

      it('should count ATTEMPTED status as in-progress', () => {
        const state: MasteryState = {
          topics: new Map([
            ['topic1', createProgress({ topicId: 'topic1', status: SkillStatus.ATTEMPTED })],
          ]),
        };

        const stats = getMasteryStats(state, undefined, allTopics);

        expect(stats.inProgressCount).toBe(1);
      });
    });
  });

  describe('getTopicProgress', () => {
    it('should return progress for existing topic', () => {
      const progress = createProgress({ topicId: 'topic1' });
      const state: MasteryState = {
        topics: new Map([['topic1', progress]]),
      };

      const result = getTopicProgress(state, 'topic1');

      expect(result).toEqual(progress);
    });

    it('should return null for non-existing topic', () => {
      const state: MasteryState = { topics: new Map() };

      const result = getTopicProgress(state, 'non-existent');

      expect(result).toBeNull();
    });
  });
});
