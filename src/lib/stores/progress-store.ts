// ============================================================================
// PROGRESS STORE - Gamification and session tracking
// ============================================================================

import { create } from "zustand";
import { logger } from "@/lib/logger";
import { getCurrentSeason } from "@/lib/gamification/seasons";
import type { ProgressState, StudySession } from "./progress-store-types";
import { createProgressActions } from "./progress-store-actions";
import { csrfFetch } from "@/lib/auth/csrf-client";

// Re-export types for convenience
export type { StudySession, SessionGrade } from "./progress-store-types";

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

  // Actions
  ...createProgressActions(set, get),

  // Server sync
  syncToServer: async () => {
    const state = get();
    if (!state.pendingSync) return;

    try {
      // Sync main progress
      await csrfFetch("/api/progress", {
        method: "PUT",
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
      const unsyncedSessions = state.sessionHistory
        .filter((s) => s.endedAt && !s.id.startsWith("synced-"))
        .slice(0, 10);

      for (const session of unsyncedSessions) {
        await csrfFetch("/api/progress/sessions", {
          method: "POST",
          body: JSON.stringify(session),
        });
      }

      set({ lastSyncedAt: new Date(), pendingSync: false });
    } catch (error) {
      logger.error("Progress sync failed", { error: String(error) });
    }
  },

  loadFromServer: async () => {
    try {
      // Use allSettled for partial failure resilience
      const results = await Promise.allSettled([
        fetch("/api/progress"),
        fetch("/api/progress/sessions?limit=20"),
      ]);

      const progressRes =
        results[0].status === "fulfilled" ? results[0].value : null;
      const sessionsRes =
        results[1].status === "fulfilled" ? results[1].value : null;

      // Log failures but continue with partial data
      if (results[0].status === "rejected") {
        logger.warn("Progress fetch failed", {
          error: String(results[0].reason),
        });
      }
      if (results[1].status === "rejected") {
        logger.warn("Sessions fetch failed", {
          error: String(results[1].reason),
        });
      }

      if (progressRes?.ok) {
        const data = await progressRes.json();
        set((state) => ({
          // Legacy fields
          xp: data.xp ?? state.xp,
          level: data.level ?? state.level,
          streak: data.streak ?? state.streak,
          masteries: data.masteries ?? state.masteries,
          achievements: data.achievements ?? state.achievements,
          totalStudyMinutes: data.totalStudyMinutes ?? state.totalStudyMinutes,
          questionsAsked: data.questionsAsked ?? state.questionsAsked,
          // MirrorBucks/Season fields
          mirrorBucks: data.mirrorBucks ?? state.mirrorBucks,
          seasonMirrorBucks: data.seasonMirrorBucks ?? state.seasonMirrorBucks,
          seasonLevel: data.seasonLevel ?? state.seasonLevel,
          allTimeLevel: data.allTimeLevel ?? state.allTimeLevel,
          currentSeason: data.currentSeason ?? state.currentSeason,
          seasonHistory: data.seasonHistory ?? state.seasonHistory,
        }));
      }

      if (sessionsRes?.ok) {
        const sessions = await sessionsRes.json();
        if (Array.isArray(sessions)) {
          // Calculate sessionsThisWeek from DB sessions
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const recentCount = sessions.filter(
            (s: StudySession) => new Date(s.startedAt) > weekAgo,
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
      logger.error("Progress load failed", { error: String(error) });
    }
  },
}));
