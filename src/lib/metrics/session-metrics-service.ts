/**
 * Session Metrics Service
 *
 * Tracks behavioral metrics per session for V1Plan FASE 2 observability:
 * - Session outcome (success/dropped/stuck_loop/abandoned)
 * - Turn count and latency
 * - Stuck loop detection
 * - Cost tracking
 * - Safety events
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Session outcome types from V1Plan
export type SessionOutcome =
  | "success"
  | "dropped"
  | "stuck_loop"
  | "abandoned"
  | "unknown";

// Incident severity from V1Plan FASE 2.0.7
export type IncidentSeverity = "S0" | "S1" | "S2" | "S3";

interface TurnData {
  latencyMs: number;
  intent?: string;
  tokensIn: number;
  tokensOut: number;
}

interface SessionState {
  sessionId: string;
  userId: string;
  turns: TurnData[];
  recentIntents: string[];
  startTime: number;
  lastActivityTime: number;
  refusalCount: number;
  refusalCorrect: number;
  incidentSeverity: IncidentSeverity | null;
  jailbreakAttempts: number;
  voiceMinutes: number;
}

// In-memory session tracking (cleared on session end)
const activeSessions = new Map<string, SessionState>();

// Thresholds from V1Plan
const STUCK_LOOP_THRESHOLD = 3; // Same intent 3+ times
const STUCK_LOOP_WINDOW = 5; // Within 5 turns
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const DROPPED_TURN_THRESHOLD = 2; // ≤2 turns = dropped

/**
 * Start tracking a new session
 */
export function startSession(sessionId: string, userId: string): void {
  activeSessions.set(sessionId, {
    sessionId,
    userId,
    turns: [],
    recentIntents: [],
    startTime: Date.now(),
    lastActivityTime: Date.now(),
    refusalCount: 0,
    refusalCorrect: 0,
    incidentSeverity: null,
    jailbreakAttempts: 0,
    voiceMinutes: 0,
  });

  logger.debug("Session metrics tracking started", { sessionId, userId });
}

/**
 * Record a turn in the session
 */
export function recordTurn(sessionId: string, turn: TurnData): void {
  const session = activeSessions.get(sessionId);
  if (!session) {
    logger.warn("Recording turn for unknown session", { sessionId });
    return;
  }

  session.turns.push(turn);
  session.lastActivityTime = Date.now();

  // Track recent intents for stuck loop detection
  if (turn.intent) {
    session.recentIntents.push(turn.intent);
    if (session.recentIntents.length > STUCK_LOOP_WINDOW) {
      session.recentIntents.shift();
    }
  }
}

/**
 * Record voice usage
 */
export function recordVoiceUsage(sessionId: string, minutes: number): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.voiceMinutes += minutes;
  }
}

/**
 * Record a refusal event
 */
export function recordRefusal(sessionId: string, wasCorrect: boolean): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.refusalCount++;
    if (wasCorrect) {
      session.refusalCorrect++;
    }
  }
}

/**
 * Record an incident
 */
export function recordIncident(
  sessionId: string,
  severity: IncidentSeverity,
): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  // Keep highest severity
  const severityRank = { S0: 0, S1: 1, S2: 2, S3: 3 };
  const current = session.incidentSeverity;
  if (!current || severityRank[severity] > severityRank[current]) {
    session.incidentSeverity = severity;
  }

  // S3 requires immediate logging
  if (severity === "S3") {
    logger.error("S3 incident detected", { sessionId, userId: session.userId });
  }
}

/**
 * Record a jailbreak attempt
 */
export function recordJailbreakAttempt(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.jailbreakAttempts++;
    logger.warn("Jailbreak attempt detected", { sessionId });
  }
}

/**
 * Detect stuck loop (same intent 3+ times in last 5 turns)
 */
function detectStuckLoop(intents: string[]): number {
  if (intents.length < STUCK_LOOP_THRESHOLD) return 0;

  const intentCounts = new Map<string, number>();
  for (const intent of intents) {
    intentCounts.set(intent, (intentCounts.get(intent) || 0) + 1);
  }

  let stuckCount = 0;
  for (const count of intentCounts.values()) {
    if (count >= STUCK_LOOP_THRESHOLD) {
      stuckCount++;
    }
  }
  return stuckCount;
}

