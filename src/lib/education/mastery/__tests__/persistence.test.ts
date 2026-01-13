/**
 * Mastery Persistence Tests
 * Tests for mastery state persistence functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveMasteryState, loadMasteryState, clearMasteryState } from '../persistence';
import { SkillStatus } from '../types';
import type { MasteryState, TopicProgress } from '../types';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const createProgress = (overrides: Partial<TopicProgress>): TopicProgress => ({
  topicId: 'test-topic',
  totalQuestions: 10,
  correctAnswers: 8,
  masteryLevel: 80,
  isMastered: true,
  attempts: 10,
  lastAttempt: new Date('2024-01-15'),
  currentDifficulty: 1.0,
  status: SkillStatus.MASTERED,
  ...overrides,
});

describe('mastery persistence', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('saveMasteryState', () => {
    it('should serialize and save state', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1' })],
        ]),
      };

      await saveMasteryState(state);

      expect(mockFetch).toHaveBeenCalledWith('/api/progress', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    it('should serialize masteredAt date', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const masteredAt = new Date('2024-01-20');
      const state: MasteryState = {
        topics: new Map([
          ['topic1', createProgress({ topicId: 'topic1', masteredAt })],
        ]),
      };

      await saveMasteryState(state);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.masteries[0].masteredAt).toBe(masteredAt.toISOString());
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const state: MasteryState = { topics: new Map() };

      // Should not throw
      await expect(saveMasteryState(state)).resolves.toBeUndefined();
    });
  });

  describe('loadMasteryState', () => {
    it('should load and deserialize state', async () => {
      const mockData = {
        masteries: [
          {
            id: 'topic1',
            topicId: 'topic1',
            totalQuestions: 10,
            correctAnswers: 8,
            masteryLevel: 80,
            isMastered: true,
            attempts: 10,
            lastAttempt: '2024-01-15T00:00:00.000Z',
            currentDifficulty: 1.0,
            status: 'mastered',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const state = await loadMasteryState();

      expect(state.topics.size).toBe(1);
      expect(state.topics.get('topic1')).toBeDefined();
      expect(state.topics.get('topic1')?.lastAttempt).toBeInstanceOf(Date);
    });

    it('should handle masteredAt date in loaded data', async () => {
      const mockData = {
        masteries: [
          {
            id: 'topic1',
            topicId: 'topic1',
            totalQuestions: 10,
            correctAnswers: 8,
            masteryLevel: 80,
            isMastered: true,
            attempts: 10,
            lastAttempt: '2024-01-15T00:00:00.000Z',
            currentDifficulty: 1.0,
            status: 'mastered',
            masteredAt: '2024-01-20T00:00:00.000Z',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const state = await loadMasteryState();

      expect(state.topics.get('topic1')?.masteredAt).toBeInstanceOf(Date);
    });

    it('should return empty state on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const state = await loadMasteryState();

      expect(state.topics.size).toBe(0);
    });

    it('should return empty state on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const state = await loadMasteryState();

      expect(state.topics.size).toBe(0);
    });

    it('should handle missing masteries in response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const state = await loadMasteryState();

      expect(state.topics.size).toBe(0);
    });

    it('should default to NOT_STARTED for missing status', async () => {
      const mockData = {
        masteries: [
          {
            id: 'topic1',
            topicId: 'topic1',
            totalQuestions: 10,
            correctAnswers: 8,
            masteryLevel: 80,
            isMastered: true,
            attempts: 10,
            lastAttempt: '2024-01-15T00:00:00.000Z',
            currentDifficulty: 1.0,
            // No status field
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const state = await loadMasteryState();

      expect(state.topics.get('topic1')?.status).toBe(SkillStatus.NOT_STARTED);
    });
  });

  describe('clearMasteryState', () => {
    it('should clear all mastery data', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await clearMasteryState();

      expect(mockFetch).toHaveBeenCalledWith('/api/progress', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ masteries: [] }),
      }));
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(clearMasteryState()).resolves.toBeUndefined();
    });
  });
});
