/**
 * Which Azure realtime deployment a voice turn actually used.
 *
 * The browser must not get a vote. Azure's `response.done` often omits
 * `response.model`, and a client-supplied default of "gpt-realtime" prices
 * every turn at the premium rate — a cost dashboard that is confidently wrong
 * is worse than no dashboard.
 *
 * Usage is only reported from the WebRTC path, which always connects with the
 * deployment `/api/realtime/ephemeral-token` chose. So the honest answer is to
 * repeat that endpoint's resolution, feature flags included.
 */

import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';

const FALLBACK = 'gpt-realtime';

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/**
 * @param reported the model Azure named on `response.done`, when it named one.
 */
export async function resolveVoiceModel(reported?: string | null): Promise<string> {
  // If Azure itself named the model, that is the truth and beats any guess.
  const named = reported?.trim();
  if (named) return named;

  const legacy = env('AZURE_OPENAI_REALTIME_DEPLOYMENT');
  const v15 = env('AZURE_OPENAI_REALTIME_DEPLOYMENT_V15');
  const v2 = env('AZURE_OPENAI_REALTIME_DEPLOYMENT_V2');
  const v21 = env('AZURE_OPENAI_REALTIME_DEPLOYMENT_V21');

  // Same precedence as the token endpoint (ADR 0165, ADR 0169).
  const [use21, use2, use15] = await Promise.all([
    isFeatureEnabled('voice_realtime_21'),
    isFeatureEnabled('voice_realtime_2'),
    isFeatureEnabled('voice_realtime_15'),
  ]);

  const resolved = use21.enabled
    ? v21 || v2 || v15 || legacy
    : use2.enabled
      ? v2 || v15 || legacy
      : use15.enabled
        ? v15 || legacy
        : legacy;

  // Nothing configured: name the premium model so the turn is priced at the
  // dearer rate. Overstating is recoverable; understating the bill is not.
  return resolved || FALLBACK;
}
