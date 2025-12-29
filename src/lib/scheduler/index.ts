/**
 * ConvergioEdu Study Scheduler Module
 * Smart Notifications & Proactive Learning Assistant
 *
 * Notifications are delivered by Melissa (docente di sostegno)
 * to maintain a consistent supportive voice.
 *
 * Related: Issue #27
 */

// Types
export type {
  NotificationType,
  DayOfWeek,
  RepeatFrequency,
  NotificationPriority,
  StudyNotification,
  NotificationAction,
  ScheduledSession,
  CustomReminder,
  StudySchedule,
  NotificationPreferences,
  FlashcardDueInfo,
  StudySuggestion,
  WeeklySummary,
  SchedulerConfig,
} from './types';

// Constants
export {
  NOTIFICATION_TYPES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_SCHEDULER_CONFIG,
  MELISSA_VOICE_TEMPLATES,
} from './types';

// Service functions
export {
  createNotification,
  createFlashcardDueNotification,
  createStreakWarningNotification,
  createSessionReminderNotification,
  createSuggestionNotification,
  createScheduledSession,
  createCustomReminder,
  createStudySchedule,
  isQuietHours,
  shouldSkipToday,
  filterNotifications,
  getNextSessionOccurrence,
  calculateWeeklySummary,
  generateSuggestions,
  formatTime,
  formatDate,
  getDayName,
} from './scheduler-service';
