/**
 * Human Escalation Service
 * F-06 - AI Act Article 14: Escalate critical safety events to human admins
 *
 * Monitors for crisis/safety events and triggers admin notification pathway.
 */

import { logger } from "@/lib/logger";
import { notifyAdmin } from "./admin-notifier";
import {
  trackJailbreakAttempt,
  clearSessionTracking,
  getJailbreakAttemptCount,
  setJailbreakThreshold,
} from "./escalation-tracker";
import type {
  EscalationEvent,
  EscalationTrigger,
  EscalationMetadata,
  EscalationConfig,
} from "./types";
import { DEFAULT_ESCALATION_CONFIG } from "./types";

/**
 * Lazy import for DB storage (server-only)
 */
async function storeEscalationEvent(
  event: EscalationEvent,
  storeInDb: boolean,
): Promise<void> {
  if (typeof window !== "undefined" || !storeInDb) {
    return;
  }
  const { storeEscalationEvent: store } = await import("./db-storage");
  return store(event, storeInDb);
}

const log = logger.child({ module: "escalation-service" });

/**
 * In-memory buffer of escalation events
 */
const escalationBuffer: EscalationEvent[] = [];

/**
 * Active escalation configuration
 */
let escalationConfig = { ...DEFAULT_ESCALATION_CONFIG };

/**
 * Initialize escalation service with custom config
 */
export function initializeEscalationService(
  config: Partial<EscalationConfig> = {},
): void {
  escalationConfig = { ...DEFAULT_ESCALATION_CONFIG, ...config };
  setJailbreakThreshold(escalationConfig.jailbreakThreshold);
  log.info("Escalation service initialized", {
    threshold: escalationConfig.jailbreakThreshold,
    autoNotify: escalationConfig.autoNotifyAdmin,
  });
}

/**
 * Generate unique escalation event ID
 */