/**
 * Determine session outcome
 */
function determineOutcome(session: SessionState): SessionOutcome {
  const turnCount = session.turns.length;
  const stuckLoops = detectStuckLoop(session.recentIntents);

  // Stuck loop takes priority
  if (stuckLoops > 0) {
    return "stuck_loop";
  }

  // Check for dropped (early abandonment)
  if (turnCount <= DROPPED_TURN_THRESHOLD) {
    return "dropped";
  }

  // Check for abandoned (inactivity)
  const inactiveMs = Date.now() - session.lastActivityTime;
  if (inactiveMs > INACTIVITY_TIMEOUT_MS) {
    return "abandoned";
  }

  // Default to success if none of the above
  return "success";
}

/**
 * Calculate cost from REAL token counts and voice minutes.
 *
 * PRICING SOURCE: docs/busplan/VoiceCostAnalysis-2026-01-02.md
 * - GPT-4o-mini: $0.15/1M input + $0.60/1M output ≈ €0.002/1K average
 * - gpt-realtime-mini: ~€0.04/min
 *
 * INPUT: Real data from Azure API (tokensIn/Out from response, voiceMinutes from session)
 */
function calculateCost(
  tokensIn: number,
  tokensOut: number,
  voiceMinutes: number,
): number {
  // €0.002 per 1K tokens (GPT-4o-mini average of input+output)
  const TOKEN_COST_EUR = 0.002 / 1000;
  // €0.04 per minute (gpt-realtime-mini)
  const VOICE_COST_EUR = 0.04;

  const textCost = (tokensIn + tokensOut) * TOKEN_COST_EUR;
  const voiceCost = voiceMinutes * VOICE_COST_EUR;

  return Math.round((textCost + voiceCost) * 1000) / 1000;
}

/**
 * End session and persist metrics
 */
export async function endSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    logger.warn("Ending unknown session", { sessionId });
    return;
  }

  // Calculate aggregates
  const turnCount = session.turns.length;
  const totalTokensIn = session.turns.reduce((sum, t) => sum + t.tokensIn, 0);
  const totalTokensOut = session.turns.reduce((sum, t) => sum + t.tokensOut, 0);
  const totalLatencyMs = session.turns.reduce((sum, t) => sum + t.latencyMs, 0);
  const avgLatencyMs =
    turnCount > 0 ? Math.round(totalLatencyMs / turnCount) : null;
  const stuckLoopCount = detectStuckLoop(session.recentIntents);
  const outcome = determineOutcome(session);
  const costEur = calculateCost(
    totalTokensIn,
    totalTokensOut,
    session.voiceMinutes,
  );

  try {
    await prisma.sessionMetrics.create({
      data: {
        sessionId,
        userId: session.userId,
        outcome,
        turnCount,
        avgTurnLatencyMs: avgLatencyMs,
        stuckLoopCount,
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut,
        voiceMinutes: session.voiceMinutes,
        costEur,
        refusalCount: session.refusalCount,
        refusalCorrect: session.refusalCorrect,
        incidentSeverity: session.incidentSeverity,
        jailbreakAttempts: session.jailbreakAttempts,
      },
    });

    logger.info("Session metrics saved", {
      sessionId,
      outcome,
      turnCount,
      costEur,
    });
  } catch (error) {
    logger.error(
      "Failed to save session metrics",
      { sessionId },
      error as Error,
    );
  } finally {
    activeSessions.delete(sessionId);
  }
}

/**
 * Get current session state (for debugging)
 */
export function getSessionState(sessionId: string): SessionState | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Check for abandoned sessions (call periodically)
 */
export async function cleanupAbandonedSessions(): Promise<number> {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivityTime > INACTIVITY_TIMEOUT_MS) {
      await endSession(sessionId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info("Cleaned up abandoned sessions", { count: cleanedCount });
  }

  return cleanedCount;
}
