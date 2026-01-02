/**
 * Notification Store - Zustand store for notification state management
 * In-memory only - server sync via /api/notifications
 */

import { create } from 'zustand';

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

// Helper: Check if notification type is enabled
function isTypeEnabled(type: NotificationType, prefs: NotificationPreferences): boolean {
  switch (type) {
    case 'achievement':
      return prefs.achievements;
    case 'streak':
      return prefs.streaks;
    case 'reminder':
    case 'calendar':
      return prefs.reminders;
    case 'break':
      return prefs.breaks;
    case 'level_up':
      return prefs.levelUp;
    case 'session_end':
      return prefs.sessionEnd;
    case 'system':
      return true; // System notifications always enabled
    default:
      return true;
  }
}

// Play notification sound
function playNotificationSound(): void {
  try {
    // Use Web Audio API for a simple notification sound
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Audio not available, ignore
  }
}

// Show browser notification
function showBrowserNotification(notification: Notification): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const icon = getNotificationIcon(notification.type);
    new Notification(notification.title, {
      body: notification.message,
      icon,
      tag: notification.id,
      requireInteraction: notification.type === 'reminder' || notification.type === 'break',
    });
  } catch {
    // Browser notification failed, ignore
  }
}

// Get icon for notification type
function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    achievement: '/icons/achievement.png',
    streak: '/icons/streak.png',
    reminder: '/icons/reminder.png',
    break: '/icons/break.png',
    session_end: '/icons/session.png',
    level_up: '/icons/levelup.png',
    calendar: '/icons/calendar.png',
    system: '/icons/system.png',
  };
  return icons[type] || '/icons/notification.png';
}

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
