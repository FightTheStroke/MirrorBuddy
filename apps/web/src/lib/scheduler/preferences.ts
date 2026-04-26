/**
 * Notification Preferences
 * Functions that check and filter based on user preferences
 */

import type { NotificationPreferences, StudyNotification, DayOfWeek } from './types';

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const start = preferences.quietHoursStart;
  const end = preferences.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
}

/**
 * Check if notifications should be skipped today
 */
export function shouldSkipToday(preferences: NotificationPreferences): boolean {
  if (!preferences.skipDays || preferences.skipDays.length === 0) {
    return false;
  }

  const today = new Date().getDay() as DayOfWeek;
  return preferences.skipDays.includes(today);
}

/**
 * Filter notifications based on preferences
 */
export function filterNotifications(
  notifications: StudyNotification[],
  preferences: NotificationPreferences
): StudyNotification[] {
  if (!preferences.enabled) {
    return [];
  }

  if (isQuietHours(preferences) || shouldSkipToday(preferences)) {
    // Only allow high priority during quiet hours
    return notifications.filter((n) => n.priority === 'high');
  }

  return notifications;
}
