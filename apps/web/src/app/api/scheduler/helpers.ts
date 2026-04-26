/**
 * Scheduler API helpers
 */

import { validateAuth } from "@/lib/auth/server";

/**
 * Get userId from validated authentication
 */
export async function getUserId(): Promise<string | null> {
  const auth = await validateAuth();
  return auth.authenticated && auth.userId ? auth.userId : null;
}

/**
 * Extract preferences data and merge with defaults
 */
export function extractPreferencesData(data: Record<string, unknown>) {
  return {
    enabledNotifications: data.enabledNotifications,
    quietHoursStart: data.quietHoursStart,
    quietHoursEnd: data.quietHoursEnd,
    minIntervalMinutes: data.minIntervalMinutes,
    streakWarningTime: data.streakWarningTime,
    ...data,
  };
}

/**
 * Extract and validate session creation data
 */
export function createScheduleSessionData(data: Record<string, unknown>) {
  return {
    dayOfWeek: Number(data.dayOfWeek),
    time: String(data.time),
    duration: Number(data.duration ?? 30),
    subject: String(data.subject),
    maestroId: data.maestroId ? String(data.maestroId) : undefined,
    topic: data.topic ? String(data.topic) : undefined,
    active: true,
    reminderOffset: Number(data.reminderOffset ?? 5),
    repeat: String(data.repeat ?? "weekly"),
  };
}

/**
 * Extract and validate reminder creation data
 */
export function createReminderData(data: Record<string, unknown>) {
  return {
    datetime: new Date(String(data.datetime)),
    message: String(data.message),
    subject: data.subject ? String(data.subject) : undefined,
    maestroId: data.maestroId ? String(data.maestroId) : undefined,
    repeat: String(data.repeat ?? "none"),
    active: true,
  };
}

/**
 * Extract session update data
 */
export function updateSessionData(data: Record<string, unknown>) {
  const updated: Record<string, unknown> = {};

  if (data.dayOfWeek !== undefined) updated.dayOfWeek = Number(data.dayOfWeek);
  if (data.time !== undefined) updated.time = String(data.time);
  if (data.duration !== undefined) updated.duration = Number(data.duration);
  if (data.subject !== undefined) updated.subject = String(data.subject);
  if (data.maestroId !== undefined)
    updated.maestroId = data.maestroId ? String(data.maestroId) : null;
  if (data.topic !== undefined)
    updated.topic = data.topic ? String(data.topic) : null;
  if (data.active !== undefined) updated.active = Boolean(data.active);
  if (data.reminderOffset !== undefined)
    updated.reminderOffset = Number(data.reminderOffset);
  if (data.repeat !== undefined) updated.repeat = String(data.repeat);

  return updated;
}

/**
 * Extract reminder update data
 */
export function updateReminderData(data: Record<string, unknown>) {
  const updated: Record<string, unknown> = {};

  if (data.datetime !== undefined)
    updated.datetime = new Date(String(data.datetime));
  if (data.message !== undefined) updated.message = String(data.message);
  if (data.subject !== undefined)
    updated.subject = data.subject ? String(data.subject) : null;
  if (data.maestroId !== undefined)
    updated.maestroId = data.maestroId ? String(data.maestroId) : null;
  if (data.repeat !== undefined) updated.repeat = String(data.repeat);
  if (data.active !== undefined) updated.active = Boolean(data.active);

  return updated;
}
