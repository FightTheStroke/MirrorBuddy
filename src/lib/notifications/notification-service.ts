/**
 * Notification Service
 *
 * Provides high-level notification triggers for the application.
 * Uses the notification store for state management and delivery.
 */

import { useNotificationStore, requestPushPermission, isPushSupported } from '@/lib/stores/notification-store';
import type { NotificationType } from '@/lib/stores/notification-store';

export type { NotificationType };
export { requestPushPermission, isPushSupported };

// Re-export preferences type
export type { NotificationPreferences, Notification } from '@/lib/stores/notification-store';

/**
 * Notification triggers for common events
 */
export const notificationService = {
  /**
   * Send a notification
   */
  send: (params: {
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }): void => {
    useNotificationStore.getState().addNotification(params);
  },

  /**
   * Achievement unlocked
   */
  achievement: (name: string, description: string): void => {
    useNotificationStore.getState().addNotification({
      type: 'achievement',
      title: `Obiettivo sbloccato: ${name}`,
      message: description,
      actionUrl: '/progressi',
    });
  },

  /**
   * Streak milestone reached
   */
  streakMilestone: (days: number): void => {
    const messages: Record<number, string> = {
      3: 'Ottimo inizio! Continua così!',
      7: 'Una settimana intera! Sei fantastico!',
      14: 'Due settimane di studio! Incredibile!',
      30: 'Un mese di impegno costante! Sei un campione!',
      100: 'CENTO GIORNI! Sei una leggenda!',
    };

    const message = messages[days] || `${days} giorni consecutivi di studio!`;

    useNotificationStore.getState().addNotification({
      type: 'streak',
      title: `🔥 Streak: ${days} giorni!`,
      message,
      actionUrl: '/progressi',
    });
  },

  /**
   * Streak at risk warning
   */
  streakAtRisk: (currentStreak: number): void => {
    useNotificationStore.getState().addNotification({
      type: 'streak',
      title: 'La tua streak è a rischio!',
      message: `Hai una streak di ${currentStreak} giorni. Studia oggi per non perderla!`,
      actionUrl: '/maestri',
    });
  },

  /**
   * Study reminder
   */
  studyReminder: (subject?: string): void => {
    const title = subject
      ? `È ora di studiare ${subject}!`
      : 'È ora di studiare!';

    useNotificationStore.getState().addNotification({
      type: 'reminder',
      title,
      message: 'I tuoi Maestri ti aspettano. Anche solo 15 minuti fanno la differenza!',
      actionUrl: '/maestri',
    });
  },

  /**
   * Flashcard review reminder
   */
  flashcardReview: (cardsCount: number): void => {
    useNotificationStore.getState().addNotification({
      type: 'reminder',
      title: 'Flashcard da ripassare',
      message: `Hai ${cardsCount} carte pronte per il ripasso. Il momento perfetto per consolidare!`,
      actionUrl: '/strumenti/flashcards',
    });
  },

  /**
   * Break reminder (ADHD mode)
   */
  breakReminder: (studyMinutes: number): void => {
    useNotificationStore.getState().addNotification({
      type: 'break',
      title: 'Tempo di una pausa!',
      message: `Hai studiato per ${studyMinutes} minuti. Fai una breve pausa per ricaricare le energie.`,
    });
  },

  /**
   * Session completed
   */
  sessionComplete: (xpEarned: number, minutesStudied: number): void => {
    useNotificationStore.getState().addNotification({
      type: 'session_end',
      title: 'Sessione completata!',
      message: `Hai guadagnato ${xpEarned} XP in ${minutesStudied} minuti di studio. Ottimo lavoro!`,
      actionUrl: '/progressi',
    });
  },

  /**
   * Level up
   */
  levelUp: (newLevel: number, newTitle: string): void => {
    useNotificationStore.getState().addNotification({
      type: 'level_up',
      title: `Livello ${newLevel} raggiunto!`,
      message: `Sei diventato "${newTitle}". Continua così per salire ancora!`,
      actionUrl: '/progressi',
    });
  },

  /**
   * Calendar event reminder
   */
  calendarEvent: (eventName: string, timeUntil: string): void => {
    useNotificationStore.getState().addNotification({
      type: 'calendar',
      title: eventName,
      message: `Tra ${timeUntil}`,
      actionUrl: '/calendario',
    });
  },

  /**
   * System notification
   */
  system: (title: string, message: string): void => {
    useNotificationStore.getState().addNotification({
      type: 'system',
      title,
      message,
    });
  },

  /**
   * Get unread notifications
   */
  getUnread: () => {
    const state = useNotificationStore.getState();
    return state.notifications.filter((n) => !n.read);
  },

  /**
   * Get all notifications
   */
  getAll: () => {
    return useNotificationStore.getState().notifications;
  },

  /**
   * Mark notification as read
   */
  markRead: (id: string): void => {
    useNotificationStore.getState().markAsRead(id);
  },

  /**
   * Mark all as read
   */
  markAllRead: (): void => {
    useNotificationStore.getState().markAllAsRead();
  },

  /**
   * Get preferences
   */
  getPreferences: () => {
    return useNotificationStore.getState().preferences;
  },

  /**
   * Update preferences
   */
  updatePreferences: (prefs: Partial<import('@/lib/stores/notification-store').NotificationPreferences>): void => {
    useNotificationStore.getState().updatePreferences(prefs);
  },

  /**
   * Request push permission
   */
  requestPushPermission,

  /**
   * Check if push is supported
   */
  isPushSupported,
};

export default notificationService;
