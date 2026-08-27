/**
 * Secret reader.
 *
 * This was `azure-key-vault.ts`, and the name was the whole problem: it has
 * never once talked to a Key Vault. Reaching Azure required `@azure/identity`
 * and `@azure/keyvault-secrets` to be installed — neither is a dependency of
 * this repo — and an `AZURE_KEY_VAULT_URL`, which is set in no environment.
 * Both preconditions failed on the first line of every call, the dynamic import
 * swallowed the failure, and the module fell through to `process.env[name]`.
 *
 * So what shipped was an environment-variable read with a five-minute cache,
 * wearing a vault's costume. That is worse than having no vault: `getSecret`
 * reads like a hardened boundary at the call site, and a reader auditing where
 * this app keeps its secrets would have concluded, wrongly, that they are in
 * Azure. `setSecret`, `getSecretWithRetry`, `isAzureKeyVaultAvailable` and
 * `getCacheStats` had no callers at all outside their own test — a test suite
 * exercising a code path production never reaches, and reporting it as covered.
 *
 * The honest fix is not to install the SDK for a vault that does not exist. It
 * is to be the thing it actually is, under a name that says so. If a real Key
 * Vault is ever provisioned, this is the seam to put it behind — deliberately,
 * with the dependency declared, not by silent fallback.
 */

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

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

/** Cache a secret with a TTL. */
export function cacheSecret(secretName: string, value: string, ttlMs: number = CACHE_TTL_MS): void {
  cache.set(secretName, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/** Drop one cached secret. */
export function clearCachedSecret(secretName: string): void {
  cache.delete(secretName);
}

/** Drop every cached secret. */
export function clearAllCachedSecrets(): void {
  cache.clear();
}

/**
 * Read a secret from the environment, with a short in-memory cache.
 *
 * Throws when the secret is absent: a missing secret is a refusal, never an
 * empty string handed onward to a crypto routine.
 */
export async function getSecret(
  secretName: string,
  options: {
    skipCache?: boolean;
    ttlMs?: number;
  } = {},
): Promise<string> {
  const { skipCache = false, ttlMs = CACHE_TTL_MS } = options;

  if (!skipCache) {
    const cached = getCachedSecret(secretName);
    if (cached) {
      return cached;
    }
  }

  const envValue = process.env[secretName];
  if (envValue) {
    cacheSecret(secretName, envValue, ttlMs);
    return envValue;
  }

  throw new Error(`Secret "${secretName}" not found in the environment`);
}
