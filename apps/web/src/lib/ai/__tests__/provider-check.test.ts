/**
 * Tests for provider-check.ts
 * Issue #69: Increase unit test coverage
 *
 * @vitest-environment node
 * @module ai/__tests__/provider-check.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hasAzureProvider,
  hasOllamaProvider,
  hasAnyProvider,
  getProviderCheckStatus,
} from '../provider-check';

describe('provider-check', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================================
  // hasAzureProvider
  // ============================================================================
  describe('hasAzureProvider', () => {
    it('should return true when both Azure endpoint and API key are set', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';

      expect(hasAzureProvider()).toBe(true);
    });

    it('should return false when Azure endpoint is missing', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';

      expect(hasAzureProvider()).toBe(false);
    });

    it('should return false when Azure API key is missing', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      delete process.env.AZURE_OPENAI_API_KEY;

      expect(hasAzureProvider()).toBe(false);
    });

    it('should return false when both Azure values are missing', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;

      expect(hasAzureProvider()).toBe(false);
    });

    it('should return false for empty string values', () => {
      process.env.AZURE_OPENAI_ENDPOINT = '';
      process.env.AZURE_OPENAI_API_KEY = '';

      expect(hasAzureProvider()).toBe(false);
    });
  });

  // ============================================================================
  // hasOllamaProvider
  // ============================================================================
  describe('hasOllamaProvider', () => {
    it('should return true when OLLAMA_URL is set', () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      delete process.env.NEXT_PUBLIC_OLLAMA_ENABLED;

      expect(hasOllamaProvider()).toBe(true);
    });

    it('should return true when NEXT_PUBLIC_OLLAMA_ENABLED is true', () => {
      delete process.env.OLLAMA_URL;
      process.env.NEXT_PUBLIC_OLLAMA_ENABLED = 'true';

      expect(hasOllamaProvider()).toBe(true);
    });

    it('should return true when both Ollama vars are set', () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      process.env.NEXT_PUBLIC_OLLAMA_ENABLED = 'true';

      expect(hasOllamaProvider()).toBe(true);
    });

    it('should return false when neither Ollama var is set', () => {
      delete process.env.OLLAMA_URL;
      delete process.env.NEXT_PUBLIC_OLLAMA_ENABLED;

      expect(hasOllamaProvider()).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_OLLAMA_ENABLED is false', () => {
      delete process.env.OLLAMA_URL;
      process.env.NEXT_PUBLIC_OLLAMA_ENABLED = 'false';

      expect(hasOllamaProvider()).toBe(false);
    });

    it('should return false for empty OLLAMA_URL', () => {
      process.env.OLLAMA_URL = '';
      delete process.env.NEXT_PUBLIC_OLLAMA_ENABLED;

      expect(hasOllamaProvider()).toBe(false);
    });
  });

  // ============================================================================
  // hasAnyProvider
  // ============================================================================
  describe('hasAnyProvider', () => {
    it('should return true when only Azure is configured', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
      delete process.env.OLLAMA_URL;
      delete process.env.NEXT_PUBLIC_OLLAMA_ENABLED;

      expect(hasAnyProvider()).toBe(true);
    });

    it('should return true when only Ollama is configured', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      process.env.OLLAMA_URL = 'http://localhost:11434';

      expect(hasAnyProvider()).toBe(true);
    });

    it('should return true when both providers are configured', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
      process.env.OLLAMA_URL = 'http://localhost:11434';

      expect(hasAnyProvider()).toBe(true);
    });

    it('should return false when no provider is configured', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      delete process.env.OLLAMA_URL;
      delete process.env.NEXT_PUBLIC_OLLAMA_ENABLED;

      expect(hasAnyProvider()).toBe(false);
    });
  });

  // ============================================================================
  // getProviderCheckStatus
  // ============================================================================
  describe('getProviderCheckStatus', () => {
    it('should return correct status when both providers are configured', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
      process.env.OLLAMA_URL = 'http://localhost:11434';

      const status = getProviderCheckStatus();

      expect(status).toEqual({
        azure: true,
        ollama: true,
        any: true,
      });
    });

    it('should return correct status when only Azure is configured', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
      delete process.env.OLLAMA_URL;
      delete process.env.NEXT_PUBLIC_OLLAMA_ENABLED;

      const status = getProviderCheckStatus();

      expect(status).toEqual({
        azure: true,
        ollama: false,
        any: true,
      });
    });

    it('should return correct status when only Ollama is configured', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      process.env.OLLAMA_URL = 'http://localhost:11434';

      const status = getProviderCheckStatus();

      expect(status).toEqual({
        azure: false,
        ollama: true,
        any: true,
      });
    });

    it('should return correct status when no provider is configured', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      delete process.env.OLLAMA_URL;
      delete process.env.NEXT_PUBLIC_OLLAMA_ENABLED;

      const status = getProviderCheckStatus();

      expect(status).toEqual({
        azure: false,
        ollama: false,
        any: false,
      });
    });
  });
});
