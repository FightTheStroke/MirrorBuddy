import { useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { subscribeToAnalyticsConsent } from '@/lib/consent/unified-consent-storage';
import {
  hasAnalyticsConsent,
  getAnalyticsGeneration,
  sendOptionalAnalytics,
} from '@/lib/telemetry/optional-analytics-client';

interface TurnMetrics {
  latencyMs: number;
  intent?: string;
  tokensIn: number;
  tokensOut: number;
}

const emptyStats = () => ({
  turnCount: 0,
  totalTokensIn: 0,
  totalTokensOut: 0,
  voiceMinutes: 0,
  startTime: null as number | null,
});

/** Optional behavioral counters only; quota and safety enforcement remain server-side. */
export function useSessionMetrics(maestroId?: string) {
  const sessionIdRef = useRef<string | null>(null);
  const stateRef = useRef(emptyStats());
  const startedRef = useRef<Promise<boolean> | null>(null);
  const send = useCallback((body: Record<string, unknown>) => {
    const sessionId = sessionIdRef.current;
    const generation = getAnalyticsGeneration();
    if (!hasAnalyticsConsent() || !sessionId) return;
    void startedRef.current
      ?.then(async (started) => {
        if (!started || generation !== getAnalyticsGeneration() || !hasAnalyticsConsent()) return;
        await sendOptionalAnalytics('/api/metrics/sessions', { ...body, sessionId });
      })
      .catch((error: unknown) => {
        logger.warn('Optional session metric failed', { error: String(error) });
      });
  }, []);

  useEffect(() => {
    const synchronize = (allowed = hasAnalyticsConsent()) => {
      if (!allowed || !hasAnalyticsConsent()) {
        sessionIdRef.current = null;
        stateRef.current = emptyStats();
        startedRef.current = null;
        return;
      }
      if (sessionIdRef.current) return;
      sessionIdRef.current = crypto.randomUUID();
      stateRef.current.startTime = Date.now();
      startedRef.current = sendOptionalAnalytics('/api/metrics/sessions', {
        action: 'start',
        sessionId: sessionIdRef.current,
      }).catch((error: unknown) => {
        logger.warn('Optional metrics session failed to start', { error: String(error) });
        return false;
      });
    };
    const unsubscribe = subscribeToAnalyticsConsent(synchronize);
    synchronize();
    return () => {
      send({ action: 'end' });
      unsubscribe();
      sessionIdRef.current = null;
      stateRef.current = emptyStats();
      startedRef.current = null;
    };
  }, [maestroId, send]);

  const recordTurn = useCallback(
    (metrics: TurnMetrics) => {
      if (!hasAnalyticsConsent() || !sessionIdRef.current) return;
      stateRef.current.turnCount++;
      stateRef.current.totalTokensIn += metrics.tokensIn;
      stateRef.current.totalTokensOut += metrics.tokensOut;
      send({ action: 'turn', turn: metrics });
    },
    [send],
  );
  const recordVoiceUsage = useCallback(
    (minutes: number) => {
      if (!hasAnalyticsConsent() || !sessionIdRef.current) return;
      stateRef.current.voiceMinutes += minutes;
      send({ action: 'voice', minutes });
    },
    [send],
  );
  const recordRefusal = useCallback(
    (wasCorrect: boolean) => {
      send({ action: 'refusal', wasCorrect });
    },
    [send],
  );
  const recordIncident = useCallback(
    (severity: 'S0' | 'S1' | 'S2' | 'S3') => {
      send({ action: 'incident', severity });
    },
    [send],
  );
  const getStats = useCallback(() => {
    const state = stateRef.current;
    return {
      sessionId: sessionIdRef.current,
      turnCount: state.turnCount,
      totalTokensIn: state.totalTokensIn,
      totalTokensOut: state.totalTokensOut,
      voiceMinutes: state.voiceMinutes,
      durationMs: state.startTime ? Date.now() - state.startTime : 0,
    };
  }, []);
  const getSessionId = useCallback(() => sessionIdRef.current, []);
  return { getSessionId, recordTurn, recordVoiceUsage, recordRefusal, recordIncident, getStats };
}
