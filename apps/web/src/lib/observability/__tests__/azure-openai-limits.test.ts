/**
 * Unit tests for Azure OpenAI limits module
 *
 * Tests the Azure Monitor integration for TPM/RPM tracking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAzureOpenAILimits,
  isAzureOpenAIStressed,
  getAzureOpenAIStressReport,
} from '../azure-openai-limits';

// Mock the Azure costs helpers
vi.mock('@/app/api/azure/costs/helpers', () => ({
  hasServicePrincipalCredentials: vi.fn(() => true),
  getAzureToken: vi.fn(),
  getCached: vi.fn(),
  setCache: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe('azure-openai-limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_SUBSCRIPTION_ID;
  });

  describe('getAzureOpenAILimits', () => {
    it('should return error when AZURE_OPENAI_ENDPOINT not configured', async () => {
      const { getCached } = await import('@/app/api/azure/costs/helpers');
      vi.mocked(getCached).mockReturnValue(null);

      const result = await getAzureOpenAILimits();

      expect(result.error).toBe('AZURE_OPENAI_ENDPOINT not configured');
      expect(result.status).toBe('error');
      expect(result.tpm).toBeNull();
      expect(result.rpm).toBeNull();
    });

    it('should return error when Azure authentication fails', async () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
      process.env.AZURE_SUBSCRIPTION_ID = 'test-sub';

      const { getCached, getAzureToken } = await import('@/app/api/azure/costs/helpers');
      vi.mocked(getCached).mockReturnValue(null);
      vi.mocked(getAzureToken).mockResolvedValue(null);

      const result = await getAzureOpenAILimits();

      expect(result.error).toBe('Azure authentication failed');
    });

    it('should return cached limits when available', async () => {
      const cachedLimits = {
        tpm: { used: 1000, limit: 10000, usagePercent: 10, unit: 'tokens/min' },
        rpm: { used: 50, limit: 1000, usagePercent: 5, unit: 'requests/min' },
        timestamp: new Date().toISOString(),
      };

      const { getCached } = await import('@/app/api/azure/costs/helpers');
      vi.mocked(getCached).mockReturnValue(cachedLimits);

      const result = await getAzureOpenAILimits();

      expect(result).toEqual(cachedLimits);
    });

    it('should calculate usage percentage correctly', async () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
      process.env.AZURE_SUBSCRIPTION_ID = 'test-sub';
      process.env.AZURE_OPENAI_RESOURCE_GROUP = 'test-rg';

      const { getCached, getAzureToken, setCache } = await import('@/app/api/azure/costs/helpers');
      vi.mocked(getCached).mockReturnValue(null);
      vi.mocked(getAzureToken).mockResolvedValue('test-token');

      // Mock fetch for Azure Monitor API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          value: [
            {
              name: { value: 'TokenTransaction' },
              timeseries: [{ data: [{ total: 8000 }] }],
            },
          ],
        }),
      });

      const result = await getAzureOpenAILimits();

      expect(result.error).toBeUndefined();
      expect(result.tpm?.used).toBe(8000);
      expect(result.tpm?.limit).toBe(10000);
      expect(result.tpm?.usagePercent).toBe(80);
      expect(vi.mocked(setCache)).toHaveBeenCalledWith('azure_openai_limits', result);
    });
  });

  describe('isAzureOpenAIStressed', () => {
    it('should return false when no stress', async () => {
      const { getCached } = await import('@/app/api/azure/costs/helpers');
      vi.mocked(getCached).mockReturnValue({
        tpm: { used: 1000, limit: 10000, usagePercent: 10, unit: 'tokens/min' },
        rpm: { used: 50, limit: 1000, usagePercent: 5, unit: 'requests/min' },
        timestamp: new Date().toISOString(),
      });

      const result = await isAzureOpenAIStressed(80);
      expect(result).toBe(false);
    });

    it('should return true when TPM stressed', async () => {
      const { getCached } = await import('@/app/api/azure/costs/helpers');
      vi.mocked(getCached).mockReturnValue({
        tpm: { used: 9000, limit: 10000, usagePercent: 90, unit: 'tokens/min' },
        rpm: { used: 50, limit: 1000, usagePercent: 5, unit: 'requests/min' },
        timestamp: new Date().toISOString(),
      });

      const result = await isAzureOpenAIStressed(80);
      expect(result).toBe(true);
    });

    it('should return true when RPM stressed', async () => {
      const { getCached } = await import('@/app/api/azure/costs/helpers');
      vi.mocked(getCached).mockReturnValue({
        tpm: { used: 1000, limit: 10000, usagePercent: 10, unit: 'tokens/min' },
        rpm: { used: 850, limit: 1000, usagePercent: 85, unit: 'requests/min' },
        timestamp: new Date().toISOString(),
      });

      const result = await isAzureOpenAIStressed(80);
      expect(result).toBe(true);
    });

    it('should return unknown on error', async () => {
      const { getCached } = await import('@/app/api/azure/costs/helpers');
      vi.mocked(getCached).mockReturnValue({
        error: 'Test error',
        tpm: { used: 0, limit: 0, usagePercent: 0, unit: 'tokens/min' },
        rpm: { used: 0, limit: 0, usagePercent: 0, unit: 'requests/min' },
        timestamp: new Date().toISOString(),
      });

      const result = await isAzureOpenAIStressed(80);
      expect(result).toBeNull();
    });
  });

  it('reports deliberate missing SP configuration without auth attempts, zero metrics or error noise', async () => {
    const { hasServicePrincipalCredentials, getAzureToken, getCached } =
      await import('@/app/api/azure/costs/helpers');
    const { logger } = await import('@/lib/logger');
    vi.mocked(hasServicePrincipalCredentials).mockReturnValue(false);
    vi.mocked(getCached).mockReturnValue({
      error: 'Azure authentication failed',
      tpm: { used: 0 },
      rpm: { used: 0 },
    });

    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await getAzureOpenAILimits();
        expect(result).toEqual(
          expect.objectContaining({
            status: 'not_configured',
            error: expect.stringContaining('NOT_CONFIGURED'),
            tpm: null,
            rpm: null,
          }),
        );
      }
      expect(await isAzureOpenAIStressed()).toBeNull();
      expect(await getAzureOpenAIStressReport()).toContain('NOT_CONFIGURED');
      expect(getCached).not.toHaveBeenCalled();
      expect(getAzureToken).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    } finally {
      vi.mocked(hasServicePrincipalCredentials).mockReturnValue(true);
    }
  });
});
