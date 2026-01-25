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

import { logger } from "@/lib/logger";

/**
 * Mapping from tier model names to Azure deployment names
 *
 * Keys: Model names stored in TierDefinition.chatModel / realtimeModel
 * Values: Actual Azure deployment names from env vars or direct names
 */
const DEPLOYMENT_MAP: Record<string, string | undefined> = {
  // GPT-4 family (legacy, still supported)
  "gpt-4o": process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || "gpt-4o",
  "gpt-4o-mini":
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt4o-mini-deployment",
  "gpt-4-turbo":
    process.env.AZURE_OPENAI_GPT4_TURBO_DEPLOYMENT || "gpt-4-turbo",

  // GPT-5 family (new models)
  "gpt-5-nano": process.env.AZURE_OPENAI_GPT5_NANO_DEPLOYMENT || "gpt-5-nano",
  "gpt-5-mini":
    process.env.AZURE_OPENAI_GPT5_MINI_DEPLOYMENT || "gpt-5-edu-mini",
  "gpt-5-chat": process.env.AZURE_OPENAI_GPT5_CHAT_DEPLOYMENT || "gpt-5-chat",
  "gpt-5.2-chat":
    process.env.AZURE_OPENAI_GPT52_CHAT_DEPLOYMENT || "gpt-5.2-chat",
  "gpt-5.2-edu": process.env.AZURE_OPENAI_GPT52_EDU_DEPLOYMENT || "gpt-5.2-edu",

  // Realtime models (voice)
  "gpt-realtime":
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || "gpt-4o-realtime",
  "gpt-realtime-mini":
    process.env.AZURE_OPENAI_REALTIME_MINI_DEPLOYMENT || "gpt-realtime-mini",
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
    logger.debug("Model mapped to deployment", {
      tierModel,
      deployment,
    });
    return deployment;
  }

  // If no mapping, assume the tier model name IS the deployment name
  logger.debug("No mapping for model, using as-is", { tierModel });
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
