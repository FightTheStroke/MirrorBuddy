/**
 * Gamification Store
 * Handles client-side state and API calls for MirrorBucks, levels, achievements, streaks
 */

'use client';

import { create } from 'zustand';
import { logger } from '@/lib/logger';

export interface GamificationState {
  // Core progression
  level: number;
  tier: string;
  totalPoints: number;
  seasonPoints: number;
  mirrorBucks: number;
  currentSeason: string;
  pointsToNextLevel: number;
  progressPercent: number;

  // Streak
  streak: {
    current: number;
    longest: number;
    todayMinutes: number;
    goalMinutes: number;
    goalMet: boolean;
  } | null;

  // Achievements
  achievements: Achievement[];
  totalUnlocked: number;
  totalAchievements: number;

  // UI state
  isLoading: boolean;
  lastError: string | null;
  recentAchievements: string[]; // For toast notifications
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tier: number;
  points: number;
  isSecret: boolean;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

interface GamificationActions {
  // API calls
  fetchProgression: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  awardPoints: (points: number, reason: string, sourceId?: string, sourceType?: string) => Promise<void>;
  updateStreak: (minutes: number) => Promise<void>;

  // UI helpers
  clearRecentAchievements: () => void;
  reset: () => void;
}

type GamificationStore = GamificationState & GamificationActions;

const initialState: GamificationState = {
  level: 1,
  tier: 'principiante',
  totalPoints: 0,
  seasonPoints: 0,
  mirrorBucks: 0,
  currentSeason: '',
  pointsToNextLevel: 1000,
  progressPercent: 0,
  streak: null,
  achievements: [],
  totalUnlocked: 0,
  totalAchievements: 0,
  isLoading: false,
  lastError: null,
  recentAchievements: [],
};

export const useGamificationStore = create<GamificationStore>()((set, get) => ({
  ...initialState,

  fetchProgression: async () => {
    set({ isLoading: true, lastError: null });
    try {
      const res = await fetch('/api/gamification/progression');
      if (!res.ok) throw new Error('Failed to fetch progression');

      const data = await res.json();
      if (data.success) {
        set({
          level: data.level,
          tier: data.tier,
          totalPoints: data.totalPoints,
          seasonPoints: data.seasonPoints,
          mirrorBucks: data.mirrorBucks,
          currentSeason: data.currentSeason,
          pointsToNextLevel: data.pointsToNextLevel,
          progressPercent: data.progressPercent,
          streak: data.streak,
          isLoading: false,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch gamification progression', { error });
      set({ isLoading: false, lastError: String(error) });
    }
  },

  fetchAchievements: async () => {
    try {
      const res = await fetch('/api/gamification/achievements');
      if (!res.ok) throw new Error('Failed to fetch achievements');

      const data = await res.json();
      if (data.success) {
        set({
          achievements: data.achievements,
          totalUnlocked: data.totalUnlocked,
          totalAchievements: data.totalAchievements,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch achievements', { error });
    }
  },

  awardPoints: async (points: number, reason: string, sourceId?: string, sourceType?: string) => {
    try {
      const res = await fetch('/api/gamification/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, reason, sourceId, sourceType }),
      });

      if (!res.ok) throw new Error('Failed to award points');

      const data = await res.json();
      if (data.success) {
        const state = get();
        set({
          totalPoints: data.totalPoints,
          seasonPoints: data.seasonPoints,
          mirrorBucks: data.mirrorBucks,
          level: data.level,
          tier: data.tier,
          pointsToNextLevel: Math.max(0, (data.level * 1000) - data.seasonPoints),
          progressPercent: Math.round(((data.seasonPoints % 1000) / 1000) * 100),
          recentAchievements: [
            ...state.recentAchievements,
            ...(data.newAchievements || []),
          ],
        });

        logger.info('Points awarded', {
          points: data.pointsAwarded,
          multiplier: data.multiplier,
          newTotal: data.totalPoints,
          leveledUp: data.leveledUp,
        });
      }
    } catch (error) {
      logger.error('Failed to award points', { error, points, reason });
    }
  },

  updateStreak: async (minutes: number) => {
    try {
      const res = await fetch('/api/gamification/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });

      if (!res.ok) throw new Error('Failed to update streak');

      const data = await res.json();
      if (data.success && data.streak) {
        set({
          streak: {
            current: data.streak.current,
            longest: data.streak.longest,
            todayMinutes: data.streak.todayMinutes,
            goalMinutes: get().streak?.goalMinutes || 30,
            goalMet: data.streak.goalMet,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to update streak', { error, minutes });
    }
  },

  clearRecentAchievements: () => set({ recentAchievements: [] }),

  reset: () => set(initialState),
}));
