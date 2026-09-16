/**
 * Voice deployment fallback.
 *
 * The realtime stack prefers the newest Azure deployment (currently
 * gpt-realtime-2.1), which is a *preview* model: Azure ends inference support on
 * a fixed date and the deployment then stops answering. Without a fallback the
 * token endpoint returns 503 and voice is simply gone for every student.
 *
 * These helpers let the route recognise that specific failure and retry once on
 * a generally-available deployment — a degradation in speech quality, not an
 * outage.
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
  const failing = current.trim();

  for (const candidate of gaCandidates) {
    const normalized = candidate?.trim();
    if (!normalized || normalized === failing) continue;
    return normalized;
  }

  return undefined;
}
