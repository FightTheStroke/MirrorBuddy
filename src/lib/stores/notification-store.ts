/**
 * Notification Store - Zustand store for notification state management
 * In-memory only - server sync via /api/notifications
 */

import { create } from 'zustand';
import {
  isTypeEnabled,
  playNotificationSound,
  showBrowserNotification,
  getNotificationIcon,
} from './notification-helpers';

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

interface NotificationState {
  notifications: Notification[];
  preferences: NotificationPreferences;
  pushPermission: NotificationPermission | 'unsupported';
  unreadCount: number;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  setPushPermission: (permission: NotificationPermission | 'unsupported') => void;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  inApp: true,
  push: false,
  sound: true,
  achievements: true,
  streaks: true,
  reminders: true,
  breaks: true,
  levelUp: true,
  sessionEnd: true,
};

// Generate unique ID
const generateId = (): string => {
  return `notif_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
};

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
      notifications: [],
      preferences: DEFAULT_PREFERENCES,
      pushPermission: typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'unsupported',
      unreadCount: 0,

      addNotification: (notification) => {
        const { preferences } = get();

        // Check if notifications are enabled
        if (!preferences.enabled) return;

        // Check type-specific preference
        const typeEnabled = isTypeEnabled(notification.type, preferences);
        if (!typeEnabled) return;

        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          timestamp: new Date(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep max 100
          unreadCount: state.unreadCount + 1,
        }));

        // Play sound if enabled
        if (preferences.sound && preferences.inApp) {
          playNotificationSound();
        }

        // Show browser notification if push is enabled and permitted
        if (preferences.push && get().pushPermission === 'granted') {
          showBrowserNotification(newNotification);
        }
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      deleteNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      updatePreferences: (prefs) => {
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        }));
      },

      setPushPermission: (permission) => {
        set({ pushPermission: permission });
      },
    })
);

// Request push permission
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    useNotificationStore.getState().setPushPermission('unsupported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    useNotificationStore.getState().setPushPermission(permission);
    return permission === 'granted';
  } catch {
    return false;
  }
}

// Check if push is supported
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}
