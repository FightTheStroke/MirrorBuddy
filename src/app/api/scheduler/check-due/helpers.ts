/**
 * Scheduler check-due helpers
 */

import { validateAuth } from "@/lib/auth/server";
import {
  MELISSA_VOICE_TEMPLATES,
  type NotificationPreferences,
} from "@/lib/scheduler/types";

/**
 * Get userId from validated authentication
 */
export async function getUserId(): Promise<string | null> {
  const auth = await validateAuth();
  return auth.authenticated && auth.userId ? auth.userId : null;
}

/**
 * Parse time string (e.g., "16:00") to hours and minutes
 */
export function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes;

  const start = parseTime(prefs.quietHoursStart);
  const end = parseTime(prefs.quietHoursEnd);
  const startTime = start.hours * 60 + start.minutes;
  const endTime = end.hours * 60 + end.minutes;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Get a random Melissa voice template
 */
export function getMelissaVoice(
  type: keyof typeof MELISSA_VOICE_TEMPLATES,
  data: Record<string, unknown>,
): string {
  const templates = MELISSA_VOICE_TEMPLATES[type];
  const template = templates[Math.floor(Math.random() * templates.length)];

  return template.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? ""));
}
