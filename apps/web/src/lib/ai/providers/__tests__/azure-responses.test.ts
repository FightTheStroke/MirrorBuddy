import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { azureChatCompletion, azureCircuitBreaker } from '../azure';
import { forgetTemperatureRefusals } from '../temperature-support';
import type { ProviderConfig, ToolDefinition } from '../types';

const config: ProviderConfig = {
  provider: 'azure',
  endpoint: 'https://test.openai.azure.com',
  apiKey: 'test-key',
  model: 'mb-gpt-61-sol',
};
const messages = [{ role: 'user', content: 'Hello' }];
const tools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'quiz',
      description: 'Create a quiz',
      parameters: { type: 'object', properties: { subject: { type: 'string' } } },
    },
  },
];
const completion = {
  status: 'completed',
  output: [
    {
      type: 'message',
      content: [
        { type: 'output_text', text: 'First' },
        { type: 'output_text', text: ' second' },
      ],
    },
  ],
  usage: { input_tokens: 20, output_tokens: 5, total_tokens: 25 },
};

function respond(data: unknown, status = 200): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status })));
}

function call(toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }) {
  return azureChatCompletion(config, messages, 'System', 0.7, 128, tools, toolChoice);
}

function request() {
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  return { url, options, body: JSON.parse(String(options?.body)) };
}

describe('Azure Responses tool compatibility', () => {
  beforeEach(() => {
    azureCircuitBreaker.reset();
    forgetTemperatureRefusals();
    vi.stubEnv('AZURE_OPENAI_CHAT_DEPLOYMENT', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('routes current-model tools to stateless Responses without changing their optional schema', async () => {
    respond(completion);

    const result = await call();
    const { url, options, body } = request();

    expect(url).toBe('https://test.openai.azure.com/openai/v1/responses');
    expect(options?.headers).toMatchObject({ 'api-key': 'test-key' });
    expect(body).toEqual({
      model: config.model,
      input: [{ role: 'system', content: 'System' }, ...messages],
      store: false,
      max_output_tokens: 128,
      tools: [{ type: 'function', ...tools[0].function, strict: false }],
      tool_choice: 'auto',
    });
    expect(result).toEqual({
      provider: 'azure',
      model: config.model,
      content: 'First second',
      finish_reason: 'stop',
      usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maps function call IDs and arguments to the existing tool executor contract', async () => {
    respond({
      ...completion,
      output: [
        { type: 'reasoning', summary: [] },
        {
          type: 'function_call',
          id: 'item-id',
          call_id: 'call-id',
          name: 'quiz',
          arguments: '{"subject":"math"}',
        },
      ],
    });

    expect(await call()).toMatchObject({
      content: '',
      finish_reason: 'tool_calls',
      tool_calls: [
        {
          id: 'call-id',
          type: 'function',
          function: { name: 'quiz', arguments: '{"subject":"math"}' },
        },
      ],
    });
  });

  it.each(['auto', 'none'] as const)('preserves %s tool choice', async (choice) => {
    respond(completion);
    await call(choice);
    expect(request().body.tool_choice).toBe(choice);
  });

  it('flattens a forced function choice', async () => {
    respond(completion);
    await call({ type: 'function', function: { name: 'quiz' } });
    expect(request().body.tool_choice).toEqual({ type: 'function', name: 'quiz' });
  });

  it('supports the logical model name without a system message', async () => {
    respond(completion);
    await azureChatCompletion({ ...config, model: 'gpt-6.1-sol' }, messages, '', 0.7, 128, tools);
    expect(request().body.input).toEqual(messages);
  });

  it.each([undefined, []])('keeps tool-free requests on Chat Completions', async (noTools) => {
    respond({ choices: [{ message: { content: 'Legacy' }, finish_reason: 'stop' }] });
    const result = await azureChatCompletion(config, messages, 'System', 0.7, 128, noTools);
    expect(String(request().url)).toContain('/chat/completions?api-version=');
    expect(result.content).toBe('Legacy');
  });

  it('keeps other deployments on the existing compatibility path', async () => {
    respond({ choices: [{ message: { content: 'Legacy' }, finish_reason: 'stop' }] });
    await azureChatCompletion({ ...config, model: 'gpt-4' }, messages, 'System', 0.7, 128, tools);
    expect(String(request().url)).toContain('/deployments/gpt-4/chat/completions?api-version=');
    expect(request().body.tools).toEqual(tools);
  });

  it('preserves an exhausted output budget as length rather than successful completion', async () => {
    respond({
      ...completion,
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
    });
    expect(await call()).toMatchObject({ finish_reason: 'length' });
  });

  it('preserves the existing content-filter result on HTTP rejection', async () => {
    respond({ error: { code: 'content_filter', message: 'private prompt' } }, 400);
    expect(await call()).toMatchObject({ finish_reason: 'content_filter', contentFiltered: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...completion, status: 'incomplete', incomplete_details: { reason: 'content_filter' } },
    {
      ...completion,
      output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'private text' }] }],
    },
  ])('maps in-response safety refusals without returning their raw text', async (data) => {
    respond(data);
    const result = await call();
    expect(result).toMatchObject({ finish_reason: 'content_filter', contentFiltered: true });
    expect(result.content).not.toContain('private text');
  });

  it('keeps upstream errors redacted and does not retry a bad request', async () => {
    respond({ error: { code: 'invalid_request_error', message: 'private student homework' } }, 400);
    await expect(call()).rejects.toThrow('Azure OpenAI error (400) [bad_request]');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    {},
    { ...completion, output: [] },
    { ...completion, status: 'failed', error: { message: 'private text' } },
    { ...completion, output: [{ type: 'function_call', name: 'quiz', arguments: '{}' }] },
    { ...completion, output: [{ type: 'message', content: null }] },
    { ...completion, usage: { input_tokens: -1, output_tokens: 2, total_tokens: 1 } },
  ])(
    'rejects malformed or failed responses instead of fabricating an empty answer',
    async (data) => {
      respond(data);
      await expect(call()).rejects.toThrow('Azure Responses returned an invalid completion');
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
});
