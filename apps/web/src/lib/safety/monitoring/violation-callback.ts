/**
 * Violation Callback Registry
 * Allows violation-tracker to emit events without importing logging
 * Breaking the circular dependency
 */

import type { SafetyEvent, SafetyEventType, EventSeverity } from './types';

type LogCallback = (
  type: SafetyEventType,
  severity: EventSeverity,
  options: Partial<Omit<SafetyEvent, 'id' | 'type' | 'severity' | 'timestamp'>>
) => void;

let registeredCallback: LogCallback | null = null;

/**
 * Register the logging callback (called from logging.ts)
 */
export function registerLogCallback(callback: LogCallback): void {
  registeredCallback = callback;
}

/**
 * Emit a log event (called from violation-tracker.ts)
 */
export function emitLogEvent(
  type: SafetyEventType,
  severity: EventSeverity,
  options: Partial<Omit<SafetyEvent, 'id' | 'type' | 'severity' | 'timestamp'>>
): void {
  if (registeredCallback) {
    registeredCallback(type, severity, options);
  }
}
