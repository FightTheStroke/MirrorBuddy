// ============================================================================
// PROGRESS STORE - Gamification and session tracking
// ============================================================================

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { getCurrentSeason } from '@/lib/gamification/seasons';
import type { ProgressState, StudySession } from './progress-store-types';
import { createProgressActions } from './progress-store-actions';
import { createProgressSync } from './progress-store-sync';
import { isUndeliveredRequest } from './undelivered-request';

// Re-export types for convenience
export type { StudySession, SessionGrade } from './progress-store-types';

export const useProgressStore = create<ProgressState>()((set, get) => ({
  // Initialize with current season
  xp: 0,
  mirrorBucks: 0,
  level: 1,
  seasonMirrorBucks: 0,
  seasonLevel: 1,
  allTimeLevel: 1,
  currentSeason: getCurrentSeason(),
  seasonHistory: [],
  streak: { current: 0, longest: 0 },
  masteries: [],
  achievements: [],
  totalStudyMinutes: 0,
  sessionsThisWeek: 0,
  questionsAsked: 0,
  currentSession: null,
  sessionHistory: [],
  lastSyncedAt: null,
  pendingSync: false,
  needsHydration: false,

  // Actions
  ...createProgressActions(set, get),

  ...createProgressSync(set, get),

  loadFromServer: async (signal?: AbortSignal) => {
    set({ needsHydration: true });
    const snapshot = get();
    try {
      const results = await Promise.allSettled([
        fetch('/api/progress', { signal }).then(async (response) => {
          if (!response.ok) throw new Error(`Progress read failed (${response.status})`);
          const data = await response.json();
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new TypeError('Invalid progress response');
          }
          return data;
        }),
        fetch('/api/progress/sessions?limit=20', { signal }).then(async (response) => {
          if (!response.ok) throw new Error(`Sessions read failed (${response.status})`);
          const data = await response.json();
          if (
            !Array.isArray(data) ||
            data.some(
              (session) =>
                !session ||
                typeof session.id !== 'string' ||
                typeof session.startedAt !== 'string' ||
                Number.isNaN(new Date(session.startedAt).getTime()) ||
                (session.endedAt != null &&
                  (typeof session.endedAt !== 'string' ||
                    Number.isNaN(new Date(session.endedAt).getTime()))),
            )
          ) {
            throw new TypeError('Invalid sessions response');
          }
          return data.map((s: StudySession) => ({
            ...s,
            id: `synced-${s.id}`,
            startedAt: new Date(s.startedAt),
            endedAt: s.endedAt ? new Date(s.endedAt) : undefined,
          }));
        }),
      ]);

      // Failed reads remain pending for auto-sync, including undelivered requests.
      if (results[0].status === 'rejected' && !isUndeliveredRequest(results[0].reason)) {
        logger.warn('Progress fetch failed', {
          error: String(results[0].reason),
        });
      }
      if (results[1].status === 'rejected' && !isUndeliveredRequest(results[1].reason)) {
        logger.warn('Sessions fetch failed', {
          error: String(results[1].reason),
        });
      }

      // Neither hydration nor an older response may acknowledge unsaved edits.
      if (signal?.aborted || get() !== snapshot || snapshot.pendingSync) return;
      const patch: Partial<ProgressState> = {};
      if (results[0].status === 'fulfilled') {
        const data = results[0].value;
        Object.assign(patch, {
          // Legacy fields
          xp: data.xp ?? snapshot.xp,
          level: data.level ?? snapshot.level,
          streak: data.streak ?? snapshot.streak,
          masteries: data.masteries ?? snapshot.masteries,
          achievements: data.achievements ?? snapshot.achievements,
          totalStudyMinutes: data.totalStudyMinutes ?? snapshot.totalStudyMinutes,
          questionsAsked: data.questionsAsked ?? snapshot.questionsAsked,
          // MirrorBucks/Season fields
          mirrorBucks: data.mirrorBucks ?? snapshot.mirrorBucks,
          seasonMirrorBucks: data.seasonMirrorBucks ?? snapshot.seasonMirrorBucks,
          seasonLevel: data.seasonLevel ?? snapshot.seasonLevel,
          allTimeLevel: data.allTimeLevel ?? snapshot.allTimeLevel,
          currentSeason: data.currentSeason ?? snapshot.currentSeason,
          seasonHistory: data.seasonHistory ?? snapshot.seasonHistory,
        });
      }

      if (results[1].status === 'fulfilled') {
        const sessions = results[1].value;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        patch.sessionHistory = sessions;
        patch.sessionsThisWeek = sessions.filter((s) => s.startedAt > weekAgo).length;
      }

      const complete = results.every((result) => result.status === 'fulfilled');
      set({
        ...patch,
        needsHydration: !complete,
        ...(complete ? { lastSyncedAt: new Date() } : {}),
      });
    } catch (error) {
      if (isUndeliveredRequest(error)) return;
      logger.error('Progress load failed', { error: String(error) });
    }
  },
}));
