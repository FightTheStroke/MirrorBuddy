/**
 * ADR 0165 — Realtime Translate Availability Probe
 *
 * Azure has provisioned `gpt-realtime-translate` (v2026-05-06, swedencentral) on
 * the production resource, but the dedicated `/openai/v1/realtime/translations`
 * endpoint is NOT yet exposed in the region as of 2026-05-25 (curl returns 404).
 * The model also rejects piggybacking on the generic `/realtime/client_secrets`
 * endpoint (`OperationNotSupported`).
 *
 * This module probes the endpoint on demand and caches the result so the
 * feature flag (`voice_realtime_translate`) can be flipped from `degraded` to
 * `enabled` automatically once Microsoft turns it on.
 *
 * Usage:
 *   const status = await probeTranslateAvailability();
 *   if (status.available) {
 *     // safe to issue translation sessions
 *   }
 */
import { logger } from '@/lib/logger';

export interface TranslateAvailabilityStatus {
  available: boolean;
  httpStatus: number | null;
  checkedAt: number; // epoch ms
  reason: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
let cached: TranslateAvailabilityStatus | null = null;

/**
 * Probe Azure for `/openai/v1/realtime/translations`.
 *
 * Caches the result for 24h. Pass `force=true` to bypass the cache (e.g. from
 * an admin diagnostics endpoint).
 *
 * NOTE: This function is non-throwing — any error returns `available=false`
 * with a reason string. It is safe to call from request paths, but prefer
 * scheduling via a cron route.
 */
export async function probeTranslateAvailability(
  force = false,
): Promise<TranslateAvailabilityStatus> {
  if (!force && cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached;
  }

  const endpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_REALTIME_TRANSLATE_DEPLOYMENT?.trim();

  if (!endpoint || !apiKey || !deployment) {
    const status: TranslateAvailabilityStatus = {
      available: false,
      httpStatus: null,
      checkedAt: Date.now(),
      reason: 'translate deployment env vars not configured',
    };
    cached = status;
    return status;
  }

  const url = new URL(endpoint);
  const probeUrl = `${url.protocol}//${url.hostname}/openai/v1/realtime/translations`;

  try {
    // Minimal OPTIONS-style probe via empty POST. We intentionally do NOT
    // create a billable session — a 404 vs 4xx-with-validation is sufficient
    // to distinguish "endpoint missing" from "endpoint exists".
    const response = await fetch(probeUrl, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: { model: deployment } }),
    });

    const available = response.status !== 404;
    const status: TranslateAvailabilityStatus = {
      available,
      httpStatus: response.status,
      checkedAt: Date.now(),
      reason: available
        ? `endpoint responds with HTTP ${response.status} (not 404)`
        : 'endpoint returns 404 — Azure has not yet enabled it in this region',
    };
    cached = status;

    logger.info('[realtime-translate-availability] probe complete', {
      probeUrl,
      httpStatus: response.status,
      available,
    });

    return status;
  } catch (error) {
    const status: TranslateAvailabilityStatus = {
      available: false,
      httpStatus: null,
      checkedAt: Date.now(),
      reason: `probe failed: ${error instanceof Error ? error.message : String(error)}`,
    };
    cached = status;
    logger.warn('[realtime-translate-availability] probe error', {
      error: status.reason,
    });
    return status;
  }
}

/**
 * Reset the cache. Use in tests or after an env var change.
 */
export function resetTranslateAvailabilityCache(): void {
  cached = null;
}
