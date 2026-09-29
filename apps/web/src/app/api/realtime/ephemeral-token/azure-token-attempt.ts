/**
 * Ask Azure for a realtime client secret, degrading through the configured
 * deployments with a hard deadline on every call.
 *
 * The browser gives up after 10s (webrtc-connection.ts). Without our own
 * deadline a hanging Azure call (32s in MIRRORBUDDY-3N) outlives the student's
 * patience and no fallback is ever tried.
 */

import {
  sanitizeUpstreamError,
  type SanitizedUpstreamError,
} from '@/lib/ai/providers/azure-errors';
import {
  resolveGaFallbackChain,
  shouldTryNextDeployment,
  UPSTREAM_TIMEOUT_CODE,
} from './voice-deployment-fallback';

/** Healthy calls answer in < 1s; leave room for one fallback inside the browser's 10s. */
export const ATTEMPT_TIMEOUT_MS = 4000;
export const TOTAL_BUDGET_MS = 8500;
const MIN_ATTEMPT_MS = 1000;

export type TokenAttemptResult =
  | { ok: true; response: Response; deployment: string }
  | { ok: false; failure: SanitizedUpstreamError; deployment: string };

export interface TokenAttemptOptions {
  url: string;
  headers: Record<string, string>;
  buildBody: (deployment: string) => Record<string, unknown>;
  primary: string;
  gaCandidates: ReadonlyArray<string | undefined>;
  onFallback?: (info: {
    failedDeployment: string;
    fallbackDeployment: string;
    failure: SanitizedUpstreamError;
  }) => void;
}

async function attemptOnce(
  options: TokenAttemptOptions,
  deployment: string,
  timeoutMs: number,
): Promise<TokenAttemptResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: options.headers,
      body: JSON.stringify(options.buildBody(deployment)),
      signal: controller.signal,
    });
    if (response.ok) return { ok: true, response, deployment };
    const errorText = await response.text().catch(() => '');
    return { ok: false, failure: sanitizeUpstreamError(response.status, errorText), deployment };
  } catch (error) {
    const timedOut =
      controller.signal.aborted || (error instanceof Error && error.name === 'AbortError');
    const failure: SanitizedUpstreamError = timedOut
      ? { status: 504, category: 'server', code: UPSTREAM_TIMEOUT_CODE }
      : { status: 502, category: 'server', code: 'UpstreamNetworkError' };
    return { ok: false, failure, deployment };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestTokenWithFallback(
  options: TokenAttemptOptions,
): Promise<TokenAttemptResult> {
  const startedAt = Date.now();
  const remaining = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);

  let result = await attemptOnce(options, options.primary, ATTEMPT_TIMEOUT_MS);
  if (result.ok || !shouldTryNextDeployment(result.failure)) return result;

  const chain = resolveGaFallbackChain({
    tried: [options.primary],
    gaCandidates: options.gaCandidates,
  });

  for (const fallbackDeployment of chain) {
    const budget = Math.min(ATTEMPT_TIMEOUT_MS, remaining());
    if (budget < MIN_ATTEMPT_MS) break;
    options.onFallback?.({
      failedDeployment: result.deployment,
      fallbackDeployment,
      failure: result.failure,
    });
    result = await attemptOnce(options, fallbackDeployment, budget);
    if (result.ok || !shouldTryNextDeployment(result.failure)) break;
  }

  return result;
}
