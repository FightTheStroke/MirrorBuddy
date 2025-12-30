/**
 * Server-side Notification Triggers
 *
 * Creates notifications in the database for various app events.
 * These are then fetched by the client and displayed via the notification store.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export type NotificationType =
  | 'achievement'
  | 'streak'
  | 'reminder'
  | 'break'
  | 'session_end'
  | 'level_up'
  | 'calendar'
  | 'system';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

/**
 * Create a notification in the database
 */
async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        sentAt: new Date(),
        expiresAt: params.expiresAt,
      },
    });
    logger.info('Server notification created', { userId: params.userId, type: params.type });
  } catch (error) {
    logger.error('Failed to create server notification', { error: String(error), params });
  }
}

/**
 * Server-side notification triggers
 */
export const serverNotifications = {
  /**
   * Level up notification
   */
  levelUp: async (userId: string, newLevel: number): Promise<void> => {
    const titles: Record<number, string> = {
      1: 'Principiante',
      2: 'Apprendista',
      3: 'Studente',
      4: 'Studioso',
      5: 'Esperto',
      6: 'Maestro',
      7: 'Gran Maestro',
      8: 'Saggio',
      9: 'Illuminato',
      10: 'Leggenda',
    };

    const title = titles[newLevel] || `Livello ${newLevel}`;

    await createNotification({
      userId,
      type: 'level_up',
      title: `Livello ${newLevel} raggiunto!`,
      message: `Sei diventato "${title}". Continua cosi per salire ancora!`,
      actionUrl: '/progressi',
      metadata: { level: newLevel, title },
    });
  },

  /**
   * Streak milestone notification
   */
  streakMilestone: async (userId: string, days: number): Promise<void> => {
    const milestones = [3, 7, 14, 30, 50, 100, 365];
    if (!milestones.includes(days)) return;

    const messages: Record<number, string> = {
      3: 'Ottimo inizio! Continua cosi!',
      7: 'Una settimana intera! Sei fantastico!',
      14: 'Due settimane di studio! Incredibile!',
      30: 'Un mese di impegno costante! Sei un campione!',
      50: 'Cinquanta giorni! Stai costruendo abitudini solide!',
      100: 'CENTO GIORNI! Sei una leggenda!',
      365: 'UN ANNO INTERO! Hai raggiunto la grandezza!',
    };

    await createNotification({
      userId,
      type: 'streak',
      title: `Streak: ${days} giorni!`,
      message: messages[days] || `${days} giorni consecutivi di studio!`,
      actionUrl: '/progressi',
      metadata: { days },
    });
  },

  /**
   * Achievement unlocked notification
   */
  achievement: async (
    userId: string,
    achievementId: string,
    name: string,
    description: string
  ): Promise<void> => {
    await createNotification({
      userId,
      type: 'achievement',
      title: `Obiettivo sbloccato: ${name}`,
      message: description,
      actionUrl: '/progressi',
      metadata: { achievementId },
    });
  },

  /**
   * Session completed notification
   */
  sessionComplete: async (
    userId: string,
    xpEarned: number,
    minutesStudied: number,
    maestroName?: string
  ): Promise<void> => {
    const message = maestroName
      ? `Hai guadagnato ${xpEarned} XP studiando con ${maestroName} per ${minutesStudied} minuti.`
      : `Hai guadagnato ${xpEarned} XP in ${minutesStudied} minuti di studio.`;

    await createNotification({
      userId,
      type: 'session_end',
      title: 'Sessione completata!',
      message,
      actionUrl: '/progressi',
      metadata: { xpEarned, minutesStudied, maestroName },
    });
  },

  /**
   * Study reminder notification
   */
  studyReminder: async (userId: string, subject?: string): Promise<void> => {
    const title = subject ? `E ora di studiare ${subject}!` : 'E ora di studiare!';

    await createNotification({
      userId,
      type: 'reminder',
      title,
      message: 'I tuoi Maestri ti aspettano. Anche solo 15 minuti fanno la differenza!',
      actionUrl: '/maestri',
      // Expire reminder after 24 hours
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  },

  /**
   * Streak at risk warning
   */
  streakAtRisk: async (userId: string, currentStreak: number): Promise<void> => {
    await createNotification({
      userId,
      type: 'streak',
      title: 'La tua streak e a rischio!',
      message: `Hai una streak di ${currentStreak} giorni. Studia oggi per non perderla!`,
      actionUrl: '/maestri',
      // Expire after today
      expiresAt: new Date(new Date().setHours(23, 59, 59, 999)),
      metadata: { currentStreak, atRisk: true },
    });
  },

  /**
   * Flashcard review reminder
   */
  flashcardReview: async (userId: string, cardsCount: number): Promise<void> => {
    await createNotification({
      userId,
      type: 'reminder',
      title: 'Flashcard da ripassare',
      message: `Hai ${cardsCount} carte pronte per il ripasso. Il momento perfetto per consolidare!`,
      actionUrl: '/strumenti/flashcards',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expire in 12 hours
      metadata: { cardsCount },
    });
  },

  /**
   * System notification
   */
  system: async (userId: string, title: string, message: string): Promise<void> => {
    await createNotification({
      userId,
      type: 'system',
      title,
      message,
    });
  },
};

export default serverNotifications;
