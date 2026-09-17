/**
 * Azure OpenAI Deployment Mapping
 *
 * Maps tier model names to Azure deployment names.
 * This allows the tier system to specify logical model names (e.g., "gpt-5.2-edu")
 * while the actual Azure deployment names can differ.
 *
 * IMPORTANT: When adding new models, ensure the deployment exists in Azure.
 * Use `az cognitiveservices account deployment list` to verify.
 *
 * === RETIREMENT TIMELINE ===
 * Audited 2026-09-16 against `aoai-virtualbpm-prod` (swedencentral) with
 * `az cognitiveservices model list` and `az cognitiveservices account deployment list`.
 *
 * | Deployment       | Underlying model | Status  | Inference retires |
 * | ---------------- | ---------------- | ------- | ----------------- |
 * | gpt-6-astra      | gpt-6-astra      | GA      | 2028-01-11        |
 * | gpt-5.6-terra    | gpt-5.6-terra    | GA      | 2028-01-11        |
 * | gpt-5.6-sol      | gpt-5.6-sol      | GA      | 2028-01-11        |
 * | gpt-5-edu-mini   | gpt-5-mini       | GA      | 2027-02-09        |
 * | gpt-5-nano       | gpt-5-nano       | GA      | 2027-02-09        |
 * | gpt-5.2-edu      | gpt-chat-latest  | Preview | 2026-10-05        |
 * | gpt-5.2-chat     | gpt-chat-latest  | Preview | 2026-10-05        |
 * | gpt-5-chat       | gpt-chat-latest  | Preview | 2026-10-05        |
 * | gpt-realtime-2.1 | gpt-realtime-2.1 | Preview | See conflict below |
 * | gpt-realtime-2   | gpt-realtime-2   | Preview | See conflict below |
 * | gpt-realtime-15  | gpt-realtime-1.5 | GA      | 2027-08-24        |
 *
 * Voice rechecked 2026-09-17: Microsoft Learn lists 2.1 (2026-07-07) retirement
 * as 2027-06-25; Sweden Central's model.deprecation.inference says 2027-07-31.
 * For 2.0 (2026-05-06), Learn says 2026-08-31 and the regional catalogue
 * says 2026-10-31. Use the earlier date for planning pending reconciliation.
 * Neither provisioning state nor lifecycle metadata proves live inference.
 * The former 2026-10-15 date for 2.1 was incorrect. See ADR 0169 and issue #1022.
 *
 * The GPT-4 family retired in Feb 2026; those aliases survive only so that a tier
 * row written before the migration still resolves to a live deployment.
 */

import { logger } from '@/lib/logger';

/**
 * Azure deployment serving the default chat model (gpt-5.6-terra, GA).
 *
 * Terra is the balanced member of the 5.6 line: same context window and
 * tooling as the Sol flagship at half the token price and lower latency,
 * which is the right trade for tutoring turns. Sol stays deployed and
 * mapped below, so raising the bar is a one-line change.
 */
const CHAT_DEFAULT_DEPLOYMENT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim() || 'gpt-5.6-terra';

function getChatDeploymentFallback(): string | undefined {
  const fallback = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim();
  return fallback ? fallback : undefined;
}

/**
 * Mapping from tier model names to Azure deployment names
 *
 * Keys: Logical chat model names from tiers and global voice deployment aliases
 * Values: Actual Azure deployment names from env vars or direct names
 */
