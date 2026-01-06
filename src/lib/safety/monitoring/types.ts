export type SafetyEventType =
  | 'input_blocked'
  | 'input_warned'
  | 'output_sanitized'
  | 'jailbreak_attempt'
  | 'crisis_detected'
  | 'age_gate_triggered'
  | 'pii_detected'
  | 'profanity_detected'
  | 'handoff_to_adult'
  | 'session_terminated'
  | 'repeated_violation';

export type EventSeverity = 'info' | 'warning' | 'alert' | 'critical';

export interface SafetyEvent {
  id: string;
  type: SafetyEventType;
  severity: EventSeverity;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  characterId?: string;
  category?: string;
  context?: Record<string, unknown>;
  autoHandled: boolean;
  response?: string;
}

export interface SafetyMetrics {
  periodStart: Date;
  periodEnd: Date;
  totalEvents: number;
  byType: Record<SafetyEventType, number>;
  bySeverity: Record<EventSeverity, number>;
  uniqueUsers: number;
  terminatedSessions: number;
  crisisCount: number;
}

