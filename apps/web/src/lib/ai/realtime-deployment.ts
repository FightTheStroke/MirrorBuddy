/**
 * Single source of truth for which Azure realtime (voice) deployment a session uses.
 *
 * The choice is global, never per-tier: every student gets the best available model
 * (ADR 0169). Feature flags gate each generation, newest first, and each generation
 * falls back to the older ones when its deployment is not configured.
 */

export interface RealtimeFlags {
  useV15: boolean;
  useV2: boolean;
  useV21: boolean;
}

const trimmed = (value: string | undefined): string | undefined => {
  const result = value?.trim();
  return result && result !== 'undefined' ? result : undefined;
};

/**
 * Resolve the realtime deployment name from env, honouring the feature-flag chain.
 *
 * @returns the deployment name, or undefined when nothing is configured
 */
export function resolveRealtimeDeployment(
  flags: RealtimeFlags,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const base = trimmed(env.AZURE_OPENAI_REALTIME_DEPLOYMENT);
  const v15 = trimmed(env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15);
  const v2 = trimmed(env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V2);
  const v21 = trimmed(env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21);

  const candidates: (string | undefined)[] = [];
  if (flags.useV21) candidates.push(v21);
  if (flags.useV21 || flags.useV2) candidates.push(v2);
  if (flags.useV21 || flags.useV2 || flags.useV15) candidates.push(v15);
  candidates.push(base);

  return candidates.find((candidate): candidate is string => Boolean(candidate));
}