const DEPLOYMENT_MAP: Record<string, string | undefined> = {
  // GPT-4 family (RETIRED Feb 2026). These deployments no longer serve the model
  // they are named after, so every alias resolves to the current flagship instead
  // of a DeploymentNotFound or a silently different model.
  'gpt-4o': process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || CHAT_DEFAULT_DEPLOYMENT,
  'gpt-4o-mini': process.env.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT || CHAT_DEFAULT_DEPLOYMENT,
  'gpt-4-turbo': process.env.AZURE_OPENAI_GPT4_TURBO_DEPLOYMENT || CHAT_DEFAULT_DEPLOYMENT,

  // GPT-5 family (new models)
  // IMPORTANT: In production, `AZURE_OPENAI_CHAT_DEPLOYMENT` should always point
  // to an existing Azure deployment. We fall back to it to avoid 404 DeploymentNotFound.
  'gpt-5-nano': process.env.AZURE_OPENAI_GPT5_NANO_DEPLOYMENT || getChatDeploymentFallback(),
  'gpt-5-mini': process.env.AZURE_OPENAI_GPT5_MINI_DEPLOYMENT || getChatDeploymentFallback(),

  // Legacy chat aliases. The `gpt-5-chat` / `gpt-5.2-chat` / `gpt-5.2-edu`
  // deployments are all backed by `gpt-chat-latest` 2026-05-05, a preview model
  // whose inference support ends 2026-10-05. Their per-model env vars are
  // deliberately ignored: every tier chats on the same GA model anyway, so a tier
  // row still carrying one of these names must land on the current default rather
  // than on a deployment that stops answering.
  'gpt-5-chat': CHAT_DEFAULT_DEPLOYMENT,
  'gpt-5.2-chat': CHAT_DEFAULT_DEPLOYMENT,
  'gpt-5.2-edu': CHAT_DEFAULT_DEPLOYMENT,

  // 2026-07-09 wave — GPT-5.6 line. Every tier chats on the same model: the
  // quality of the tutor is not something to ration by price plan. Terra is
  // the default; Sol is kept mapped as the deliberate upgrade path.
  'gpt-5.6-terra': CHAT_DEFAULT_DEPLOYMENT,
  'gpt-5.6-sol': process.env.AZURE_OPENAI_GPT56_SOL_DEPLOYMENT?.trim() || 'gpt-5.6-sol',

  // 2026-09-03 wave — GPT-6 Astra is the newest GA flagship and is already
  // provisioned on the resource, but it is deliberately NOT mapped: the decision
  // taken on 2026-09-16 is that its token price is not worth it for tutoring
  // turns. Leaving it unmapped keeps it out of the admin model picker, so it
  // cannot be switched on by a stray click. Re-adding it is one line.

  // Realtime models (voice) — GA deployments (Feb 2026+)
  // Global aliases only: voice routes do not select a model by user tier (ADR 0169).
  // Guarded by voice_ga_protocol feature flag at the API route level
  'gpt-realtime': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-realtime',
  'gpt-realtime-mini': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI || 'gpt-realtime-mini',
  'gpt-realtime-1.5': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15 || 'gpt-realtime-1.5',

  // 2026-05-06 wave (ADR 0165) — EU swedencentral only
  // gpt-realtime-2:        next-gen successor of 1.5 (Preview). Drop-in.
  // gpt-realtime-whisper:  used as input.transcription.model inside realtime session.
  // gpt-realtime-translate: PROVISIONED but Azure endpoint not yet enabled — see ADR 0165.
  'gpt-realtime-2': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V2 || 'gpt-realtime-2',

  // 2026-07-07 wave (ADR 0169) — gpt-realtime-2.1: successor of 2.0 with better
  // alphanumeric speech (dates/numbers/formulas — key for discalculia), noise
  // robustness and lower latency. Adds the Cedar voice. Drop-in over v2.
  'gpt-realtime-2.1': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21 || 'gpt-realtime-2.1',
  'gpt-realtime-2.1-mini':
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21_MINI || 'gpt-realtime-2.1-mini',
  'gpt-realtime-whisper':
    process.env.AZURE_OPENAI_REALTIME_TRANSCRIPTION_DEPLOYMENT || 'gpt-realtime-whisper',
  'gpt-realtime-translate':
    process.env.AZURE_OPENAI_REALTIME_TRANSLATE_DEPLOYMENT || 'gpt-realtime-translate',
};

/**
 * Get Azure deployment name for a tier model
 *
 * @param tierModel - Model name from tier definition (e.g., "gpt-5.2-edu")
 * @returns Azure deployment name or the original name if no mapping exists
 */
export function getDeploymentForModel(tierModel: string): string {
  const deployment = DEPLOYMENT_MAP[tierModel];

  if (deployment) {
    logger.debug('Model mapped to deployment', {
      tierModel,
      deployment,
    });
    return deployment;
  }

  // If no mapping, use the default chat deployment when available.
  const fallback = getChatDeploymentFallback();
  if (fallback) {
    logger.warn('No deployment mapping for model, falling back to AZURE_OPENAI_CHAT_DEPLOYMENT', {
      tierModel,
      fallback,
    });
    return fallback;
  }

  // Last resort: assume the tier model name IS the deployment name.
  logger.warn('No deployment mapping and no AZURE_OPENAI_CHAT_DEPLOYMENT, using model as-is', {
    tierModel,
  });
  return tierModel;
}

/**
 * Check if a model has a known deployment
 */
export function hasDeploymentMapping(tierModel: string): boolean {
  return tierModel in DEPLOYMENT_MAP;
}

/**
 * Get all available model names (for admin UI)
 */
export function getAvailableModels(): string[] {
  return Object.keys(DEPLOYMENT_MAP);
}
