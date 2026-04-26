/**
 * Notification Type Definitions
 * Core notification types and interfaces
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

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface NotificationAction {
  label: string;
  route: string;
  params?: Record<string, string>;
}

export interface StudyNotification {
  id: string;
  type: NotificationType;
  message: string;
  melissaVoice?: string;
  scheduledFor: Date;
  priority: NotificationPriority;
  action?: NotificationAction;
  read: boolean;
  dismissed: boolean;
  createdAt: Date;
  relatedId?: string;
}

export interface FlashcardDueInfo {
  dueCount: number;
  deckId?: string;
  deckName?: string;
  subject?: string;
  nextReviewTime: Date;
  avgDifficulty: number;
}

export interface StudySuggestion {
  type: 'subject_rotation' | 'weak_area' | 'upcoming_exam' | 'time_based' | 'streak';
  message: string;
  reason: string;
  maestroId?: string;
  subject?: string;
  confidence: number;
}
