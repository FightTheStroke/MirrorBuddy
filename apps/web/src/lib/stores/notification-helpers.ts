/**
 * Notification Store Helper Functions
 */

import type { NotificationType, Notification, NotificationPreferences } from './notification-types';

/**
 * Helper: Check if notification type is enabled
 */
export function isTypeEnabled(type: NotificationType, prefs: NotificationPreferences): boolean {
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

/**
 * Play notification sound
 */
export function playNotificationSound(): void {
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

/**
 * Get icon for notification type
 */
export function getNotificationIcon(type: NotificationType): string {
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

/**
 * Show browser notification
 */
export function showBrowserNotification(notification: Notification): void {
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
