/**
 * Tests for Progress Store Action Helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSeasonHistory,
  updateSessionWithMirrorBucks,
  calculateStreakUpdate,
  getSessionDurationMinutes,
  countSessionsThisWeek,
} from '../progress-store-actions-helpers';
import type { ProgressState, StudySession } from '../progress-store-types';

describe('progress-store-actions-helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  describe('createSeasonHistory', () => {
    it('creates season history from state', () => {
      const state = {
        currentSeason: {
          name: 'Primavera 2026',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-05-31'),
        },
        seasonMirrorBucks: 500,
        seasonLevel: 5,
        achievements: [
          {
            id: 'ach1',
            name: 'First Win',
            description: 'First achievement',
            category: 'learning',
            unlockedAt: new Date('2026-03-15'),
          },
          {
            id: 'ach2',
            name: 'Old One',
            description: 'Old achievement',
            category: 'learning',
            unlockedAt: new Date('2025-01-01'),
          },
        ],
        totalStudyMinutes: 1200,
      } as unknown as ProgressState;

      const history = createSeasonHistory(state);

      expect(history.season).toBe('Primavera 2026');
      expect(history.year).toBe(2026);
      expect(history.mirrorBucksEarned).toBe(500);
      expect(history.levelReached).toBe(5);
      expect(history.achievementsUnlocked).toBe(1);
      expect(history.studyMinutes).toBe(1200);
    });

    it('counts zero achievements when none in season', () => {
      const state = {
        currentSeason: {
          name: 'Estate 2026',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-08-31'),
        },
        seasonMirrorBucks: 100,
        seasonLevel: 2,
        achievements: [],
        totalStudyMinutes: 60,
      } as unknown as ProgressState;

      const history = createSeasonHistory(state);

      expect(history.achievementsUnlocked).toBe(0);
    });
  });

  describe('updateSessionWithMirrorBucks', () => {
    it('returns null if no current session', () => {
      const result = updateSessionWithMirrorBucks(null, 100);
      expect(result).toBeNull();
    });

    it('adds MirrorBucks to existing session', () => {
      const session: StudySession = {
        id: 'sess1',
        startedAt: new Date(),
        maestroId: 'euclide',
        subject: 'math',
        questionsAsked: 5,
        xpEarned: 50,
        mirrorBucksEarned: 50,
      };

      const result = updateSessionWithMirrorBucks(session, 30);

      expect(result?.mirrorBucksEarned).toBe(80);
      expect(result?.xpEarned).toBe(80);
    });

    it('handles session with undefined mirrorBucksEarned', () => {
      const session = {
        id: 'sess2',
        startedAt: new Date(),
        maestroId: 'feynman',
        subject: 'physics',
        questionsAsked: 0,
      } as unknown as StudySession;

      const result = updateSessionWithMirrorBucks(session, 25);

      expect(result?.mirrorBucksEarned).toBe(25);
    });

    it('preserves other session properties', () => {
      const session: StudySession = {
        id: 'sess3',
        startedAt: new Date('2026-01-15T10:00:00.000Z'),
        maestroId: 'manzoni',
        subject: 'italian',
        questionsAsked: 3,
        xpEarned: 0,
        mirrorBucksEarned: 0,
      };

      const result = updateSessionWithMirrorBucks(session, 50);

      expect(result?.id).toBe('sess3');
      expect(result?.maestroId).toBe('manzoni');
      expect(result?.subject).toBe('italian');
    });
  });

  describe('calculateStreakUpdate', () => {
    it('starts new streak when no previous study', () => {
      const state = {
        streak: {
          current: 0,
          longest: 0,
          lastStudyDate: null,
        },
      } as unknown as ProgressState;

      const result = calculateStreakUpdate(state);

      expect(result.current).toBe(1);
      expect(result.longest).toBe(1);
      expect(result.lastStudyDate).toBeInstanceOf(Date);
    });

    it('increments streak when studied yesterday', () => {
      const yesterday = new Date(Date.now() - 86400000);
      const state = {
        streak: {
          current: 3,
          longest: 5,
          lastStudyDate: yesterday,
        },
      } as unknown as ProgressState;

      const result = calculateStreakUpdate(state);

      expect(result.current).toBe(4);
      expect(result.longest).toBe(5);
    });

    it('updates longest streak when current exceeds it', () => {
      const yesterday = new Date(Date.now() - 86400000);
      const state = {
        streak: {
          current: 5,
          longest: 5,
          lastStudyDate: yesterday,
        },
      } as unknown as ProgressState;

      const result = calculateStreakUpdate(state);

      expect(result.current).toBe(6);
      expect(result.longest).toBe(6);
    });

    it('resets streak when gap is more than one day', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
      const state = {
        streak: {
          current: 10,
          longest: 15,
          lastStudyDate: twoDaysAgo,
        },
      } as unknown as ProgressState;

      const result = calculateStreakUpdate(state);

      expect(result.current).toBe(1);
      expect(result.longest).toBe(15);
    });

    it('maintains streak when studied today', () => {
      const today = new Date();
      const state = {
        streak: {
          current: 7,
          longest: 10,
          lastStudyDate: today,
        },
      } as unknown as ProgressState;

      const result = calculateStreakUpdate(state);

      expect(result.current).toBe(7);
      expect(result.longest).toBe(10);
    });
  });

  describe('getSessionDurationMinutes', () => {
    it('calculates duration correctly', () => {
      const startedAt = new Date(Date.now() - 30 * 60000);
      const duration = getSessionDurationMinutes(startedAt);
      expect(duration).toBe(30);
    });

    it('rounds to nearest minute', () => {
      const startedAt = new Date(Date.now() - 15.7 * 60000);
      const duration = getSessionDurationMinutes(startedAt);
      expect(duration).toBe(16);
    });

    it('returns 0 for just started session', () => {
      const startedAt = new Date();
      const duration = getSessionDurationMinutes(startedAt);
      expect(duration).toBe(0);
    });
  });

  describe('countSessionsThisWeek', () => {
    it('counts new session alone', () => {
      const newSession: StudySession = {
        id: 'new',
        startedAt: new Date(),
        maestroId: 'euclide',
        subject: 'math',
        questionsAsked: 0,
        xpEarned: 0,
        mirrorBucksEarned: 0,
      };

      const count = countSessionsThisWeek([], newSession);
      expect(count).toBe(1);
    });

    it('includes sessions from last 7 days', () => {
      const sessions: StudySession[] = [
        {
          id: 's1',
          startedAt: new Date(Date.now() - 2 * 86400000),
          maestroId: 'euclide',
          subject: 'math',
          questionsAsked: 3,
          xpEarned: 30,
          mirrorBucksEarned: 30,
        },
        {
          id: 's2',
          startedAt: new Date(Date.now() - 5 * 86400000),
          maestroId: 'feynman',
          subject: 'physics',
          questionsAsked: 5,
          xpEarned: 50,
          mirrorBucksEarned: 50,
        },
      ];
      const newSession: StudySession = {
        id: 'new',
        startedAt: new Date(),
        maestroId: 'manzoni',
        subject: 'italian',
        questionsAsked: 0,
        xpEarned: 0,
        mirrorBucksEarned: 0,
      };

      const count = countSessionsThisWeek(sessions, newSession);
      expect(count).toBe(3);
    });

    it('excludes sessions older than 7 days', () => {
      const sessions: StudySession[] = [
        {
          id: 's1',
          startedAt: new Date(Date.now() - 10 * 86400000),
          maestroId: 'euclide',
          subject: 'math',
          questionsAsked: 2,
          xpEarned: 20,
          mirrorBucksEarned: 20,
        },
      ];
      const newSession: StudySession = {
        id: 'new',
        startedAt: new Date(),
        maestroId: 'manzoni',
        subject: 'italian',
        questionsAsked: 0,
        xpEarned: 0,
        mirrorBucksEarned: 0,
      };

      const count = countSessionsThisWeek(sessions, newSession);
      expect(count).toBe(1);
    });
  });
});
