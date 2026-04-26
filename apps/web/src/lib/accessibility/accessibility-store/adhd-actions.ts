// ============================================================================
// ADHD SESSION ACTIONS
// Functions for managing ADHD session state and statistics
// ============================================================================

import type { ADHDSessionConfig, ADHDSessionStats, ADHDSessionState } from './types';

export interface ADHDState {
  adhdConfig: ADHDSessionConfig;
  adhdStats: ADHDSessionStats;
  adhdSessionState: ADHDSessionState;
  adhdTimeRemaining: number;
  adhdSessionProgress: number;
}

/**
 * Start a new ADHD work session
 */
export function startADHDSession(state: ADHDState): Partial<ADHDState> {
  return {
    adhdSessionState: 'working',
    adhdTimeRemaining: state.adhdConfig.workDuration,
    adhdSessionProgress: 0,
    adhdStats: {
      ...state.adhdStats,
      totalSessions: state.adhdStats.totalSessions + 1,
    },
  };
}

/**
 * Stop the ADHD session and reset
 */
export function stopADHDSession(state: ADHDState): Partial<ADHDState> {
  return {
    adhdSessionState: 'idle',
    adhdTimeRemaining: state.adhdConfig.workDuration,
    adhdSessionProgress: 0,
  };
}

/**
 * Complete an ADHD session and update stats
 */
export function completeADHDSession(state: ADHDState): Partial<ADHDState> {
  const today = new Date().toDateString();
  const lastSessionDay = state.adhdStats.lastSessionDate
    ? new Date(state.adhdStats.lastSessionDate).toDateString()
    : null;

  let newStreak = state.adhdStats.currentStreak;
  if (lastSessionDay === today) {
    // Same day, streak continues
  } else if (
    lastSessionDay &&
    new Date(today).getTime() - new Date(lastSessionDay).getTime() <=
      24 * 60 * 60 * 1000
  ) {
    // Consecutive day
    newStreak += 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  return {
    adhdSessionState: 'completed',
    adhdStats: {
      ...state.adhdStats,
      completedSessions: state.adhdStats.completedSessions + 1,
      totalWorkTime:
        state.adhdStats.totalWorkTime + state.adhdConfig.workDuration,
      currentStreak: newStreak,
      longestStreak: Math.max(state.adhdStats.longestStreak, newStreak),
      totalXPEarned: state.adhdConfig.enableGamification
        ? state.adhdStats.totalXPEarned + state.adhdConfig.xpPerSession
        : state.adhdStats.totalXPEarned,
      lastSessionDate: new Date().toISOString(),
    },
  };
}

/**
 * Start a break period
 */
export function startADHDBreak(state: ADHDState, isLongBreak = false): Partial<ADHDState> {
  return {
    adhdSessionState: 'breakTime',
    adhdTimeRemaining: isLongBreak
      ? state.adhdConfig.longBreakDuration
      : state.adhdConfig.breakDuration,
    adhdSessionProgress: 0,
  };
}

/**
 * Tick the timer by 1 second
 */
export function tickADHDTimer(state: ADHDState): Partial<ADHDState> {
  const newTime = Math.max(0, state.adhdTimeRemaining - 1);
  const totalDuration =
    state.adhdSessionState === 'working'
      ? state.adhdConfig.workDuration
      : state.adhdStats.completedSessions %
          state.adhdConfig.sessionsUntilLongBreak ===
        0
      ? state.adhdConfig.longBreakDuration
      : state.adhdConfig.breakDuration;

  return {
    adhdTimeRemaining: newTime,
    adhdSessionProgress: 1 - newTime / totalDuration,
  };
}

/**
 * Format remaining time as MM:SS
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate session completion rate
 */
export function getCompletionRate(stats: ADHDSessionStats): number {
  if (stats.totalSessions === 0) return 0;
  return stats.completedSessions / stats.totalSessions;
}
