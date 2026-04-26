/**
 * Progress Store Action Implementations
 * Core logic for MirrorBucks, Seasons, and Session tracking
 */

import { onStreakMilestone, onAchievement } from '@/lib/notifications/triggers';
import { XP_PER_LEVEL } from '@/lib/constants/xp-rewards';
import { calculateSeasonLevel } from '@/lib/constants/mirrorbucks';
import { hasSeasonChanged, getCurrentSeason } from '@/lib/gamification/seasons';
import { fetchWithRetry } from './progress-store-fetch';
import {
  handleLevelUp,
  createSeasonHistory,
  updateSessionWithMirrorBucks,
  calculateStreakUpdate,
  getSessionDurationMinutes,
  countSessionsThisWeek,
} from './progress-store-actions-helpers';
import type { SubjectMastery } from '@/types';
import type { SessionGrade, ProgressState } from './progress-store-types';
import type { StoreApi } from 'zustand';

type SetState = StoreApi<ProgressState>['setState'];
type GetState = StoreApi<ProgressState>['getState'];

export function createProgressActions(set: SetState, get: GetState) {
  return {
    // Backward compatibility - addXP calls addMirrorBucks
    addXP: (amount: number) => {
      get().addMirrorBucks(amount);
    },

    addMirrorBucks: (amount: number, reason?: string, sourceId?: string, sourceType?: string) =>
      set((state: ProgressState) => {
        if (hasSeasonChanged(state.currentSeason.name)) {
          get().checkAndResetSeason();
        }

        const newMirrorBucks = state.mirrorBucks + amount;
        const newSeasonMirrorBucks = state.seasonMirrorBucks + amount;
        const newSeasonLevel = calculateSeasonLevel(newSeasonMirrorBucks);

        let newAllTimeLevel = state.allTimeLevel;
        while (newAllTimeLevel < XP_PER_LEVEL.length - 1 && newMirrorBucks >= XP_PER_LEVEL[newAllTimeLevel]) {
          newAllTimeLevel++;
        }

        handleLevelUp(newSeasonLevel, state.seasonLevel, amount, reason);
        fetchWithRetry('/api/gamification/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: amount, reason: reason || 'activity', sourceId, sourceType }),
        });

        return {
          xp: newMirrorBucks,
          mirrorBucks: newMirrorBucks,
          seasonMirrorBucks: newSeasonMirrorBucks,
          seasonLevel: newSeasonLevel,
          allTimeLevel: newAllTimeLevel,
          level: newAllTimeLevel,
          currentSession: updateSessionWithMirrorBucks(state.currentSession, amount),
          pendingSync: true,
        };
      }),

    checkAndResetSeason: () =>
      set((state: ProgressState) => {
        const newSeason = getCurrentSeason();
        if (state.currentSeason.name !== newSeason.name) {
          return {
            currentSeason: newSeason,
            seasonMirrorBucks: 0,
            seasonLevel: 1,
            seasonHistory: [createSeasonHistory(state), ...state.seasonHistory].slice(0, 10),
            pendingSync: true,
          };
        }
        return state;
      }),

    updateStreak: (studyMinutes?: number) =>
      set((state: ProgressState) => {
        const streak = calculateStreakUpdate(state);
        if (streak.current > state.streak.current) {
          onStreakMilestone(streak.current);
        }
        fetchWithRetry('/api/gamification/streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minutes: studyMinutes || 0 }),
        });
        return { streak, pendingSync: true };
      }),

    updateMastery: (subjectMastery: SubjectMastery) =>
      set((state: ProgressState) => {
        const existing = state.masteries.findIndex((m) => m.subject === subjectMastery.subject);
        if (existing >= 0) {
          const newMasteries = [...state.masteries];
          newMasteries[existing] = subjectMastery;
          return { masteries: newMasteries, pendingSync: true };
        }
        return { masteries: [...state.masteries, subjectMastery], pendingSync: true };
      }),

    unlockAchievement: (achievementId: string) =>
      set((state: ProgressState) => {
        const achievement = state.achievements.find((a) => a.id === achievementId);
        if (achievement && !achievement.unlockedAt) {
          // Trigger achievement notification
          onAchievement(achievement.name, achievement.description);
          return {
            achievements: state.achievements.map((a) =>
              a.id === achievementId ? { ...a, unlockedAt: new Date() } : a
            ),
            pendingSync: true,
          };
        }
        return state;
      }),

    addStudyMinutes: (minutes: number) =>
      set((state: ProgressState) => ({
        totalStudyMinutes: state.totalStudyMinutes + minutes,
        pendingSync: true,
      })),

    incrementQuestions: () =>
      set((state: ProgressState) => {
        const updatedSession = state.currentSession
          ? {
              ...state.currentSession,
              questionsAsked: state.currentSession.questionsAsked + 1,
            }
          : null;
        return {
          questionsAsked: state.questionsAsked + 1,
          currentSession: updatedSession,
          pendingSync: true,
        };
      }),

    startSession: (maestroId: string, subject: string) =>
      set((state: ProgressState) => {
        const newSession = {
          id: crypto.randomUUID(),
          maestroId,
          subject,
          startedAt: new Date(),
          questionsAsked: 0,
          xpEarned: 0,
          mirrorBucksEarned: 0,
        };
        if (state.currentSession) {
          const endedSession = {
            ...state.currentSession,
            endedAt: new Date(),
            durationMinutes: getSessionDurationMinutes(state.currentSession.startedAt),
          };
          return {
            currentSession: newSession,
            sessionHistory: [endedSession, ...state.sessionHistory].slice(0, 100),
            pendingSync: true,
          };
        }
        return { currentSession: newSession, pendingSync: true };
      }),

    endSession: (grade?: SessionGrade) =>
      set((state: ProgressState) => {
        if (!state.currentSession) return state;
        const durationMinutes = getSessionDurationMinutes(state.currentSession.startedAt);
        const endedSession = {
          ...state.currentSession,
          endedAt: new Date(),
          durationMinutes,
          grade: grade || state.currentSession.grade,
        };
        return {
          currentSession: null,
          sessionHistory: [endedSession, ...state.sessionHistory].slice(0, 100),
          totalStudyMinutes: state.totalStudyMinutes + durationMinutes,
          sessionsThisWeek: countSessionsThisWeek(state.sessionHistory, endedSession),
          pendingSync: true,
        };
      }),

    gradeCurrentSession: (grade: SessionGrade) =>
      set((state: ProgressState) => {
        if (!state.currentSession) return state;
        return {
          currentSession: { ...state.currentSession, grade },
          pendingSync: true,
        };
      }),
  };
}
