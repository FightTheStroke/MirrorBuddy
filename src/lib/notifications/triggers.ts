/**
 * Notification Triggers
 *
 * Wrapper functions to call from app code to trigger notifications.
 * The notificationService existed but was never wired up - these
 * functions bridge the gap.
 */

import { notificationService } from './notification-service';

/**
 * Call after session ends in conversation-flow.tsx
 */
export function onSessionComplete(params: {
  duration: number;
  xpEarned: number;
  subject?: string;
  maestroName?: string;
}): void {
  notificationService.sessionComplete(params.xpEarned, params.duration);
}

/**
 * Call in progress-store.ts when level increases
 */
export function onLevelUp(newLevel: number, title: string): void {
  notificationService.levelUp(newLevel, title);
}

/**
 * Call when achievement unlocked
 */
export function onAchievement(name: string, description: string): void {
  notificationService.achievement(name, description);
}

/**
 * Call when streak reaches milestones (3, 7, 14, 30, 50, 100, 365 days)
 */
export function onStreakMilestone(days: number): void {
  const milestones = [3, 7, 14, 30, 50, 100, 365];
  if (milestones.includes(days)) {
    notificationService.streakMilestone(days);
  }
}

/**
 * Call when streak is at risk (no activity today, near end of day)
 */
export function onStreakAtRisk(currentStreak: number): void {
  notificationService.streakAtRisk(currentStreak);
}

/**
 * Call when flashcards are due for review
 */
export function onFlashcardsDue(count: number): void {
  notificationService.flashcardReview(count);
}

/**
 * Call for study reminders
 */
export function onStudyReminder(subject?: string): void {
  notificationService.studyReminder(subject);
}

/**
 * Call for break reminders (ADHD mode)
 */
export function onBreakReminder(studyMinutes: number): void {
  notificationService.breakReminder(studyMinutes);
}

/**
 * Call when MirrorBucks are earned (significant amounts)
 */
export function onMirrorBucksEarned(amount: number, reason?: string): void {
  // Only notify for significant amounts (50+ MB)
  if (amount >= 50) {
    // For now, just log - can be extended with coach announcements
    import('@/lib/logger').then(({ logger }) => {
      logger.info('Significant MirrorBucks earned', { amount, reason });
    });
  }
}
