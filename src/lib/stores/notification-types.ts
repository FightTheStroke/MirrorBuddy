/**
 * Notification Types
 * Shared types for notification store to avoid circular dependencies
 */

export type NotificationType =
  | 'achievement'
  | 'streak'
  | 'reminder'
  | 'break'
  | 'session_end'
  | 'level_up'
  | 'calendar'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  enabled: boolean;
  inApp: boolean;
  push: boolean;
  sound: boolean;
  // Per-type preferences
  achievements: boolean;
  streaks: boolean;
  reminders: boolean;
  breaks: boolean;
  levelUp: boolean;
  sessionEnd: boolean;
}