function generateEscalationId(): string {
  return `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Anonymize user ID
 */
function anonymizeUserId(userId: string): string {
  return userId && userId.length >= 8 ? userId.substring(0, 8) : "";
}

/**
 * Hash session ID for audit trail
 */
function hashSessionId(sessionId: string): string {
  return sessionId ? `hash_${sessionId.substring(0, 12)}` : "";
}

/**
 * Sanitize content snippet to remove PII
 * Redacts: email addresses, phone numbers, names patterns
 */
function sanitizeContentSnippet(
  content: string | undefined,
  maxLength = 200,
): string | undefined {
  if (!content) return undefined;

  // Redact email addresses
  let sanitized = content.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
    "[EMAIL_REDACTED]",
  );

  // Redact phone numbers (various formats)
  sanitized = sanitized.replace(
    /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    "[PHONE_REDACTED]",
  );

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + "...";
  }

  return sanitized;
}

/**
 * Create an escalation event
 */
function createEscalationEvent(
  trigger: EscalationTrigger,
  options: {
    userId?: string;
    sessionId?: string;
    maestroId?: string;
    metadata?: Partial<EscalationMetadata>;
  } = {},
): EscalationEvent {
  const event: EscalationEvent = {
    id: generateEscalationId(),
    trigger,
    severity: trigger === "crisis_detected" ? "critical" : "high",
    timestamp: new Date(),
    anonymizedUserId: options.userId
      ? anonymizeUserId(options.userId)
      : undefined,
    sessionHash: options.sessionId
      ? hashSessionId(options.sessionId)
      : undefined,
    maestroId: options.maestroId,
    metadata: options.metadata || {},
    adminNotified: false,
    resolved: false,
  };
  return event;
}

/**
 * Handle crisis detection escalation
 */
export async function escalateCrisisDetected(
  userId?: string,
  sessionId?: string,
  options: { contentSnippet?: string; maestroId?: string } = {},
): Promise<EscalationEvent> {
  const event = createEscalationEvent("crisis_detected", {
    userId,
    sessionId,
    maestroId: options.maestroId,
    metadata: {
      reason: "Crisis keywords detected (self-harm, suicide ideation)",
      contextType: "user_input",
      contentSnippet: sanitizeContentSnippet(options.contentSnippet),
      confidence: 1.0,
    },
  });

  escalationBuffer.push(event);
  if (escalationConfig.autoNotifyAdmin) {
    await notifyAdmin(event, escalationConfig.adminEmail);
  }
  await storeEscalationEvent(event, escalationConfig.storeInDatabase);

  log.warn("CRISIS ESCALATION", { eventId: event.id });
  return event;
}

/**
 * Handle repeated jailbreak attempts escalation
 */
export async function escalateRepeatedJailbreak(
  attemptCount: number,
  userId?: string,
  sessionId?: string,
  options: { contentSnippet?: string; maestroId?: string } = {},
): Promise<EscalationEvent> {
  const event = createEscalationEvent("repeated_jailbreak", {
    userId,
    sessionId,
    maestroId: options.maestroId,
    metadata: {
      reason: `${attemptCount} jailbreak attempts (threshold: ${escalationConfig.jailbreakThreshold})`,
      contextType: "user_input",
      contentSnippet: sanitizeContentSnippet(options.contentSnippet),
      jailbreakAttemptCount: attemptCount,
    },
  });

  escalationBuffer.push(event);
  if (escalationConfig.autoNotifyAdmin) {
    await notifyAdmin(event, escalationConfig.adminEmail);
  }
  await storeEscalationEvent(event, escalationConfig.storeInDatabase);

  log.warn("JAILBREAK ESCALATION", { eventId: event.id, attemptCount });
  return event;
}

/**
 * Handle severe content filter violation escalation
 */
export async function escalateSevereContentFilter(
  filterCategory: string,
  userId?: string,
  sessionId?: string,
  options: {
    contentSnippet?: string;
    confidence?: number;
    maestroId?: string;
  } = {},
): Promise<EscalationEvent> {
  const event = createEscalationEvent("severe_content_filter", {
    userId,
    sessionId,
    maestroId: options.maestroId,
    metadata: {
      reason: `Critical filter violation: ${filterCategory}`,
      contextType: "user_input",
      contentSnippet: sanitizeContentSnippet(options.contentSnippet),
      confidence: options.confidence || 0.95,
    },
  });

  escalationBuffer.push(event);
  if (escalationConfig.autoNotifyAdmin) {
    await notifyAdmin(event, escalationConfig.adminEmail);
  }
  await storeEscalationEvent(event, escalationConfig.storeInDatabase);

  log.warn("CONTENT FILTER ESCALATION", {
    eventId: event.id,
    category: filterCategory,
  });
  return event;
}

/**
 * Mark escalation event as resolved by admin
 */
export async function resolveEscalation(
  eventId: string,
  adminNotes?: string,
): Promise<void> {
  const event = escalationBuffer.find((e) => e.id === eventId);
  if (event) {
    event.resolved = true;
    event.resolvedAt = new Date();
    event.adminNotes = adminNotes;
    log.info("Escalation resolved", { eventId });
  }
}

/**
 * Clear session tracking on session end
 */
export function clearSessionEscalations(sessionId: string): void {
  clearSessionTracking(sessionId);
}

/**
 * Get escalation configuration
 */
export function getEscalationConfig(): EscalationConfig {
  return { ...escalationConfig };
}

/**
 * Get recent escalation events
 */
export function getRecentEscalations(limitMinutes = 60): EscalationEvent[] {
  const cutoff = new Date(Date.now() - limitMinutes * 60000);
  return escalationBuffer.filter((e) => e.timestamp >= cutoff);
}

/**
 * Get unresolved escalations
 */
export function getUnresolvedEscalations(): EscalationEvent[] {
  return escalationBuffer.filter((e) => !e.resolved);
}

/**
 * Clear all escalation buffer (for testing only)
 */
export function clearEscalationBuffer(): void {
  escalationBuffer.length = 0;
}

/**
 * Check if jailbreak escalation needed
 * Re-exported from tracker for convenience
 */
export { trackJailbreakAttempt, getJailbreakAttemptCount };
