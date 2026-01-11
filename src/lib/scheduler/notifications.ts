/**
 * Notification Creators
 * Functions that create different types of study notifications
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  StudyNotification,
  NotificationType,
  NotificationPriority,
  NotificationAction,
  ScheduledSession,
  FlashcardDueInfo,
  StudySuggestion,
} from './types';
import { MELISSA_VOICE_TEMPLATES } from './types';

/**
 * Create a new notification
 */
export function createNotification(params: {
  type: NotificationType;
  message: string;
  scheduledFor: Date;
  priority?: NotificationPriority;
  action?: NotificationAction;
  melissaVoice?: string;
  relatedId?: string;
}): StudyNotification {
  return {
    id: uuidv4(),
    type: params.type,
    message: params.message,
    melissaVoice: params.melissaVoice,
    scheduledFor: params.scheduledFor,
    priority: params.priority ?? 'medium',
    action: params.action,
    read: false,
    dismissed: false,
    createdAt: new Date(),
    relatedId: params.relatedId,
  };
}

/**
 * Generate a flashcard due notification
 */
export function createFlashcardDueNotification(info: FlashcardDueInfo): StudyNotification {
  const templates = MELISSA_VOICE_TEMPLATES.flashcard_due;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const melissaVoice = template.replace('{count}', String(info.dueCount));

  const message = `${info.dueCount} flashcard da ripassare${info.deckName ? ` in ${info.deckName}` : ''}`;

  return createNotification({
    type: 'flashcard_due',
    message,
    melissaVoice,
    scheduledFor: info.nextReviewTime,
    priority: info.dueCount > 10 ? 'high' : 'medium',
    action: {
      label: 'Ripassa ora',
      route: '/flashcards',
      params: info.deckId ? { deck: info.deckId } : undefined,
    },
    relatedId: info.deckId,
  });
}

/**
 * Generate a streak warning notification
 */
export function createStreakWarningNotification(
  currentStreak: number,
  warningTime: Date
): StudyNotification {
  const templates = MELISSA_VOICE_TEMPLATES.streak_warning;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const melissaVoice = template.replace('{days}', String(currentStreak));

  return createNotification({
    type: 'streak_warning',
    message: `La tua streak di ${currentStreak} giorni sta per finire!`,
    melissaVoice,
    scheduledFor: warningTime,
    priority: currentStreak > 7 ? 'high' : 'medium',
    action: {
      label: 'Studia 5 minuti',
      route: '/study',
    },
  });
}

/**
 * Generate a scheduled session notification
 */
export function createSessionReminderNotification(
  session: ScheduledSession,
  sessionDateTime: Date,
  minutesBefore: number
): StudyNotification {
  const templates = MELISSA_VOICE_TEMPLATES.scheduled_session;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const melissaVoice = template
    .replace('{minutes}', String(minutesBefore))
    .replace('{subject}', session.subject);

  const reminderTime = new Date(sessionDateTime.getTime() - minutesBefore * 60000);

  return createNotification({
    type: 'scheduled_session',
    message: `${session.subject} tra ${minutesBefore} minuti`,
    melissaVoice,
    scheduledFor: reminderTime,
    priority: 'medium',
    action: {
      label: 'Inizia sessione',
      route: '/study',
      params: {
        subject: session.subject,
        ...(session.maestroId && { maestro: session.maestroId }),
      },
    },
    relatedId: session.id,
  });
}

/**
 * Generate a suggestion notification
 */
export function createSuggestionNotification(suggestion: StudySuggestion): StudyNotification {
  const templates = MELISSA_VOICE_TEMPLATES.suggestion;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const melissaVoice = template.replace('{subject}', suggestion.subject ?? 'questo argomento');

  return createNotification({
    type: 'suggestion',
    message: suggestion.message,
    melissaVoice,
    scheduledFor: new Date(),
    priority: 'low',
    action: suggestion.maestroId
      ? {
          label: 'Prova ora',
          route: '/chat',
          params: { maestro: suggestion.maestroId },
        }
      : undefined,
  });
}
