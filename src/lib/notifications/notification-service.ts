/**
 * Notification Service
 *
 * STATUS: NOT_IMPLEMENTED
 *
 * This is a stub for the notification system. The notification feature
 * has been designed but not yet implemented. The UI placeholders exist
 * but no actual notification delivery occurs.
 *
 * Future implementation should support:
 * - In-app notifications (toast/banner)
 * - Push notifications (web push API)
 * - Email notifications (for important events)
 * - Notification preferences per user
 *
 * @see GitHub Issue #14
 */

// Notification types planned for implementation
export type NotificationType =
  | 'achievement'      // Achievement unlocked
  | 'streak'           // Streak milestone
  | 'reminder'         // Study reminder
  | 'break'            // ADHD break reminder
  | 'session_end'      // Session completed
  | 'level_up'         // Level progression
  | 'calendar'         // Upcoming event reminder
  | 'system';          // System messages

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
  email: boolean;
  // Per-type preferences
  achievements: boolean;
  streaks: boolean;
  reminders: boolean;
  breaks: boolean;
}

// Default preferences (stub)
const defaultPreferences: NotificationPreferences = {
  enabled: true,
  inApp: true,
  push: false,
  email: false,
  achievements: true,
  streaks: true,
  reminders: true,
  breaks: true,
};

/**
 * NOT_IMPLEMENTED: Notification Service Stub
 *
 * All methods are stubs that log to console and return immediately.
 * No actual notification delivery occurs.
 */
export const notificationService = {
  /**
   * NOT_IMPLEMENTED: Send a notification
   * Currently only logs to console for debugging.
   */
  send: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void => {
    // NOT_IMPLEMENTED: Stub implementation
    console.debug('[NotificationService] NOT_IMPLEMENTED - Would send:', notification);
  },

  /**
   * NOT_IMPLEMENTED: Get user's unread notifications
   * Returns empty array.
   */
  getUnread: (): Notification[] => {
    // NOT_IMPLEMENTED: Stub implementation
    console.debug('[NotificationService] NOT_IMPLEMENTED - getUnread called');
    return [];
  },

  /**
   * NOT_IMPLEMENTED: Get all notifications for user
   * Returns empty array.
   */
  getAll: (): Notification[] => {
    // NOT_IMPLEMENTED: Stub implementation
    console.debug('[NotificationService] NOT_IMPLEMENTED - getAll called');
    return [];
  },

  /**
   * NOT_IMPLEMENTED: Mark notification as read
   */
  markRead: (notificationId: string): void => {
    // NOT_IMPLEMENTED: Stub implementation
    console.debug('[NotificationService] NOT_IMPLEMENTED - markRead:', notificationId);
  },

  /**
   * NOT_IMPLEMENTED: Mark all notifications as read
   */
  markAllRead: (): void => {
    // NOT_IMPLEMENTED: Stub implementation
    console.debug('[NotificationService] NOT_IMPLEMENTED - markAllRead called');
  },

  /**
   * NOT_IMPLEMENTED: Get notification preferences
   * Returns default preferences.
   */
  getPreferences: (): NotificationPreferences => {
    // NOT_IMPLEMENTED: Stub implementation
    console.debug('[NotificationService] NOT_IMPLEMENTED - getPreferences called');
    return defaultPreferences;
  },

  /**
   * NOT_IMPLEMENTED: Update notification preferences
   */
  updatePreferences: (preferences: Partial<NotificationPreferences>): void => {
    // NOT_IMPLEMENTED: Stub implementation
    console.debug('[NotificationService] NOT_IMPLEMENTED - updatePreferences:', preferences);
  },

  /**
   * NOT_IMPLEMENTED: Request push notification permission
   * Returns rejected promise.
   */
  requestPushPermission: async (): Promise<boolean> => {
    // NOT_IMPLEMENTED: Stub implementation
    console.debug('[NotificationService] NOT_IMPLEMENTED - requestPushPermission called');
    return false;
  },

  /**
   * NOT_IMPLEMENTED: Check if push notifications are supported
   */
  isPushSupported: (): boolean => {
    // NOT_IMPLEMENTED: Stub implementation
    return typeof window !== 'undefined' && 'Notification' in window;
  },
};

export default notificationService;
