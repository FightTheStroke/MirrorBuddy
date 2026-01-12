/**
 * Ollama Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ollamaChatCompletion } from '../ollama';
import type { ProviderConfig, ToolDefinition } from '../types';

describe('ollamaChatCompletion', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const config: ProviderConfig = {
    provider: 'ollama',
    model: 'llama3.1',
    endpoint: 'http://localhost:11434',
  };

  const messages = [{ role: 'user', content: 'Hello' }];

  it('should make a request to Ollama API', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Hi there!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await ollamaChatCompletion(config, messages, 'You are helpful', 0.7);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(result.content).toBe('Hi there!');
    expect(result.provider).toBe('ollama');
    expect(result.model).toBe('llama3.1');
  });

  it('should include system prompt when provided', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await ollamaChatCompletion(config, messages, 'System prompt', 0.7);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'System prompt' });
  });

  it('should not include system message when systemPrompt is empty', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await ollamaChatCompletion(config, messages, '', 0.7);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.messages.length).toBe(1);
    expect(body.messages[0].role).toBe('user');
  });

  it('should include tools when provided', async () => {
    const tools: ToolDefinition[] = [
      {
        type: 'function',
        function: {
          name: 'test_function',
          description: 'A test function',
          parameters: { type: 'object', properties: {} },
        },
      },
    ];

    const mockResponse = {
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await ollamaChatCompletion(config, messages, 'System', 0.7, tools);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.tools).toEqual(tools);
    expect(body.tool_choice).toBe('auto');
  });

  it('should use provided tool_choice', async () => {
    const tools: ToolDefinition[] = [
      {
        type: 'function',
        function: {
          name: 'test_function',
          description: 'A test function',
          parameters: { type: 'object', properties: {} },
        },
      },
    ];

    const mockResponse = {
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await ollamaChatCompletion(config, messages, 'System', 0.7, tools, 'none');

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.tool_choice).toBe('none');
  });

  it('should throw error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('API Error'),
    });

    await expect(ollamaChatCompletion(config, messages, 'System', 0.7)).rejects.toThrow(
      'Ollama error: API Error'
    );
  });

  it('should return tool_calls from response', async () => {
    const mockToolCalls = [
      {
        id: 'call_123',
        type: 'function',
        function: { name: 'test_function', arguments: '{}' },
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: { content: '', tool_calls: mockToolCalls },
          finish_reason: 'tool_calls',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await ollamaChatCompletion(config, messages, 'System', 0.7);

    expect(result.tool_calls).toEqual(mockToolCalls);
    expect(result.finish_reason).toBe('tool_calls');
  });

  it('should handle empty content in response', async () => {
    const mockResponse = {
      choices: [{ message: {}, finish_reason: 'stop' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await ollamaChatCompletion(config, messages, 'System', 0.7);

    expect(result.content).toBe('');
  });

  it('should set temperature correctly', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await ollamaChatCompletion(config, messages, 'System', 0.3);

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.temperature).toBe(0.3);
    expect(body.stream).toBe(false);
  });
});
