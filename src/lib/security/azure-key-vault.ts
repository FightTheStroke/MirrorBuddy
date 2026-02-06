/**
 * Azure Key Vault Service
 *
 * Provides secure secret management with:
 * - Dynamic Azure SDK loading (graceful when packages missing)
 * - In-memory caching with TTL
 * - Fallback to environment variables for dev mode
 * - Support for managed identity and service principal
 */

import { logger } from "@/lib/logger";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

type SecretClientType = {
  getSecret: (secretName: string) => Promise<{ value?: string }>;
  setSecret: (secretName: string, value: string) => Promise<void>;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

let secretClient: SecretClientType | null = null;
let azureInitialized = false;
let azureAvailable = false;

/**
 * Initialize Azure Key Vault client with dynamic import
 * Returns true if initialization successful, false if Azure SDK unavailable
 */
async function initializeAzureClient(): Promise<boolean> {
  if (azureInitialized) {
    return azureAvailable;
  }

  azureInitialized = true;

  const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
  if (!vaultUrl) {
    logger.warn(
      "[AKV] AZURE_KEY_VAULT_URL not set, using environment variables fallback",
    );
    return false;
  }

  try {
    // Dynamic import - will fail gracefully if packages not installed
    // Use type assertion to bypass TypeScript module resolution
    const secretsPath: string = "@azure/keyvault-secrets";
    const identityPath: string = "@azure/identity";

    const [secretsModule, identityModule] = await Promise.all([
      import(secretsPath).catch(() => null),
      import(identityPath).catch(() => null),
    ]);

    if (!secretsModule || !identityModule) {
      logger.warn(
        "[AKV] Azure SDK packages not installed, falling back to environment variables",
      );
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { SecretClient } = secretsModule as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { DefaultAzureCredential } = identityModule as any;

    const credential = new DefaultAzureCredential();
    secretClient = new SecretClient(vaultUrl, credential);
    azureAvailable = true;

    logger.info("[AKV] Azure Key Vault client initialized successfully");
    return true;
  } catch (error) {
    logger.warn("[AKV] Failed to initialize Azure Key Vault client", {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.warn("[AKV] Falling back to environment variables");
    return false;
  }
}

/**
 * Get secret from cache if available and not expired
 */
function getCachedSecret(secretName: string): string | null {
  const entry = cache.get(secretName);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(secretName);
    return null;
  }

  return entry.value;
}

/**
 * Cache a secret with TTL
 */
export function cacheSecret(
  secretName: string,
  value: string,
  ttlMs: number = CACHE_TTL_MS,
): void {
  cache.set(secretName, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Clear cached secret
 */
export function clearCachedSecret(secretName: string): void {
  cache.delete(secretName);
}

/**
 * Clear all cached secrets
 */
export function clearAllCachedSecrets(): void {
  cache.clear();
}

/**
 * Get secret from Azure Key Vault or environment variable fallback
 *
 * @param secretName - Name of the secret to retrieve
 * @param options - Configuration options
 * @returns Secret value
 * @throws Error if secret not found in either AKV or environment variables
 */
export async function getSecret(
  secretName: string,
  options: {
    skipCache?: boolean;
    ttlMs?: number;
  } = {},
): Promise<string> {
  const { skipCache = false, ttlMs = CACHE_TTL_MS } = options;

  // Check cache first (unless explicitly skipped)
  if (!skipCache) {
    const cached = getCachedSecret(secretName);
    if (cached) {
      return cached;
    }
  }

  // Try Azure Key Vault first
  const azureReady = await initializeAzureClient();
  if (azureReady && secretClient) {
    try {
      const secret = await secretClient.getSecret(secretName);
      if (secret.value) {
        cacheSecret(secretName, secret.value, ttlMs);
        return secret.value;
      }
    } catch (error) {
      logger.warn(
        `[AKV] Failed to get secret "${secretName}" from Azure Key Vault`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      logger.warn("[AKV] Attempting fallback to environment variables");
    }
  }

  // Fallback to environment variables
  const envValue = process.env[secretName];
  if (envValue) {
    cacheSecret(secretName, envValue, ttlMs);
    return envValue;
  }

  throw new Error(
    `Secret "${secretName}" not found in Azure Key Vault or environment variables`,
  );
}

/**
 * Set secret in Azure Key Vault
 *
 * @param secretName - Name of the secret to set
 * @param value - Secret value
 * @throws Error if Azure Key Vault not available or operation fails
 */
export async function setSecret(
  secretName: string,
  value: string,
): Promise<void> {
  const azureReady = await initializeAzureClient();

  if (!azureReady || !secretClient) {
    throw new Error(
      "Azure Key Vault not available. Cannot set secrets in environment-only mode.",
    );
  }

  try {
    await secretClient.setSecret(secretName, value);
    // Update cache with new value
    cacheSecret(secretName, value);
  } catch (error) {
    throw new Error(
      `Failed to set secret "${secretName}" in Azure Key Vault: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Get secret with automatic retry on failure
 *
 * @param secretName - Name of the secret to retrieve
 * @param maxRetries - Maximum number of retry attempts
 * @param retryDelayMs - Delay between retries in milliseconds
 * @returns Secret value
 */
export async function getSecretWithRetry(
  secretName: string,
  maxRetries: number = 3,
  retryDelayMs: number = 1000,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getSecret(secretName);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        logger.warn(
          `[AKV] Attempt ${attempt}/${maxRetries} failed for secret "${secretName}", retrying in ${retryDelayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw new Error(
    `Failed to get secret "${secretName}" after ${maxRetries} attempts: ${lastError?.message}`,
  );
}

/**
 * Check if Azure Key Vault is available and configured
 */
export async function isAzureKeyVaultAvailable(): Promise<boolean> {
  return await initializeAzureClient();
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ secretName: string; expiresIn: number }>;
} {
  const now = Date.now();
  const entries: Array<{ secretName: string; expiresIn: number }> = [];

  for (const [secretName, entry] of cache.entries()) {
    entries.push({
      secretName,
      expiresIn: Math.max(0, entry.expiresAt - now),
    });
  }

  return {
    size: cache.size,
    entries,
  };
}
