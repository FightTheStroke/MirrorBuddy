/**
 * Tests for providers.ts
 * Issue #69: Increase unit test coverage
 *
 * @vitest-environment node
 * @module ai/__tests__/providers.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isAzureConfigured,
  getActiveProvider,
  getRealtimeProvider,
  isOllamaAvailable,
  isOllamaModelAvailable,
  chatCompletion,
  getProviderStatus,
} from '../providers';
import { azureChatCompletion } from '../providers/azure';

// Mock logger to prevent console output during tests
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

describe('providers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ============================================================================
  // isAzureConfigured
  // ============================================================================
  describe('isAzureConfigured', () => {
    it('should return true when both Azure endpoint and API key are set', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';

      expect(isAzureConfigured()).toBe(true);
    });

    it('should return false when endpoint is missing', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';

      expect(isAzureConfigured()).toBe(false);
    });

    it('should return false when API key is missing', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      delete process.env.AZURE_OPENAI_API_KEY;

      expect(isAzureConfigured()).toBe(false);
    });

    it('should return false when both are missing', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;

      expect(isAzureConfigured()).toBe(false);
    });
  });

  // ============================================================================
  // getActiveProvider
  // ============================================================================
  describe('getActiveProvider', () => {
    it('should return Ollama config when preference is ollama', () => {
      const result = getActiveProvider('ollama');

      expect(result).toEqual({
        provider: 'ollama',
        endpoint: 'http://localhost:11434',
        model: 'llama3.2',
      });
    });

    it('should return Azure config when preference is azure and Azure is configured', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
      process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = 'gpt-4o-custom';

      const result = getActiveProvider('azure');

      expect(result).toEqual({
        provider: 'azure',
        endpoint: 'https://my-resource.openai.azure.com',
        apiKey: 'my-api-key',
        model: 'gpt-4o-custom',
      });
    });

    it('should fallback to Ollama when preference is azure but Azure is not configured', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;

      const result = getActiveProvider('azure');

      expect(result?.provider).toBe('ollama');
    });

    it('should return Azure config in auto mode when Azure is configured', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';

      const result = getActiveProvider('auto');

      expect(result?.provider).toBe('azure');
    });

    it('should return Ollama config in auto mode when Azure is not configured', () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;

      const result = getActiveProvider('auto');

      expect(result?.provider).toBe('ollama');
    });

    it('should return Azure when no preference and Azure is configured', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';

      const result = getActiveProvider();

      expect(result?.provider).toBe('azure');
    });

    it('should remove trailing slash from Azure endpoint', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com/';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';

      const result = getActiveProvider('azure');

      expect(result?.endpoint).toBe('https://my-resource.openai.azure.com');
    });

    it('should use default model when not specified', () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
      delete process.env.AZURE_OPENAI_CHAT_DEPLOYMENT;

      const result = getActiveProvider('azure');

      expect(result?.model).toBe('gpt-5-mini');
    });

    it('should use custom Ollama URL when set', () => {
      process.env.OLLAMA_URL = 'http://192.168.1.100:11434';

      const result = getActiveProvider('ollama');

      expect(result?.endpoint).toBe('http://192.168.1.100:11434');
    });

    it('should use custom Ollama model when set', () => {
      process.env.OLLAMA_MODEL = 'mistral';

      const result = getActiveProvider('ollama');

      expect(result?.model).toBe('mistral');
    });
  });

  // ============================================================================
  // getRealtimeProvider
  // ============================================================================
  describe('getRealtimeProvider', () => {
    it('should return config when all realtime vars are set', () => {
      process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://realtime.openai.azure.com';
      process.env.AZURE_OPENAI_REALTIME_API_KEY = 'realtime-key';
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'gpt-4o-realtime-preview';

      const result = getRealtimeProvider();

      expect(result).toEqual({
        provider: 'azure',
        endpoint: 'https://realtime.openai.azure.com',
        apiKey: 'realtime-key',
        model: 'gpt-4o-realtime-preview',
      });
    });

    it('should return null when endpoint is missing', () => {
      delete process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
      process.env.AZURE_OPENAI_REALTIME_API_KEY = 'realtime-key';
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'gpt-4o-realtime-preview';

      expect(getRealtimeProvider()).toBeNull();
    });

    it('should return null when API key is missing', () => {
      process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://realtime.openai.azure.com';
      delete process.env.AZURE_OPENAI_REALTIME_API_KEY;
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'gpt-4o-realtime-preview';

      expect(getRealtimeProvider()).toBeNull();
    });

    it('should return null when deployment is missing', () => {
      process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://realtime.openai.azure.com';
      process.env.AZURE_OPENAI_REALTIME_API_KEY = 'realtime-key';
      delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

      expect(getRealtimeProvider()).toBeNull();
    });

    it('should remove trailing slash from endpoint', () => {
      process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://realtime.openai.azure.com/';
      process.env.AZURE_OPENAI_REALTIME_API_KEY = 'realtime-key';
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'gpt-4o-realtime-preview';

      const result = getRealtimeProvider();

      expect(result?.endpoint).toBe('https://realtime.openai.azure.com');
    });
  });

  // ============================================================================
  // isOllamaAvailable
  // ============================================================================
  describe('isOllamaAvailable', () => {
    it('should return true when Ollama responds OK', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      const result = await isOllamaAvailable();

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should return false when Ollama responds with error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await isOllamaAvailable();

      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await isOllamaAvailable();

      expect(result).toBe(false);
    });

    it('should use custom OLLAMA_URL when set', async () => {
      process.env.OLLAMA_URL = 'http://custom-host:11434';
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await isOllamaAvailable();

      expect(fetch).toHaveBeenCalledWith('http://custom-host:11434/api/tags', expect.anything());
    });
  });

  // ============================================================================
  // isOllamaModelAvailable
  // ============================================================================
  describe('isOllamaModelAvailable', () => {
    it('should return true when model exists', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.2:latest' }, { name: 'mistral:latest' }],
        }),
      });

      const result = await isOllamaModelAvailable('llama3.2');

      expect(result).toBe(true);
    });

    it('should return true when exact model name matches', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.2' }],
        }),
      });

      const result = await isOllamaModelAvailable('llama3.2');

      expect(result).toBe(true);
    });

    it('should return false when model does not exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.2:latest' }, { name: 'mistral:latest' }],
        }),
      });

      const result = await isOllamaModelAvailable('gpt-4o');

      expect(result).toBe(false);
    });

    it('should return false when Ollama is not available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await isOllamaModelAvailable('llama3.2');

      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await isOllamaModelAvailable('llama3.2');

      expect(result).toBe(false);
    });

    it('should handle empty models array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const result = await isOllamaModelAvailable('llama3.2');

      expect(result).toBe(false);
    });

    it('should handle missing models property', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await isOllamaModelAvailable('llama3.2');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // chatCompletion
  // ============================================================================
  describe('chatCompletion', () => {
    const mockMessages = [{ role: 'user', content: 'Hello' }];
    const mockSystemPrompt = 'You are a helpful assistant';

    describe('with Azure provider', () => {
      beforeEach(() => {
        process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
        process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
        process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = 'gpt-5-mini';
      });

      it('should call Azure API and return response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: { content: 'Hello! How can I help you?' },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 8,
              total_tokens: 18,
            },
          }),
        });

        const result = await chatCompletion(mockMessages, mockSystemPrompt);

        expect(result).toEqual({
          content: 'Hello! How can I help you?',
          provider: 'azure',
          model: 'gpt-5-mini',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18,
          },
          tool_calls: undefined,
          finish_reason: 'stop',
          contentFiltered: undefined,
          filteredCategories: undefined,
        });
      });

      it('should retry with max_tokens when max_completion_tokens is unsupported', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: async () =>
              "Unsupported parameter: 'max_completion_tokens'. Use 'max_tokens' instead.",
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            }),
          });

        const result = await chatCompletion(mockMessages, mockSystemPrompt, { maxTokens: 50 });

        expect(result.content).toBe('OK');

        const firstCallBody = JSON.parse(
          ((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as { body: string }).body,
        ) as Record<string, unknown>;
        const secondCallBody = JSON.parse(
          ((fetch as ReturnType<typeof vi.fn>).mock.calls[1][1] as { body: string }).body,
        ) as Record<string, unknown>;

        expect(firstCallBody.max_completion_tokens).toBe(50);
        expect(secondCallBody.max_tokens).toBe(50);
      });

      it('should retry with fallback deployment on DeploymentNotFound', async () => {
        process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = 'good-deployment';

        global.fetch = vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: async () => JSON.stringify({ error: { code: 'DeploymentNotFound' } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              choices: [{ message: { content: 'Fallback OK' }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            }),
          });

        const result = await azureChatCompletion(
          {
            provider: 'azure',
            endpoint: 'https://my-resource.openai.azure.com',
            apiKey: 'my-api-key',
            model: 'bad-deployment',
          },
          mockMessages,
          mockSystemPrompt,
          0.7,
          20,
        );

        expect(result.content).toBe('Fallback OK');
        expect(result.model).toBe('good-deployment');

        const firstUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
        const secondUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;

        expect(firstUrl).toContain('/openai/deployments/bad-deployment/');
        expect(secondUrl).toContain('/openai/deployments/good-deployment/');
      });

      it('should include tools in request when provided', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: '',
                  tool_calls: [
                    {
                      id: 'call_1',
                      type: 'function',
                      function: { name: 'test', arguments: '{}' },
                    },
                  ],
                },
                finish_reason: 'tool_calls',
              },
            ],
          }),
        });

        const tools = [
          {
            type: 'function' as const,
            function: {
              name: 'test_tool',
              description: 'A test tool',
              parameters: { type: 'object', properties: {} },
            },
          },
        ];

        await chatCompletion(mockMessages, mockSystemPrompt, { tools });

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"tools"'),
          }),
        );
      });

      it('should handle API errors', async () => {
        // Mock all fetch calls to return 429 (will be retried by circuit breaker)
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        });

        // Increased timeout to account for retry/circuit breaker delays
        await expect(chatCompletion(mockMessages, mockSystemPrompt)).rejects.toThrow(
          'Azure OpenAI error (429): Rate limit exceeded',
        );
      }, 30000); // 30 second timeout for retries

      it('should use custom temperature and maxTokens', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          }),
        });

        await chatCompletion(mockMessages, mockSystemPrompt, {
          temperature: 0.3,
          maxTokens: 500,
        });

        const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
        expect(callBody.temperature).toBe(0.3);
        expect(callBody.max_completion_tokens).toBe(500);
      });

      it('should handle empty system prompt', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          }),
        });

        await chatCompletion(mockMessages, '');

        const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
        // Should not include system message when empty
        expect(callBody.messages).toEqual(mockMessages);
      });
    });

    describe('with Ollama provider', () => {
      beforeEach(() => {
        delete process.env.AZURE_OPENAI_ENDPOINT;
        delete process.env.AZURE_OPENAI_API_KEY;
        process.env.OLLAMA_URL = 'http://localhost:11434';
        process.env.OLLAMA_MODEL = 'llama3.2';
      });

      it('should throw when Ollama is not running', async () => {
        // isOllamaAvailable returns false
        global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

        await expect(chatCompletion(mockMessages, mockSystemPrompt)).rejects.toThrow(
          'Ollama is not running',
        );
      });

      it('should throw when model is not available', async () => {
        // First call (isOllamaAvailable) succeeds
        // Second call (isOllamaModelAvailable) returns empty models
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce({ ok: true }) // isOllamaAvailable
          .mockResolvedValueOnce({
            // isOllamaModelAvailable
            ok: true,
            json: async () => ({ models: [] }),
          });

        await expect(chatCompletion(mockMessages, mockSystemPrompt)).rejects.toThrow(
          'Ollama model "llama3.2" not found',
        );
      });

      it('should call Ollama API and return response', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce({ ok: true }) // isOllamaAvailable
          .mockResolvedValueOnce({
            // isOllamaModelAvailable
            ok: true,
            json: async () => ({ models: [{ name: 'llama3.2:latest' }] }),
          })
          .mockResolvedValueOnce({
            // actual chat completion
            ok: true,
            json: async () => ({
              choices: [
                {
                  message: { content: 'Hello from Ollama!' },
                  finish_reason: 'stop',
                },
              ],
            }),
          });

        const result = await chatCompletion(mockMessages, mockSystemPrompt);

        expect(result).toEqual({
          content: 'Hello from Ollama!',
          provider: 'ollama',
          model: 'llama3.2',
          usage: undefined,
          tool_calls: undefined,
          finish_reason: 'stop',
        });
      });

      it('should handle Ollama API errors', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce({ ok: true }) // isOllamaAvailable
          .mockResolvedValueOnce({
            // isOllamaModelAvailable
            ok: true,
            json: async () => ({ models: [{ name: 'llama3.2:latest' }] }),
          })
          .mockResolvedValueOnce({
            // actual chat completion fails
            ok: false,
            text: async () => 'Internal server error',
          });

        await expect(chatCompletion(mockMessages, mockSystemPrompt)).rejects.toThrow(
          'Ollama error: Internal server error',
        );
      });
    });
  });

  // ============================================================================
  // getProviderStatus
  // ============================================================================
  describe('getProviderStatus', () => {
    it('should return Azure status when Azure is configured', async () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
      process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = 'gpt-5-mini';
      process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://realtime.openai.azure.com';
      process.env.AZURE_OPENAI_REALTIME_API_KEY = 'realtime-key';
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'gpt-4o-realtime-preview';

      const result = await getProviderStatus();

      expect(result).toEqual({
        chat: {
          available: true,
          provider: 'azure',
          model: 'gpt-5-mini',
        },
        voice: {
          available: true,
          provider: 'azure',
        },
      });
    });

    it('should return Ollama status when Ollama is available', async () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      delete process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
      delete process.env.AZURE_OPENAI_REALTIME_API_KEY;
      delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;
      process.env.OLLAMA_MODEL = 'llama3.2';

      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await getProviderStatus();

      expect(result).toEqual({
        chat: {
          available: true,
          provider: 'ollama',
          model: 'llama3.2',
        },
        voice: {
          available: false,
          provider: null,
        },
      });
    });

    it('should return unavailable status when Ollama is not running', async () => {
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      delete process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
      delete process.env.AZURE_OPENAI_REALTIME_API_KEY;
      delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await getProviderStatus();

      expect(result.chat.available).toBe(false);
      expect(result.chat.provider).toBe('ollama');
    });

    it('should return voice unavailable when realtime not configured', async () => {
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'my-api-key';
      delete process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
      delete process.env.AZURE_OPENAI_REALTIME_API_KEY;
      delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

      const result = await getProviderStatus();

      expect(result.voice).toEqual({
        available: false,
        provider: null,
      });
    });
  });
});
