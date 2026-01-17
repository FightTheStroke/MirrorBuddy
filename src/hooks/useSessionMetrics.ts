/**
 * useSessionMetrics Hook
 *
 * React hook for tracking session metrics in chat components.
 * Wraps session-metrics-service for client-side usage.
 *
 * IMPORTANT: Token counts come from REAL API responses,
 * not estimates. See cost-tracking-service.ts for pricing sources.
 */

import { useCallback, useRef, useEffect } from "react";
import { getUserId } from "@/lib/hooks/use-saved-materials/utils/user-id";

interface TurnMetrics {
  latencyMs: number;
  intent?: string;
  tokensIn: number;
  tokensOut: number;
}

interface SessionMetricsState {
  turnCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  voiceMinutes: number;
  startTime: number | null;
}

/**
 * Hook for tracking session metrics.
 * Uses refs to avoid re-renders - metrics tracking is side-effect only.
 * Automatically starts/ends session on mount/unmount.
 */
export function useSessionMetrics(maestroId?: string) {
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const stateRef = useRef<SessionMetricsState>({
    turnCount: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    voiceMinutes: 0,
    startTime: null,
  });

  // Initialize session on mount (client-side only)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Get userId client-side
    const userId = getUserId();
    userIdRef.current = userId;

    const newSessionId = `${userId}-${maestroId || "chat"}-${Date.now()}`;
    sessionIdRef.current = newSessionId;

    stateRef.current = {
      turnCount: 0,
      totalTokensIn: 0,
      totalTokensOut: 0,
      voiceMinutes: 0,
      startTime: Date.now(),
    };

    // Start session on server
    fetch("/api/metrics/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        sessionId: newSessionId,
        userId,
      }),
    }).catch(() => {
      // Silent fail - metrics are non-critical
    });

    // End session on unmount
    return () => {
      if (sessionIdRef.current) {
        fetch("/api/metrics/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "end",
            sessionId: sessionIdRef.current,
          }),
        }).catch(() => {});
      }
    };
  }, [maestroId]);

  /**
   * Record a turn with REAL token counts from API response.
   * @param metrics - Turn metrics including REAL token counts
   */
  const recordTurn = useCallback((metrics: TurnMetrics) => {
    if (!sessionIdRef.current) return;

    stateRef.current.turnCount++;
    stateRef.current.totalTokensIn += metrics.tokensIn;
    stateRef.current.totalTokensOut += metrics.tokensOut;

    fetch("/api/metrics/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "turn",
        sessionId: sessionIdRef.current,
        turn: metrics,
      }),
    }).catch(() => {});
  }, []);

  /**
   * Record voice usage in minutes.
   * @param minutes - Voice session duration in minutes
   */
  const recordVoiceUsage = useCallback((minutes: number) => {
    if (!sessionIdRef.current) return;

    stateRef.current.voiceMinutes += minutes;

    fetch("/api/metrics/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "voice",
        sessionId: sessionIdRef.current,
        minutes,
      }),
    }).catch(() => {});
  }, []);

  /**
   * Record a refusal event.
   * @param wasCorrect - Whether the refusal was appropriate
   */
  const recordRefusal = useCallback((wasCorrect: boolean) => {
    if (!sessionIdRef.current) return;

    fetch("/api/metrics/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "refusal",
        sessionId: sessionIdRef.current,
        wasCorrect,
      }),
    }).catch(() => {});
  }, []);

  /**
   * Record a safety incident.
   * @param severity - S0 (info), S1 (warning), S2 (alert), S3 (critical)
   */
  const recordIncident = useCallback((severity: "S0" | "S1" | "S2" | "S3") => {
    if (!sessionIdRef.current) return;

    fetch("/api/metrics/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "incident",
        sessionId: sessionIdRef.current,
        severity,
      }),
    }).catch(() => {});
  }, []);

  /**
   * Get current session stats.
   * Call in event handlers, not during render.
   */
  const getStats = useCallback(() => {
    const state = stateRef.current;
    const durationMs = state.startTime ? Date.now() - state.startTime : 0;

    return {
      sessionId: sessionIdRef.current,
      turnCount: state.turnCount,
      totalTokensIn: state.totalTokensIn,
      totalTokensOut: state.totalTokensOut,
      voiceMinutes: state.voiceMinutes,
      durationMs,
    };
  }, []);

  /**
   * Get current session ID.
   * Returns null if session not yet initialized.
   */
  const getSessionId = useCallback(() => sessionIdRef.current, []);

  return {
    getSessionId,
    recordTurn,
    recordVoiceUsage,
    recordRefusal,
    recordIncident,
    getStats,
  };
}
