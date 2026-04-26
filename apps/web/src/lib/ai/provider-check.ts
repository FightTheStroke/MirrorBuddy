// ============================================================================
// PROVIDER CHECK UTILITY
// Used by middleware to detect if ANY provider is configured
// If no provider: redirect to /landing for showcase mode
// ============================================================================

/**
 * Check if Azure OpenAI is configured
 */
export function hasAzureProvider(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY
  );
}

/**
 * Check if Ollama is explicitly configured
 * Note: We require explicit configuration, not just default localhost
 */
export function hasOllamaProvider(): boolean {
  // Check if OLLAMA_URL is explicitly set (not relying on default)
  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaEnabled = process.env.NEXT_PUBLIC_OLLAMA_ENABLED === 'true';

  return !!(ollamaUrl || ollamaEnabled);
}

/**
 * Check if ANY provider (Azure OR Ollama) is configured
 * Used by middleware to decide: redirect to /landing or allow access
 */
export function hasAnyProvider(): boolean {
  return hasAzureProvider() || hasOllamaProvider();
}

/**
 * Get detailed provider status
 * Useful for UI to show which providers are available
 */
export function getProviderCheckStatus(): {
  azure: boolean;
  ollama: boolean;
  any: boolean;
} {
  const azure = hasAzureProvider();
  const ollama = hasOllamaProvider();

  return {
    azure,
    ollama,
    any: azure || ollama,
  };
}
