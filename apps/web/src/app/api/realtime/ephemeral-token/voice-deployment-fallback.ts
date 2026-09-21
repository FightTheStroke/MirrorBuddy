/**
 * Voice deployment fallback.
 *
 * The realtime stack prefers the newest Azure deployment (currently
 * gpt-realtime-2.1). Lifecycle labels and retirement dates can disagree across
 * Azure sources (ADR 0169); an actual rejection triggers recovery, not a date.
 * Without a fallback an unavailable deployment takes voice away from students.
 *
 * These helpers let the route recognise that specific failure and retry on the
 * generally-available deployments in turn — a degradation in speech quality,
 * not an outage.
 *
 * The decision is taken on the *sanitized* upstream error: the raw Azure body
 * never leaves `sanitizeUpstreamError`, which is the contract enforced by
 * `azure-errors.sanitizer.test.ts`.
 */

import type { SanitizedUpstreamError } from '@/lib/ai/providers/azure-errors';

/** Azure error codes meaning "this deployment cannot serve the request at all". */
const DEPLOYMENT_GONE_CODES = [
  'deploymentnotfound',
  'deployment_not_found',
  'model_not_found',
  'modelnotfound',
  'modeldeprecated',
  'model_deprecated',
  'modelretired',
  'model_retired',
];

/**
 * Whether an Azure rejection means the deployment itself is unusable.
 *
 * Deliberately narrow: rate limits, auth failures and server errors are
 * transient or unrelated, and retrying them on another deployment would only
 * double the load on a resource that is already struggling.
 */
export function isDeploymentUnavailable(error: SanitizedUpstreamError): boolean {
  if (error.category === 'deployment_not_found') return true;
  if (error.status !== 400 && error.status !== 404) return false;

  const code = error.code?.toLowerCase();
  if (!code) return false;

  return DEPLOYMENT_GONE_CODES.includes(code);
}

/**
 * List every generally-available deployment still worth trying, in order.
 *
 * A single retry is not enough: when the first fallback is itself unconfigured
 * upstream — a stale deployment name left in cloud configuration, for example —
 * stopping there takes voice away from the student while a working deployment
 * is still listed behind it.
 *
 * @param tried - deployments already attempted, in attempt order
 * @param gaCandidates - GA deployments in preference order; unset entries allowed
 * @returns the untried candidates, deduplicated, in preference order
 */
export function resolveGaFallbackChain({
  tried,
  gaCandidates,
}: {
  tried: ReadonlyArray<string>;
  gaCandidates: ReadonlyArray<string | undefined>;
}): string[] {
  const seen = new Set(tried.map((deployment) => deployment.trim()).filter(Boolean));
  const chain: string[] = [];

  for (const candidate of gaCandidates) {
    const normalized = candidate?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    chain.push(normalized);
  }

  return chain;
}

/**
 * Pick a generally-available deployment to retry on.
 *
 * @param current - the deployment that Azure just rejected
 * @param gaCandidates - GA deployments in preference order; unset entries allowed
 * @returns the first configured candidate that is not the failing deployment
 */
export function resolveGaFallbackDeployment({
  current,
  gaCandidates,
}: {
  current: string;
  gaCandidates: ReadonlyArray<string | undefined>;
}): string | undefined {
  return resolveGaFallbackChain({ tried: [current], gaCandidates })[0];
}
