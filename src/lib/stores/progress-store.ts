// ============================================================================
// PROGRESS STORE - Gamification and session tracking
// ============================================================================

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { onLevelUp, onStreakMilestone, onAchievement } from '@/lib/notifications/triggers';
import type { Streak, Achievement, SubjectMastery } from '@/types';
import { XP_PER_LEVEL } from '@/lib/constants/xp-rewards';

// === TYPES ===

// Session grade given by maestro (1-10 scale)
export interface SessionGrade {
  score: number; // 1-10
  feedback: string;
  strengths: string[];
  areasToImprove: string[];
}

interface StudySession {
  id: string;
  maestroId: string;
  subject: string;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
  questionsAsked: number;
  xpEarned: number;
  grade?: SessionGrade; // Grade given by maestro at end of session
}

// === STORE ===

interface ProgressState {
  xp: number;
  level: number;
  streak: Streak;
  masteries: SubjectMastery[];
  achievements: Achievement[];
  totalStudyMinutes: number;
  sessionsThisWeek: number;
  questionsAsked: number;
  // Session tracking
  currentSession: StudySession | null;
  sessionHistory: StudySession[];
  // Sync state
  lastSyncedAt: Date | null;
  pendingSync: boolean;
  // Actions
  addXP: (amount: number) => void;
  updateStreak: () => void;
  updateMastery: (subjectMastery: SubjectMastery) => void;
  unlockAchievement: (achievementId: string) => void;
  addStudyMinutes: (minutes: number) => void;
  incrementQuestions: () => void;
  // Session actions
  startSession: (maestroId: string, subject: string) => void;
  endSession: (grade?: SessionGrade) => void;
  gradeCurrentSession: (grade: SessionGrade) => void;
  // Sync actions
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>()(
  (set, get) => ({
      xp: 0,
      level: 1,
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

      addXP: (amount) =>
        set((state) => {
          const newXP = state.xp + amount;
          let newLevel = state.level;
          while (
            newLevel < XP_PER_LEVEL.length - 1 &&
            newXP >= XP_PER_LEVEL[newLevel]
          ) {
            newLevel++;
          }
          // Trigger level up notification if level increased
          if (newLevel > state.level) {
            const levelTitles: Record<number, string> = {
              1: 'Principiante',
              2: 'Apprendista',
              3: 'Studente',
              4: 'Studioso',
              5: 'Esperto',
              6: 'Professore',
              7: 'Gran Professore',
              8: 'Saggio',
              9: 'Illuminato',
              10: 'Leggenda',
            };
            onLevelUp(newLevel, levelTitles[newLevel] || `Livello ${newLevel}`);
          } else if (amount > 0) {
            // Show XP toast notification (only if not leveling up to avoid duplicate notifications)
            // Import toast dynamically to avoid circular dependencies
            import('@/components/ui/toast').then(({ default: toast }) => {
              toast.success(`+${amount} XP`, `Totale: ${newXP} XP`, { duration: 3000 });
            }).catch((err) => {
              logger.warn('Failed to show XP toast', { error: err });
            });
          }
          // Update current session XP
          const updatedSession = state.currentSession
            ? { ...state.currentSession, xpEarned: state.currentSession.xpEarned + amount }
            : null;
          return { xp: newXP, level: newLevel, currentSession: updatedSession, pendingSync: true };
        }),

      updateStreak: () =>
        set((state) => {
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

          return {
            streak: {
              current: newCurrent,
              longest: Math.max(state.streak.longest, newCurrent),
              lastStudyDate: new Date(),
            },
            pendingSync: true,
          };
        }),

      updateMastery: (subjectMastery) =>
        set((state) => {
          const existing = state.masteries.findIndex(
            (m) => m.subject === subjectMastery.subject
          );
          if (existing >= 0) {
            const newMasteries = [...state.masteries];
            newMasteries[existing] = subjectMastery;
            return { masteries: newMasteries, pendingSync: true };
          }
          return { masteries: [...state.masteries, subjectMastery], pendingSync: true };
        }),

      unlockAchievement: (achievementId) =>
        set((state) => {
          const achievement = state.achievements.find(
            (a) => a.id === achievementId
          );
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

      addStudyMinutes: (minutes) =>
        set((state) => ({
          totalStudyMinutes: state.totalStudyMinutes + minutes,
          pendingSync: true,
        })),

      incrementQuestions: () =>
        set((state) => {
          const updatedSession = state.currentSession
            ? { ...state.currentSession, questionsAsked: state.currentSession.questionsAsked + 1 }
            : null;
          return {
            questionsAsked: state.questionsAsked + 1,
            currentSession: updatedSession,
            pendingSync: true,
          };
        }),

      startSession: (maestroId, subject) =>
        set((state) => {
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
              currentSession: {
                id: crypto.randomUUID(),
                maestroId,
                subject,
                startedAt: new Date(),
                questionsAsked: 0,
                xpEarned: 0,
              },
              sessionHistory: [endedSession, ...state.sessionHistory].slice(0, 100),
              pendingSync: true,
            };
          }
          return {
            currentSession: {
              id: crypto.randomUUID(),
              maestroId,
              subject,
              startedAt: new Date(),
              questionsAsked: 0,
              xpEarned: 0,
            },
            pendingSync: true,
          };
        }),

      endSession: (grade) =>
        set((state) => {
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

      gradeCurrentSession: (grade) =>
        set((state) => {
          if (!state.currentSession) return state;
          return {
            currentSession: { ...state.currentSession, grade },
            pendingSync: true,
          };
        }),

      syncToServer: async () => {
        const state = get();
        if (!state.pendingSync) return;

        try {
          // Sync main progress
          await fetch('/api/progress', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              xp: state.xp,
              level: state.level,
              streak: state.streak,
              totalStudyMinutes: state.totalStudyMinutes,
              questionsAsked: state.questionsAsked,
              masteries: state.masteries,
              achievements: state.achievements,
            }),
          });

          // Sync recent sessions
          const unsyncedSessions = state.sessionHistory.filter(
            (s) => s.endedAt && !s.id.startsWith('synced-')
          ).slice(0, 10);

          for (const session of unsyncedSessions) {
            await fetch('/api/progress/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(session),
            });
          }

          set({ lastSyncedAt: new Date(), pendingSync: false });
        } catch (error) {
          logger.error('Progress sync failed', { error: String(error) });
        }
      },

      loadFromServer: async () => {
        try {
          const [progressRes, sessionsRes] = await Promise.all([
            fetch('/api/progress'),
            fetch('/api/progress/sessions?limit=20'),
          ]);

          if (progressRes.ok) {
            const data = await progressRes.json();
            set((state) => ({
              xp: data.xp ?? state.xp,
              level: data.level ?? state.level,
              streak: data.streak ?? state.streak,
              masteries: data.masteries ?? state.masteries,
              achievements: data.achievements ?? state.achievements,
              totalStudyMinutes: data.totalStudyMinutes ?? state.totalStudyMinutes,
              questionsAsked: data.questionsAsked ?? state.questionsAsked,
            }));
          }

          if (sessionsRes.ok) {
            const sessions = await sessionsRes.json();
            if (Array.isArray(sessions)) {
              // Calculate sessionsThisWeek from DB sessions
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              const recentCount = sessions.filter(
                (s: StudySession) => new Date(s.startedAt) > weekAgo
              ).length;

              set({
                sessionHistory: sessions.map((s: StudySession) => ({
                  ...s,
                  id: `synced-${s.id}`, // Mark as synced
                  startedAt: new Date(s.startedAt),
                  endedAt: s.endedAt ? new Date(s.endedAt) : undefined,
                })),
                sessionsThisWeek: recentCount,
              });
            }
          }

          set({ lastSyncedAt: new Date(), pendingSync: false });
        } catch (error) {
          logger.error('Progress load failed', { error: String(error) });
        }
      },
    })
);
