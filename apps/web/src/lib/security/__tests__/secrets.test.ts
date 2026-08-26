/**
 * What the secret reader actually does.
 *
 * The suite this replaces tested `azure-key-vault.ts`: it asserted that
 * `setSecret` throws "Azure Key Vault not available", that
 * `isAzureKeyVaultAvailable()` returns false, and that `getSecret` "falls back"
 * to the environment. Every one of those passed, and together they described a
 * module that reached Azure sometimes. It never did — the SDK is not a
 * dependency and no environment sets AZURE_KEY_VAULT_URL — so the fallback was
 * the only path, and three quarters of that suite covered functions production
 * never called.
 *
 * These tests cover the code that runs.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSecret, cacheSecret, clearCachedSecret, clearAllCachedSecrets } from '../secrets';

const ORIGINAL_ENV = process.env;

describe('secrets', () => {
  beforeEach(() => {
    clearAllCachedSecrets();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    clearAllCachedSecrets();
    vi.useRealTimers();
  });

  it('reads a secret from the environment', async () => {
    process.env.TEST_SECRET_NAME = 'value-from-env';
    await expect(getSecret('TEST_SECRET_NAME')).resolves.toBe('value-from-env');
  });

  it('refuses rather than returning an empty secret', async () => {
    delete process.env.TEST_SECRET_NAME;
    await expect(getSecret('TEST_SECRET_NAME')).rejects.toThrow(
      'Secret "TEST_SECRET_NAME" not found in the environment',
    );
  });

  it('serves the second read from cache, not from a changed environment', async () => {
    process.env.TEST_SECRET_NAME = 'first';
    await getSecret('TEST_SECRET_NAME');
    process.env.TEST_SECRET_NAME = 'second';
    await expect(getSecret('TEST_SECRET_NAME')).resolves.toBe('first');
  });

  it('skipCache bypasses the cache', async () => {
    process.env.TEST_SECRET_NAME = 'first';
    await getSecret('TEST_SECRET_NAME');
    process.env.TEST_SECRET_NAME = 'second';
    await expect(getSecret('TEST_SECRET_NAME', { skipCache: true })).resolves.toBe('second');
  });

  it('lets a cached secret expire', async () => {
    vi.useFakeTimers();
    process.env.TEST_SECRET_NAME = 'first';
    await getSecret('TEST_SECRET_NAME', { ttlMs: 1000 });
    process.env.TEST_SECRET_NAME = 'second';

    vi.advanceTimersByTime(1500);

    await expect(getSecret('TEST_SECRET_NAME')).resolves.toBe('second');
  });

  it('clears one secret without clearing the rest', async () => {
    cacheSecret('A', 'a');
    cacheSecret('B', 'b');
    clearCachedSecret('A');

    delete process.env.A;
    await expect(getSecret('A')).rejects.toThrow();
    await expect(getSecret('B')).resolves.toBe('b');
  });

  it('clears every secret', async () => {
    cacheSecret('A', 'a');
    cacheSecret('B', 'b');
    clearAllCachedSecrets();

    delete process.env.A;
    delete process.env.B;
    await expect(getSecret('A')).rejects.toThrow();
    await expect(getSecret('B')).rejects.toThrow();
  });

  /**
   * The point of the rename. A module named for Azure Key Vault, that reads
   * process.env, misleads anyone auditing where this app keeps its secrets.
   */
  it('does not claim to be a Key Vault client', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const source = readFileSync(
      join(process.cwd(), 'apps/web/src/lib/security/secrets.ts'),
      'utf-8',
    );
    // The header explains what this module used to pretend to be, so it names
    // those things on purpose. Read the code, not the prose about the code.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    expect(code).not.toContain('@azure/keyvault-secrets');
    expect(code).not.toContain('@azure/identity');
    expect(code).not.toContain('AZURE_KEY_VAULT_URL');
    expect(code).not.toContain('SecretClient');
  });
});
