/**
 * Study Scheduler Service
 * Manages study notifications, schedules, and smart suggestions
 *
 * Key features:
 * - FSRS-based flashcard due reminders
 * - Streak protection warnings
 * - Scheduled study sessions
 * - Weekly study plans
 * - Smart suggestions based on performance
 *
 * Related: Issue #27
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  StudyNotification,
  NotificationType,
  NotificationPriority,
  NotificationAction,
  StudySchedule,
  ScheduledSession,
  CustomReminder,
  NotificationPreferences,
  FlashcardDueInfo,
  StudySuggestion,
  WeeklySummary,
  DayOfWeek,
  RepeatFrequency,
} from './types';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_SCHEDULER_CONFIG,
  MELISSA_VOICE_TEMPLATES,
} from './types';

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

/**
 * Create a new scheduled session
 */
export function createScheduledSession(params: {
  userId: string;
  dayOfWeek: DayOfWeek;
  time: string;
  subject: string;
  duration?: number;
  maestroId?: string;
  topic?: string;
  reminderOffset?: number;
  repeat?: RepeatFrequency;
}): ScheduledSession {
  return {
    id: uuidv4(),
    userId: params.userId,
    dayOfWeek: params.dayOfWeek,
    time: params.time,
    duration: params.duration ?? 30,
    subject: params.subject,
    maestroId: params.maestroId,
    topic: params.topic,
    active: true,
    reminderOffset: params.reminderOffset ?? DEFAULT_SCHEDULER_CONFIG.defaultReminderOffset,
    repeat: params.repeat ?? 'weekly',
  };
}

/**
 * Create a custom reminder
 */
export function createCustomReminder(params: {
  userId: string;
  datetime: Date;
  message: string;
  subject?: string;
  maestroId?: string;
  repeat?: RepeatFrequency;
}): CustomReminder {
  return {
    id: uuidv4(),
    userId: params.userId,
    datetime: params.datetime,
    message: params.message,
    subject: params.subject,
    maestroId: params.maestroId,
    repeat: params.repeat ?? 'none',
    active: true,
    createdAt: new Date(),
  };
}

/**
 * Create a new study schedule with defaults
 */
export function createStudySchedule(userId: string): StudySchedule {
  return {
    userId,
    weeklyPlan: [],
    customReminders: [],
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    updatedAt: new Date(),
  };
}

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

/**
 * Get the next occurrence of a scheduled session
 */
export function getNextSessionOccurrence(session: ScheduledSession): Date {
  const now = new Date();
  const [hours, minutes] = session.time.split(':').map(Number);

  // Find the next occurrence of this day of week
  const daysUntil = (session.dayOfWeek - now.getDay() + 7) % 7;
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + (daysUntil === 0 && now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes ? 7 : daysUntil));
  nextDate.setHours(hours, minutes, 0, 0);

  return nextDate;
}

/**
 * Calculate weekly summary
 */
export function calculateWeeklySummary(data: {
  studySessions: { duration: number; subject: string; xpEarned: number }[];
  flashcardsReviewed: number;
  currentStreak: number;
  scheduledSessions: number;
}): WeeklySummary {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const totalMinutes = data.studySessions.reduce((sum, s) => sum + s.duration, 0);
  const xpEarned = data.studySessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const subjects = [...new Set(data.studySessions.map((s) => s.subject))];

  // Find subject with most time spent
  const subjectTime: Record<string, number> = {};
  for (const session of data.studySessions) {
    subjectTime[session.subject] = (subjectTime[session.subject] ?? 0) + session.duration;
  }
  const topSubject = Object.entries(subjectTime).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    weekStart,
    totalMinutes,
    sessionsCompleted: data.studySessions.length,
    sessionsMissed: Math.max(0, data.scheduledSessions - data.studySessions.length),
    xpEarned,
    flashcardsReviewed: data.flashcardsReviewed,
    streak: data.currentStreak,
    subjects,
    topSubject,
  };
}

/**
 * Generate smart study suggestions
 */
export function generateSuggestions(data: {
  recentSubjects: string[];
  weakAreas: { subject: string; score: number }[];
  upcomingExams: { subject: string; date: Date }[];
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  currentStreak: number;
}): StudySuggestion[] {
  const suggestions: StudySuggestion[] = [];

  // Subject rotation suggestion
  const allSubjects = ['matematica', 'italiano', 'storia', 'scienze', 'inglese'];
  const unstudied = allSubjects.filter((s) => !data.recentSubjects.includes(s));
  if (unstudied.length > 0) {
    suggestions.push({
      type: 'subject_rotation',
      message: `Non studi ${unstudied[0]} da un po'. Vuoi fare un ripasso?`,
      reason: 'Variare le materie aiuta la memorizzazione',
      subject: unstudied[0],
      confidence: 0.7,
    });
  }

  // Weak area suggestion
  const weakestArea = data.weakAreas.sort((a, b) => a.score - b.score)[0];
  if (weakestArea && weakestArea.score < 0.7) {
    suggestions.push({
      type: 'weak_area',
      message: `Potresti migliorare in ${weakestArea.subject}. Un po' di pratica?`,
      reason: 'Basato sui risultati dei quiz recenti',
      subject: weakestArea.subject,
      confidence: 0.8,
    });
  }

  // Upcoming exam suggestion
  const soonestExam = data.upcomingExams.sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )[0];
  if (soonestExam) {
    const daysUntil = Math.ceil(
      (soonestExam.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 7) {
      suggestions.push({
        type: 'upcoming_exam',
        message: `La verifica di ${soonestExam.subject} è tra ${daysUntil} giorni. Ripassiamo?`,
        reason: 'Prepararsi in anticipo riduce lo stress',
        subject: soonestExam.subject,
        confidence: 0.9,
      });
    }
  }

  // Time-based suggestion
  if (data.timeOfDay === 'evening') {
    suggestions.push({
      type: 'time_based',
      message: 'È sera, perfetto per un ripasso leggero delle flashcard!',
      reason: 'La sera è ideale per consolidare la memoria',
      confidence: 0.6,
    });
  }

  // Streak suggestion
  if (data.currentStreak > 0 && data.currentStreak % 7 === 0) {
    suggestions.push({
      type: 'streak',
      message: `Wow, ${data.currentStreak} giorni di streak! Continua così!`,
      reason: 'Celebrare i traguardi aumenta la motivazione',
      confidence: 1.0,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Format time for display (Italian format)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date for display (Italian format)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Get day name in Italian
 */
export function getDayName(day: DayOfWeek): string {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[day];
}
