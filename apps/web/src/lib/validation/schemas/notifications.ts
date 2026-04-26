// ============================================================================
// VALIDATION SCHEMA: Notifications API
// ============================================================================

import { z } from 'zod';
import {
  NonEmptyString,
  OptionalString,
  PositiveInt,
  IsoDateString,
  MaestroId,
  VALIDATION_LIMITS,
  createArraySchema,
} from '../common';

// ============================================================================
// Notification type schemas
// ============================================================================

/**
 * Notification type enum
 */
export const NotificationType = z.enum([
  'achievement',
  'streak',
  'reminder',
  'break',
  'session_end',
  'level_up',
  'calendar',
  'system',
  'flashcard_due',
  'scheduled_session',
  'suggestion',
  'streak_warning',
  'weekly_summary',
]);

/**
 * Notification priority enum
 */
export const NotificationPriority = z.enum(['high', 'medium', 'low']);

// ============================================================================
// GET /api/notifications query parameters
// ============================================================================

/**
 * GET /api/notifications query parameters schema
 */
export const GetNotificationsQuerySchema = z.object({
  userId: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  unreadOnly: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
}).strict();

// ============================================================================
// POST /api/notifications request body
// ============================================================================

/**
 * POST /api/notifications request body schema
 */
export const CreateNotificationSchema = z.object({
  userId: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  type: NotificationType,
  title: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  message: NonEmptyString(VALIDATION_LIMITS.LONG_STRING_MAX),
  actionUrl: OptionalString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  metadata: z.record(z.string(), z.unknown()).optional(),
  scheduledFor: IsoDateString.optional(),
  expiresAt: IsoDateString.optional(),
  priority: NotificationPriority.optional(),
  relatedId: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  melissaVoice: OptionalString(VALIDATION_LIMITS.LONG_STRING_MAX),
}).strict();

// ============================================================================
// PATCH /api/notifications request body
// ============================================================================

/**
 * PATCH /api/notifications request body schema
 */
export const UpdateNotificationsSchema = z.object({
  userId: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  notificationIds: createArraySchema(
    NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
    { max: VALIDATION_LIMITS.SMALL_ARRAY_MAX }
  ).optional(),
  markAllRead: z.boolean().optional(),
}).strict().refine(
  (data) => data.markAllRead === true || (data.notificationIds && data.notificationIds.length > 0),
  {
    message: 'Either markAllRead must be true or notificationIds must be provided',
  }
);

// ============================================================================
// DELETE /api/notifications query parameters
// ============================================================================

/**
 * DELETE /api/notifications query parameters schema
 */
export const DeleteNotificationsQuerySchema = z.object({
  userId: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  id: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  dismissAll: z.enum(['true', 'false']).optional(),
}).strict();

// ============================================================================
// Scheduler schemas
// ============================================================================

/**
 * Day of week (0-6, Sunday-Saturday)
 */
export const DayOfWeek = z.number().int().min(0).max(6);

/**
 * Time string in HH:MM format
 */
export const TimeString = z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);

/**
 * Repeat frequency enum
 */
export const RepeatFrequency = z.enum(['daily', 'weekly', 'weekdays', 'none']);

/**
 * Notification preferences schema
 */
export const NotificationPreferencesSchema = z.object({
  enabled: z.boolean(),
  pushEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  voiceEnabled: z.boolean(),
  quietHoursStart: TimeString.optional(),
  quietHoursEnd: TimeString.optional(),
  skipDays: z.array(DayOfWeek).max(7).optional(),
  minIntervalMinutes: PositiveInt,
  streakWarningTime: TimeString,
}).strict();

// ============================================================================
// POST /api/scheduler - Create session
// ============================================================================

/**
 * Create scheduled session schema
 */
export const CreateScheduledSessionSchema = z.object({
  type: z.literal('session'),
  dayOfWeek: DayOfWeek,
  time: TimeString,
  duration: PositiveInt.optional(),
  subject: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  maestroId: MaestroId.optional(),
  topic: OptionalString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  reminderOffset: PositiveInt.optional(),
  repeat: RepeatFrequency.optional(),
}).strict();

