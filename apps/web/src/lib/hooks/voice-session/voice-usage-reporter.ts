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
import { isVoiceUsageId } from '@/lib/metrics/voice-usage-validation';

export interface VoiceUsageReport {
  sessionId: string | null;
  responseId?: string;
  maestroId?: string | null;
  /** Only set when Azure named it on `response.done`; the server decides otherwise. */
  model?: string | null;
  usage: unknown;
}

/** Reads `response.usage` out of a `response.done` event, tolerating shape drift. */
export function usageFromResponseDone(event: Record<string, unknown> | null | undefined): unknown {
  const response = event?.response;
  if (typeof response !== 'object' || response === null) return null;
  return (response as Record<string, unknown>).usage ?? null;
}

export function modelFromResponseDone(
  event: Record<string, unknown> | null | undefined,
): string | null {
  const response = event?.response;
  if (typeof response !== 'object' || response === null) return null;
  const model = (response as Record<string, unknown>).model;
  return typeof model === 'string' && model.trim() ? model : null;
}

export function responseIdFromEvent(
  event: Record<string, unknown> | null | undefined,
): string | null {
  const response = event?.response;
  const id =
    response && typeof response === 'object' && 'id' in response ? response.id : event?.response_id;
  return isVoiceUsageId(id) ? id : null;
}

/**
 * Returns whether the turn was reported. Exported so a test can prove the
 * failure path actually resolves instead of leaving a rejected promise loose.
 */
export async function sendVoiceUsage(
  report: VoiceUsageReport | null | undefined,
): Promise<boolean> {
  if (
    !report ||
    !isVoiceUsageId(report.sessionId) ||
    (report.responseId !== undefined && !isVoiceUsageId(report.responseId)) ||
    !report.usage ||
    typeof report.usage !== 'object' ||
    Array.isArray(report.usage)
  ) {
    logger.warn('[VoiceUsage] Invalid report; not submitted');
    return false;
  }

  try {
    const response = await csrfFetch('/api/metrics/voice-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: report.sessionId,
        responseId: report.responseId,
        maestroId: report.maestroId ?? null,
        model: report.model ?? null,
        usage: report.usage,
      }),
    });
    if (!response.ok) throw new Error(`Voice usage rejected: HTTP ${response.status}`);
    const acknowledgement: unknown = await response.json();
    if (
      !acknowledgement ||
      typeof acknowledgement !== 'object' ||
      !('success' in acknowledgement) ||
      acknowledgement.success !== true
    )
      throw new Error('Voice usage acknowledgement missing');
    return true;
  } catch (error) {
    logger.error('[VoiceUsage] Could not report usage', undefined, error);
    return false;
  }
}

export function reportVoiceUsage(report: VoiceUsageReport): void {
  void sendVoiceUsage(report);
}
