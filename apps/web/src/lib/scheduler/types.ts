/**
 * Study Scheduler Types - Barrel Export
 * Re-exports all scheduler-related types and configurations
 *
 * Notifications are delivered by Melissa (docente di sostegno)
 * to maintain a consistent supportive voice.
 *
 * Related: Issue #27
 */

export type { DayOfWeek, RepeatFrequency, ScheduledSession, CustomReminder } from './session-types';

export type {
  NotificationType,
  NotificationPriority,
  NotificationAction,
  StudyNotification,
  FlashcardDueInfo,
  StudySuggestion,
} from './notification-types';

export {
  NOTIFICATION_TYPES,
} from './notification-types';

export type { NotificationPreferences } from './preferences-types';
export { DEFAULT_NOTIFICATION_PREFERENCES } from './preferences-types';

export type { StudySchedule, SchedulerConfig, WeeklySummary } from './summary-types';
export { DEFAULT_SCHEDULER_CONFIG } from './summary-types';

export { MELISSA_VOICE_TEMPLATES } from './voice-templates';