// ============================================================================
// POST /api/scheduler - Create reminder
// ============================================================================

/**
 * Create custom reminder schema
 */
export const CreateCustomReminderSchema = z.object({
  type: z.literal('reminder'),
  datetime: IsoDateString,
  message: NonEmptyString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  subject: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  maestroId: MaestroId.optional(),
  repeat: RepeatFrequency.optional(),
}).strict();

// ============================================================================
// POST /api/scheduler - Union schema
// ============================================================================

/**
 * POST /api/scheduler request body schema (union)
 */
export const CreateScheduleItemSchema = z.discriminatedUnion('type', [
  CreateScheduledSessionSchema,
  CreateCustomReminderSchema,
]);

// ============================================================================
// PATCH /api/scheduler - Update preferences
// ============================================================================

/**
 * Update notification preferences schema
 */
export const UpdatePreferencesSchema = z.object({
  type: z.literal('preferences'),
}).merge(NotificationPreferencesSchema.partial()).strict();

// ============================================================================
// PATCH /api/scheduler - Update session
// ============================================================================

/**
 * Update scheduled session schema
 */
export const UpdateScheduledSessionSchema = z.object({
  type: z.literal('session'),
  id: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  dayOfWeek: DayOfWeek.optional(),
  time: TimeString.optional(),
  duration: PositiveInt.optional(),
  subject: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  maestroId: MaestroId.optional(),
  topic: OptionalString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  active: z.boolean().optional(),
  reminderOffset: PositiveInt.optional(),
  repeat: RepeatFrequency.optional(),
}).strict();

// ============================================================================
// PATCH /api/scheduler - Update reminder
// ============================================================================

/**
 * Update custom reminder schema
 */
export const UpdateCustomReminderSchema = z.object({
  type: z.literal('reminder'),
  id: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  datetime: IsoDateString.optional(),
  message: OptionalString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  subject: OptionalString(VALIDATION_LIMITS.SHORT_STRING_MAX),
  maestroId: MaestroId.optional(),
  repeat: RepeatFrequency.optional(),
  active: z.boolean().optional(),
}).strict();

// ============================================================================
// PATCH /api/scheduler - Union schema
// ============================================================================

/**
 * PATCH /api/scheduler request body schema (union)
 */
export const UpdateScheduleItemSchema = z.discriminatedUnion('type', [
  UpdatePreferencesSchema,
  UpdateScheduledSessionSchema,
  UpdateCustomReminderSchema,
]);

// ============================================================================
// DELETE /api/scheduler - Delete schema
// ============================================================================

/**
 * DELETE /api/scheduler request body schema
 */
export const DeleteScheduleItemSchema = z.object({
  type: z.enum(['session', 'reminder']),
  id: NonEmptyString(VALIDATION_LIMITS.SHORT_STRING_MAX),
}).strict();

// Export types
export type NotificationType = z.infer<typeof NotificationType>;
export type NotificationPriority = z.infer<typeof NotificationPriority>;
export type GetNotificationsQuery = z.infer<typeof GetNotificationsQuerySchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationsInput = z.infer<typeof UpdateNotificationsSchema>;
export type DeleteNotificationsQuery = z.infer<typeof DeleteNotificationsQuerySchema>;
export type DayOfWeek = z.infer<typeof DayOfWeek>;
export type TimeString = z.infer<typeof TimeString>;
export type RepeatFrequency = z.infer<typeof RepeatFrequency>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type CreateScheduledSessionInput = z.infer<typeof CreateScheduledSessionSchema>;
export type CreateCustomReminderInput = z.infer<typeof CreateCustomReminderSchema>;
export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
export type UpdateScheduledSessionInput = z.infer<typeof UpdateScheduledSessionSchema>;
export type UpdateCustomReminderInput = z.infer<typeof UpdateCustomReminderSchema>;
export type UpdateScheduleItemInput = z.infer<typeof UpdateScheduleItemSchema>;
export type DeleteScheduleItemInput = z.infer<typeof DeleteScheduleItemSchema>;
