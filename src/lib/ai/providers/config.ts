/**
 * @file config.ts
 * @brief Provider configuration functions
 */

import type { ProviderConfig, AIProvider } from "./types";

/**
 * Check if Azure OpenAI is configured
 */
export function isAzureConfigured(): boolean {
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
  return !!(azureEndpoint && azureApiKey);
}

/**
 * Get Azure OpenAI configuration
 */
export function getAzureConfig(): ProviderConfig {
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT!.trim();
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY!.trim();
  return {
    provider: "azure",
    endpoint: azureEndpoint.replace(/\/$/, ""),
    apiKey: azureApiKey,
    model: (process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4o").trim(),
  };
}

/**
 * Get Ollama configuration
 */
export function getOllamaConfig(): ProviderConfig {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  return {
    provider: "ollama",
    endpoint: ollamaUrl,
    model: process.env.OLLAMA_MODEL || "llama3.2",
  };
}

/**
 * Get the active chat provider configuration
 * Priority: User preference > Azure OpenAI > Ollama
 * @param preference - User's preferred provider: 'azure', 'ollama', or 'auto'
 */
export function getActiveProvider(
  preference?: AIProvider | "auto",
): ProviderConfig | null {
  // If explicit preference for ollama, use ollama
  if (preference === "ollama") {
    return getOllamaConfig();
  }

  // If explicit preference for azure AND azure is configured
  if (preference === "azure" && isAzureConfigured()) {
    return getAzureConfig();
  }

  // Auto mode (default): Azure if configured, otherwise Ollama
  if (isAzureConfigured()) {
    return getAzureConfig();
  }

  // Fallback to Ollama (local, no API key needed)
  return getOllamaConfig();
}

/**
 * Get the realtime voice provider configuration
 * Only Azure OpenAI Realtime is supported for voice
 */
export function getRealtimeProvider(): ProviderConfig | null {
  const endpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT?.trim();

  if (endpoint && apiKey && deployment) {
    return {
      provider: "azure",
      endpoint: endpoint.replace(/\/$/, ""),
      apiKey,
      model: deployment,
    };
  }

  return null; // Voice not available without Azure Realtime
}

/**
 * Check if Ollama is running and accessible
 */
export async function isOllamaAvailable(): Promise<boolean> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if a specific Ollama model is available
 */
export async function isOllamaModelAvailable(model: string): Promise<boolean> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;

    const data = await response.json();
    const models = data.models || [];
    // Check if the requested model exists (handle name:tag format)
    return models.some(
      (m: { name: string }) =>
        m.name === model || m.name.startsWith(`${model}:`),
    );
  } catch {
    return false;
  }
}
