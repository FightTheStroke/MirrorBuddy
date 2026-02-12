/**
 * Azure OpenAI Deployment Mapping
 *
 * Maps tier model names to Azure deployment names.
 * This allows the tier system to specify logical model names (e.g., "gpt-5.2-edu")
 * while the actual Azure deployment names can differ.
 *
 * IMPORTANT: When adding new models, ensure the deployment exists in Azure.
 * Use `az cognitiveservices account deployment list` to verify.
 */

import { logger } from '@/lib/logger';

function getChatDeploymentFallback(): string | undefined {
  const fallback = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim();
  return fallback ? fallback : undefined;
}

/**
 * Mapping from tier model names to Azure deployment names
 *
 * Keys: Model names stored in TierDefinition.chatModel / realtimeModel
 * Values: Actual Azure deployment names from env vars or direct names
 */
const DEPLOYMENT_MAP: Record<string, string | undefined> = {
  // GPT-4 family (legacy — retiring 2026-03-31, kept for backward compatibility)
  'gpt-4o': process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || 'gpt-4o',
  'gpt-4o-mini': process.env.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT || 'gpt4o-mini-deployment',
  'gpt-4-turbo': process.env.AZURE_OPENAI_GPT4_TURBO_DEPLOYMENT || 'gpt-4-turbo',

  // GPT-5 family (new models)
  // IMPORTANT: In production, `AZURE_OPENAI_CHAT_DEPLOYMENT` should always point
  // to an existing Azure deployment. We fall back to it to avoid 404 DeploymentNotFound.
  'gpt-5-nano': process.env.AZURE_OPENAI_GPT5_NANO_DEPLOYMENT || getChatDeploymentFallback(),
  'gpt-5-mini': process.env.AZURE_OPENAI_GPT5_MINI_DEPLOYMENT || getChatDeploymentFallback(),
  'gpt-5-chat': process.env.AZURE_OPENAI_GPT5_CHAT_DEPLOYMENT || getChatDeploymentFallback(),
  'gpt-5.2-chat': process.env.AZURE_OPENAI_GPT52_CHAT_DEPLOYMENT || getChatDeploymentFallback(),
  'gpt-5.2-edu': process.env.AZURE_OPENAI_GPT52_EDU_DEPLOYMENT || getChatDeploymentFallback(),

  // Realtime models (voice)
  'gpt-realtime': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-4o-realtime',
  'gpt-realtime-mini': process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI || 'gpt-realtime-mini',
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
