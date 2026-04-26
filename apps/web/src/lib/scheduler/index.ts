/**
 * MirrorBuddy Study Scheduler Module
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

// Notification creators
export {
  createNotification,
  createFlashcardDueNotification,
  createStreakWarningNotification,
  createSessionReminderNotification,
  createSuggestionNotification,
} from './notifications';

// Entity creators
export {
  createScheduledSession,
  createCustomReminder,
  createStudySchedule,
} from './entities';

// Preference checking
export {
  isQuietHours,
  shouldSkipToday,
  filterNotifications,
} from './preferences';

// Scheduling logic
export {
  getNextSessionOccurrence,
} from './scheduling';

// Analytics and suggestions
export {
  calculateWeeklySummary,
  generateSuggestions,
} from './analytics';

// Formatting utilities
export {
  formatTime,
  formatDate,
  getDayName,
} from './formatting';
