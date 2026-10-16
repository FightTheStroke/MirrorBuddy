import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { azureChatCompletion, azureCircuitBreaker } from '../azure';
import type { ProviderConfig, ToolDefinition } from '../types';

const config: ProviderConfig = {
  provider: 'azure',
  endpoint: 'https://test.openai.azure.com/',
  apiKey: 'test-key',
  model: 'mb-gpt-61-sol',
};
const tools: ToolDefinition[] = [
  {
    type: 'function',
    function: { name: 'ping', description: 'Test', parameters: { type: 'object', properties: {} } },
  },
];
const messages = [{ role: 'user', content: 'Hello' }];
const completion = {
  status: 'completed',
  output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }],
};
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const call = (override: ProviderConfig = config) =>
  azureChatCompletion(override, messages, 'System', 0.7, 128, tools);

describe('Azure Responses resilience and failure handling', () => {
  beforeEach(() => {
    azureCircuitBreaker.reset();
    vi.stubEnv('AZURE_OPENAI_CHAT_DEPLOYMENT', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('retains retry and circuit-breaker handling for a transient service error', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response({ error: { code: 'server_error' } }, 502))
        .mockResolvedValueOnce(response(completion)),
    );

    const pending = call();
    await vi.runAllTimersAsync();

    expect(await pending).toMatchObject({ content: 'OK', finish_reason: 'stop' });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(azureCircuitBreaker.getState()).toBe('CLOSED');
  });

  it('bounds persistent rate-limit retries using the existing policy', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(response({ error: { code: 'rate_limit_exceeded' } }, 429)),
        ),
    );

    const pending = expect(call()).rejects.toThrow('Azure OpenAI error (429) [rate_limit]');
    await vi.runAllTimersAsync();
    await pending;

    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('does not replay authentication failures or leak upstream prompt text', async () => {
    const logged = vi.spyOn(logger, 'error');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(
          {
            error: { code: 'invalid_api_key', message: 'student-private-text' },
          },
          401,
        ),
      ),
    );

    await expect(call()).rejects.toThrow('Azure OpenAI error (401) [auth]');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logged.mock.calls)).not.toContain('student-private-text');
  });

  it('rejects malformed JSON without logging or propagating the response body', async () => {
    const logged = vi.spyOn(logger, 'error');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('student-private-text')));

    await expect(call()).rejects.toThrow('Azure Responses returned an invalid completion');
    expect(JSON.stringify(logged.mock.calls)).not.toContain('student-private-text');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not execute a function whose arguments were cut off by the output limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          status: 'incomplete',
          incomplete_details: { reason: 'max_output_tokens' },
          output: [
            { type: 'function_call', call_id: 'call-id', name: 'ping', arguments: '{"partial":' },
          ],
        }),
      ),
    );

    const result = await call();
    expect(result.finish_reason).toBe('length');
    expect(result.tool_calls).toBeUndefined();
  });

  it('retains content-filter categories and does not expose partial text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(
          {
            error: {
              code: 'content_filter',
              message: 'student-private-text',
              innererror: {
                content_filter_result: { hate: { filtered: true }, violence: { filtered: false } },
              },
            },
          },
          400,
        ),
      ),
    );

    expect(await call()).toMatchObject({
      contentFiltered: true,
      finish_reason: 'content_filter',
      filteredCategories: ['hate'],
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses Responses when a legacy deployment falls back to the current model', async () => {
    vi.stubEnv('AZURE_OPENAI_CHAT_DEPLOYMENT', 'mb-gpt-61-sol');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response({ error: { code: 'DeploymentNotFound' } }, 404))
        .mockResolvedValueOnce(response(completion)),
    );

    expect(await call({ ...config, model: 'retired-deployment' })).toMatchObject({
      content: 'OK',
      model: 'mb-gpt-61-sol',
    });
    const [url, options] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe('https://test.openai.azure.com/openai/v1/responses');
    expect(JSON.parse(String(options?.body)).model).toBe('mb-gpt-61-sol');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('supports a configured custom name for the current-model deployment', async () => {
    vi.stubEnv('AZURE_OPENAI_GPT61_SOL_DEPLOYMENT', 'custom-sol');
    vi.resetModules();
    const isolated = await import('../azure');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(completion)));

    await isolated.azureChatCompletion(
      { ...config, model: 'custom-sol' },
      messages,
      '',
      0.7,
      128,
      tools,
    );

    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/openai/v1/responses');
  });

  it('fails before sending a request when credentials are missing', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(call({ ...config, apiKey: undefined })).rejects.toThrow('requires an API key');
    expect(fetch).not.toHaveBeenCalled();
  });
});
