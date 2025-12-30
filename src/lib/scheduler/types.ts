/**
 * Study Scheduler Types
 * Smart Notifications & Proactive Learning Assistant
 *
 * Notifications are delivered by Melissa (docente di sostegno)
 * to maintain a consistent supportive voice.
 *
 * Related: Issue #27
 */

/**
 * Notification types for different study prompts
 */
export const NOTIFICATION_TYPES = [
  'flashcard_due',
  'streak_warning',
  'scheduled_session',
  'suggestion',
  'achievement',
  'weekly_summary',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Days of the week (0 = Sunday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Repeat frequency for reminders
 */
export type RepeatFrequency = 'daily' | 'weekly' | 'weekdays' | 'none';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'high' | 'medium' | 'low';

/**
 * A study notification from Melissa
 */
export interface StudyNotification {
  /** Unique notification ID */
  id: string;
  /** Type of notification */
  type: NotificationType;
  /** Notification message (in Italian) */
  message: string;
  /** Optional voice script for Melissa (may differ from text) */
  melissaVoice?: string;
  /** When to send the notification */
  scheduledFor: Date;
  /** Priority level */
  priority: NotificationPriority;
  /** Optional action button */
  action?: NotificationAction;
  /** Whether notification has been read */
  read: boolean;
  /** Whether notification has been dismissed */
  dismissed: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Related entity ID (flashcard deck, session, etc.) */
  relatedId?: string;
}

/**
 * Action that can be taken from a notification
 */
export interface NotificationAction {
  /** Button label */
  label: string;
  /** Route to navigate to */
  route: string;
  /** Optional query parameters */
  params?: Record<string, string>;
}

/**
 * A scheduled study session in the weekly plan
 */
export interface ScheduledSession {
  /** Unique session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Day of week (0-6, Sunday-Saturday) */
  dayOfWeek: DayOfWeek;
  /** Time in 24h format (e.g., "16:00") */
  time: string;
  /** Duration in minutes */
  duration: number;
  /** Subject to study */
  subject: string;
  /** Optional specific Maestro to study with */
  maestroId?: string;
  /** Optional topic/chapter */
  topic?: string;
  /** Whether this session is active */
  active: boolean;
  /** Reminder offset in minutes (how early to notify) */
  reminderOffset: number;
  /** Repeat frequency */
  repeat: RepeatFrequency;
}

/**
 * Custom reminder set by student
 */
export interface CustomReminder {
  /** Unique reminder ID */
  id: string;
  /** User ID */
  userId: string;
  /** Reminder date and time */
  datetime: Date;
  /** Message to display */
  message: string;
  /** Repeat frequency */
  repeat: RepeatFrequency;
  /** Optional subject */
  subject?: string;
  /** Optional Maestro */
  maestroId?: string;
  /** Whether reminder is active */
  active: boolean;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * User's complete study schedule
 */
export interface StudySchedule {
  /** User ID */
  userId: string;
  /** Weekly scheduled sessions */
  weeklyPlan: ScheduledSession[];
  /** Custom one-time or recurring reminders */
  customReminders: CustomReminder[];
  /** Notification preferences */
  preferences: NotificationPreferences;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Notification delivery preferences
 */
export interface NotificationPreferences {
  /** Enable/disable all notifications */
  enabled: boolean;
  /** Enable push notifications (PWA) */
  pushEnabled: boolean;
  /** Enable in-app notifications */
  inAppEnabled: boolean;
  /** Enable voice notifications (Melissa speaks) */
  voiceEnabled: boolean;
  /** Quiet hours start (e.g., "22:00") */
  quietHoursStart?: string;
  /** Quiet hours end (e.g., "07:00") */
  quietHoursEnd?: string;
  /** Days to skip notifications (e.g., during school) */
  skipDays?: DayOfWeek[];
  /** Minimum minutes between notifications */
  minIntervalMinutes: number;
  /** Streak warning time (e.g., "21:00" for 9 PM warning) */
  streakWarningTime: string;
}

/**
 * FSRS flashcard due info for notifications
 */
export interface FlashcardDueInfo {
  /** Number of cards due */
  dueCount: number;
  /** Deck ID if specific deck */
  deckId?: string;
  /** Deck name */
  deckName?: string;
  /** Subject */
  subject?: string;
  /** Next optimal review time */
  nextReviewTime: Date;
  /** Average difficulty of due cards */
  avgDifficulty: number;
}

/**
 * Smart suggestion from the scheduler
 */
export interface StudySuggestion {
  /** Suggestion type */
  type: 'subject_rotation' | 'weak_area' | 'upcoming_exam' | 'time_based' | 'streak';
  /** Suggestion message */
  message: string;
  /** Reasoning for this suggestion */
  reason: string;
  /** Suggested Maestro */
  maestroId?: string;
  /** Suggested subject */
  subject?: string;
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * Weekly summary data
 */
export interface WeeklySummary {
  /** Week start date */
  weekStart: Date;
  /** Total study time in minutes */
  totalMinutes: number;
  /** Sessions completed */
  sessionsCompleted: number;
  /** Sessions planned but missed */
  sessionsMissed: number;
  /** XP earned */
  xpEarned: number;
  /** Flashcards reviewed */
  flashcardsReviewed: number;
  /** Current streak */
  streak: number;
  /** Subjects studied */
  subjects: string[];
  /** Top performing subject */
  topSubject?: string;
  /** Area needing more attention */
  weakArea?: string;
}

/**
 * Scheduler service configuration
 */
export interface SchedulerConfig {
  /** How often to check for due notifications (ms) */
  checkInterval: number;
  /** Default reminder offset before scheduled session (minutes) */
  defaultReminderOffset: number;
  /** Maximum notifications per day */
  maxNotificationsPerDay: number;
  /** Default streak warning time */
  defaultStreakWarningTime: string;
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  checkInterval: 60000, // 1 minute
  defaultReminderOffset: 5, // 5 minutes before
  maxNotificationsPerDay: 10,
  defaultStreakWarningTime: '21:00',
};

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  pushEnabled: false, // Requires user permission
  inAppEnabled: true,
  voiceEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  minIntervalMinutes: 30,
  streakWarningTime: '21:00',
};

/**
 * Melissa's notification voice templates
 * These are templates that get populated with actual data
 */
export const MELISSA_VOICE_TEMPLATES: Record<NotificationType, string[]> = {
  flashcard_due: [
    'Ehi! Hai {count} flashcard pronte per il ripasso. Il momento perfetto è adesso!',
    'Ci sono {count} carte che ti aspettano. Un ripasso veloce?',
    'Le tue flashcard chiamano! {count} carte da ripassare.',
  ],
  streak_warning: [
    'La tua streak di {days} giorni sta per finire! Anche solo 5 minuti contano.',
    'Non perdere la tua serie! {days} giorni di studio consecutivi.',
    'Ehi campione! La tua streak è a rischio. Un veloce ripasso?',
  ],
  scheduled_session: [
    'Tra {minutes} minuti è ora di studiare {subject}. Sei pronto?',
    'Il tuo appuntamento con {subject} sta per iniziare!',
    'È quasi ora di {subject}! Prepara il materiale.',
  ],
  suggestion: [
    'Ho un suggerimento per te: che ne dici di ripassare {subject}?',
    'Basandomi sui tuoi progressi, ti consiglio di provare {subject}.',
    'Un piccolo consiglio: potresti dare una rinfrescata a {subject}.',
  ],
  achievement: [
    'Fantastico! Hai sbloccato un nuovo traguardo: {achievement}!',
    'Complimenti! Nuovo achievement: {achievement}!',
    'Wow! {achievement} sbloccato! Continua così!',
  ],
  weekly_summary: [
    'Questa settimana hai studiato {minutes} minuti. Ottimo lavoro!',
    'Riepilogo settimanale: {sessions} sessioni completate!',
    'Hai fatto {minutes} minuti di studio questa settimana. Bravo!',
  ],
};
