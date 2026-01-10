/**
 * Progress Store Action Implementations
 * Core logic for MirrorBucks, Seasons, and Session tracking
 */

import { logger } from '@/lib/logger';
import { onLevelUp, onStreakMilestone, onAchievement } from '@/lib/notifications/triggers';
import { XP_PER_LEVEL } from '@/lib/constants/xp-rewards';
import { calculateSeasonLevel } from '@/lib/constants/mirrorbucks';
import { hasSeasonChanged, getCurrentSeason } from '@/lib/gamification/seasons';
import { fetchWithRetry } from './progress-store-fetch';
import type { SubjectMastery, SeasonHistory } from '@/types';
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
        // Check if season needs to be reset
        const seasonChanged = hasSeasonChanged(state.currentSeason.name);
        if (seasonChanged) {
          get().checkAndResetSeason();
        }

        const newMirrorBucks = state.mirrorBucks + amount;
        const newSeasonMirrorBucks = state.seasonMirrorBucks + amount;

        // Calculate season level (1-100)
        const newSeasonLevel = calculateSeasonLevel(newSeasonMirrorBucks);

        // Calculate all-time level using old XP system for backward compat
        let newAllTimeLevel = state.allTimeLevel;
        while (
          newAllTimeLevel < XP_PER_LEVEL.length - 1 &&
          newMirrorBucks >= XP_PER_LEVEL[newAllTimeLevel]
        ) {
          newAllTimeLevel++;
        }

        // Trigger level up notification if season level increased
        if (newSeasonLevel > state.seasonLevel) {
          onLevelUp(newSeasonLevel, `Livello ${newSeasonLevel}`);
        } else if (amount > 0) {
          // Show MirrorBucks toast notification
          import('@/components/ui/toast')
            .then(({ default: toast }) => {
              const msg = reason || 'MirrorBucks guadagnati';
              toast.success(`+${amount} MB`, msg, { duration: 3000 });
            })
            .catch((err) => {
              logger.warn('Failed to show MirrorBucks toast', { error: err });
            });
        }

        // Persist to gamification DB with retry
        fetchWithRetry('/api/gamification/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            points: amount,
            reason: reason || 'activity',
            sourceId,
            sourceType,
          }),
        });

        // Update current session (xpEarned mirrors mirrorBucksEarned for backward compat)
        const newMbEarned = (state.currentSession?.mirrorBucksEarned ?? 0) + amount;
        const updatedSession = state.currentSession
          ? {
              ...state.currentSession,
              xpEarned: newMbEarned,
              mirrorBucksEarned: newMbEarned,
            }
          : null;

        return {
          xp: newMirrorBucks, // Backward compatibility
          mirrorBucks: newMirrorBucks,
          seasonMirrorBucks: newSeasonMirrorBucks,
          seasonLevel: newSeasonLevel,
          allTimeLevel: newAllTimeLevel,
          level: newAllTimeLevel, // Backward compatibility
          currentSession: updatedSession,
          pendingSync: true,
        };
      }),

    checkAndResetSeason: () =>
      set((state: ProgressState) => {
        const newSeason = getCurrentSeason();

        // If season has changed, archive current season and reset
        if (state.currentSeason.name !== newSeason.name) {
          logger.info('Season changed, archiving progress', {
            oldSeason: state.currentSeason.name,
            newSeason: newSeason.name,
          });

          const seasonHistory: SeasonHistory = {
            season: state.currentSeason.name,
            year: state.currentSeason.startDate.getFullYear(),
            mirrorBucksEarned: state.seasonMirrorBucks,
            levelReached: state.seasonLevel,
            achievementsUnlocked: state.achievements.filter(
              (a) =>
                a.unlockedAt &&
                a.unlockedAt >= state.currentSeason.startDate &&
                a.unlockedAt <= state.currentSeason.endDate
            ).length,
            studyMinutes: state.totalStudyMinutes,
          };

          return {
            currentSeason: newSeason,
            seasonMirrorBucks: 0,
            seasonLevel: 1,
            seasonHistory: [seasonHistory, ...state.seasonHistory].slice(0, 10),
            pendingSync: true,
          };
        }

        return state;
      }),

    updateStreak: (studyMinutes?: number) =>
      set((state: ProgressState) => {
        const today = new Date().toDateString();
        const lastStudy = state.streak.lastStudyDate;
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        let newCurrent = state.streak.current;
        if (!lastStudy || new Date(lastStudy).toDateString() !== today) {
          if (lastStudy && new Date(lastStudy).toDateString() === yesterday) {
            newCurrent++;
          } else if (!lastStudy || new Date(lastStudy).toDateString() !== yesterday) {
            newCurrent = 1;
          }
        }

        // Trigger streak milestone notification if applicable
        if (newCurrent > state.streak.current) {
          onStreakMilestone(newCurrent);
        }

        // Persist to gamification DB with retry
        fetchWithRetry('/api/gamification/streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minutes: studyMinutes || 0 }),
        });

        return {
          streak: {
            current: newCurrent,
            longest: Math.max(state.streak.longest, newCurrent),
            lastStudyDate: new Date(),
          },
          pendingSync: true,
        };
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
        // Session template (xpEarned mirrors mirrorBucksEarned for backward compat)
        const newSession = {
          id: crypto.randomUUID(),
          maestroId,
          subject,
          startedAt: new Date(),
          questionsAsked: 0,
          xpEarned: 0, // @deprecated - use mirrorBucksEarned
          mirrorBucksEarned: 0,
        };

        // End any existing session first
        if (state.currentSession) {
          const endedSession = {
            ...state.currentSession,
            endedAt: new Date(),
            durationMinutes: Math.round(
              (Date.now() - new Date(state.currentSession.startedAt).getTime()) / 60000
            ),
          };
          return {
            currentSession: newSession,
            sessionHistory: [endedSession, ...state.sessionHistory].slice(0, 100),
            pendingSync: true,
          };
        }
        return {
          currentSession: newSession,
          pendingSync: true,
        };
      }),

    endSession: (grade?: SessionGrade) =>
      set((state: ProgressState) => {
        if (!state.currentSession) return state;

        const durationMinutes = Math.round(
          (Date.now() - new Date(state.currentSession.startedAt).getTime()) / 60000
        );
        const endedSession = {
          ...state.currentSession,
          endedAt: new Date(),
          durationMinutes,
          grade: grade || state.currentSession.grade,
        };

        // Calculate week sessions
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentSessions = [endedSession, ...state.sessionHistory].filter(
          (s) => new Date(s.startedAt) > weekAgo
        );

        return {
          currentSession: null,
          sessionHistory: [endedSession, ...state.sessionHistory].slice(0, 100),
          totalStudyMinutes: state.totalStudyMinutes + durationMinutes,
          sessionsThisWeek: recentSessions.length,
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
