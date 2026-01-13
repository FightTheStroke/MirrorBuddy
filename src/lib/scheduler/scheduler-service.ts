/**
 * Study Scheduler Service (DEPRECATED)
 * This file has been split into focused modules for better maintainability.
 *
 * Imports have been migrated to:
 * - ./notifications.ts (notification creators)
 * - ./entities.ts (entity creators)
 * - ./preferences.ts (preference checking)
 * - ./scheduling.ts (scheduling logic)
 * - ./analytics.ts (analytics and suggestions)
 * - ./formatting.ts (formatting utilities)
 *
 * This file now re-exports from the new modules for backwards compatibility.
 * New code should import directly from the specific modules or from ./index.ts.
 *
 * Related: Issue #27
 */

// Re-export everything from specialized modules for backwards compatibility
export {
  createNotification,
  createFlashcardDueNotification,
  createStreakWarningNotification,
  createSessionReminderNotification,
  createSuggestionNotification,
} from './notifications';

export {
  createScheduledSession,
  createCustomReminder,
  createStudySchedule,
} from './entities';

export {
  isQuietHours,
  shouldSkipToday,
  filterNotifications,
} from './preferences';

export {
  getNextSessionOccurrence,
} from './scheduling';

export {
  calculateWeeklySummary,
  generateSuggestions,
} from './analytics';

export {
  formatTime,
  formatDate,
  getDayName,
} from './formatting';
