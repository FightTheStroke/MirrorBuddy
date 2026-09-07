import type { StoreApi } from 'zustand';
import { csrfFetch } from '@/lib/auth';
import { logger } from '@/lib/logger';
import type { ProgressState, StudySession } from './progress-store-types';

function progressPayload(state: ProgressState): string {
  return JSON.stringify({
    xp: state.xp,
    mirrorBucks: state.mirrorBucks,
    level: state.level,
    streak: state.streak,
    totalStudyMinutes: state.totalStudyMinutes,
    questionsAsked: state.questionsAsked,
    sessionsThisWeek: state.sessionsThisWeek,
    masteries: state.masteries,
    achievements: state.achievements,
  });
}

function isPendingSession(session: StudySession): boolean {
  return Boolean(session.endedAt) && !session.id.startsWith('synced-');
}

export function createProgressSync(
  set: StoreApi<ProgressState>['setState'],
  get: StoreApi<ProgressState>['getState'],
): Pick<ProgressState, 'syncToServer'> {
  let syncing = false;
  return {
    syncToServer: async () => {
      const state = get();
      if (syncing || !state.pendingSync) return;
      syncing = true;
      const payload = progressPayload(state);

      try {
        const response = await csrfFetch('/api/progress', { method: 'PUT', body: payload });
        if (!response.ok) throw new Error(`Progress write failed (${response.status})`);

        for (const session of state.sessionHistory.filter(isPendingSession).slice(0, 10)) {
          let serverId = session.serverId;
          if (!serverId) {
            const created = await csrfFetch('/api/progress/sessions', {
              method: 'POST',
              body: JSON.stringify({ maestroId: session.maestroId, subject: session.subject }),
            });
            if (!created.ok) throw new Error(`Session creation failed (${created.status})`);
            const data: unknown = await created.json();
            if (
              !data ||
              typeof data !== 'object' ||
              !('id' in data) ||
              typeof data.id !== 'string' ||
              !data.id
            ) {
              throw new TypeError('Invalid session creation response');
            }
            serverId = data.id;
            // Keep the acknowledged ID so a failed completion does not create a duplicate.
            set((current) => ({
              sessionHistory: current.sessionHistory.map((entry) =>
                entry.id === session.id ? { ...entry, serverId } : entry,
              ),
            }));
          }

          const completed = await csrfFetch('/api/progress/sessions', {
            method: 'PATCH',
            body: JSON.stringify({
              id: serverId,
              duration: session.durationMinutes,
              xpEarned: session.xpEarned,
              questions: session.questionsAsked,
            }),
          });
          if (!completed.ok) throw new Error(`Session completion failed (${completed.status})`);
          set((current) => ({
            sessionHistory: current.sessionHistory.map((entry) =>
              entry.id === session.id ? { ...entry, id: `synced-${serverId}` } : entry,
            ),
          }));
        }

        const current = get();
        if (
          progressPayload(current) === payload &&
          !current.sessionHistory.some(isPendingSession)
        ) {
          set({ lastSyncedAt: new Date(), pendingSync: false });
        }
      } catch (error) {
        logger.error('Progress sync failed', { error: String(error) });
      } finally {
        syncing = false;
      }
    },
  };
}
