/**
 * Notification Preferences Type Definition
 * User notification settings and defaults
 */

import type { DayOfWeek } from './session-types';

export interface NotificationPreferences {
  enabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  voiceEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  skipDays?: DayOfWeek[];
  minIntervalMinutes: number;
  streakWarningTime: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  pushEnabled: false,
  inAppEnabled: true,
  voiceEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  minIntervalMinutes: 30,
  streakWarningTime: '21:00',
};
