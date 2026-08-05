/**
 * Reports what a turn cost, from the browser.
 *
 * Azure sends a usage block on every `response.done`. That block is the only
 * honest source for what a conversation costs: wall-clock minutes charge
 * silence at the same rate as speech, and Azure does not.
 *
 * Reporting is strictly fire-and-forget. Accounting must never be able to
 * interrupt a child mid-sentence.
 */

'use client';

import { csrfFetch } from '@/lib/auth';
import { clientLogger as logger } from '@/lib/logger/client';

export interface VoiceUsageReport {
  sessionId: string | null;
  maestroId?: string | null;
  model?: string | null;
  usage: unknown;
}

/** Reads `response.usage` out of a `response.done` event, tolerating shape drift. */
export function usageFromResponseDone(event: Record<string, unknown>): unknown {
  const response = event.response;
  if (typeof response !== 'object' || response === null) return null;
  return (response as Record<string, unknown>).usage ?? null;
}

export function modelFromResponseDone(event: Record<string, unknown>): string | null {
  const response = event.response;
  if (typeof response !== 'object' || response === null) return null;
  const model = (response as Record<string, unknown>).model;
  return typeof model === 'string' && model.trim() ? model : null;
}

/**
 * Returns whether the turn was reported. Exported so a test can prove the
 * failure path actually resolves instead of leaving a rejected promise loose.
 */
export async function sendVoiceUsage(report: VoiceUsageReport): Promise<boolean> {
  if (!report.sessionId || !report.usage) return false;

  return csrfFetch('/api/metrics/voice-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: report.sessionId,
      maestroId: report.maestroId ?? null,
      model: report.model || 'gpt-realtime',
      usage: report.usage,
    }),
  })
    .then(() => true)
    .catch((error: unknown) => {
      // A lost row is an accounting gap. A thrown error here would be a
      // conversation that stops, which is not a trade worth making.
      logger.debug('[VoiceUsage] Could not report usage', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    });
}

export function reportVoiceUsage(report: VoiceUsageReport): void {
  void sendVoiceUsage(report);
}
