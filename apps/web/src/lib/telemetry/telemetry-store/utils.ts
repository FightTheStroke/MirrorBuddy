// ============================================================================
// TELEMETRY STORE UTILS
// Pure utility functions with no store dependencies
// Extracted to break circular dependency
// ============================================================================

import { nanoid } from 'nanoid';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${nanoid(7)}`;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date | string | null, date2: Date): boolean {
  if (!date1) return false;
  // Handle string dates from JSON serialization
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  if (isNaN(d1.getTime())) return false;
  return (
    d1.getFullYear() === date2.getFullYear() &&
    d1.getMonth() === date2.getMonth() &&
    d1.getDate() === date2.getDate()
  );
}
