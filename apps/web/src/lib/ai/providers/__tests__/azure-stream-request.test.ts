import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchStreamWithCompatibility } from '../azure-stream-request';

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

const UNSUPPORTED_TEMPERATURE = JSON.stringify({
  error: {
    message: "Unsupported value: 'temperature' does not support 0.7 with this model.",
    type: 'invalid_request_error',
    param: 'temperature',
    code: 'unsupported_value',
  },
});

const UNSUPPORTED_TOKEN_PARAM = JSON.stringify({
  error: { message: "Unsupported parameter: 'max_completion_tokens' is invalid" },
});

const DEPLOYMENT_NOT_FOUND = JSON.stringify({
  error: { code: 'DeploymentNotFound', message: 'DeploymentNotFound' },
});

function baseOptions(overrides: Record<string, unknown> = {}) {
  return {
    endpointUrl: (deployment: string) => `https://example.test/${deployment}`,
    apiKey: 'test-key',
    body: { messages: [{ role: 'user', content: 'hi' }], stream: true },
    temperature: 0.7,
    maxTokens: 100,
    deployment: 'gpt-5.6-terra',
    ...overrides,
  };
}

function failure(status: number, text: string) {
  return { ok: false, status, text: () => Promise.resolve(text) };
}

function success() {
  return { ok: true, status: 200, body: {} };
}

function bodyOf(call: unknown): Record<string, unknown> {
  const init = (call as [string, RequestInit])[1];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

function urlOf(call: unknown): string {
  return (call as [string, RequestInit])[0];
}

describe('fetchStreamWithCompatibility', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retries without temperature when the deployment only accepts the default', async () => {
    const responses = [failure(400, UNSUPPORTED_TEMPERATURE), success()];
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));

    const response = await fetchStreamWithCompatibility(baseOptions());

    expect(response.ok).toBe(true);
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(2);
    expect(bodyOf(calls[0])).toHaveProperty('temperature', 0.7);
    expect(bodyOf(calls[1])).not.toHaveProperty('temperature');
    expect(bodyOf(calls[1])).toHaveProperty('max_completion_tokens', 100);
  });

  it('keeps temperature dropped while falling back to the legacy token parameter', async () => {
    const responses = [
      failure(400, UNSUPPORTED_TEMPERATURE),
      failure(400, UNSUPPORTED_TOKEN_PARAM),
      success(),
    ];
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));

    const response = await fetchStreamWithCompatibility(baseOptions());

    expect(response.ok).toBe(true);
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(bodyOf(calls[2])).not.toHaveProperty('temperature');
    expect(bodyOf(calls[2])).toHaveProperty('max_tokens', 100);
  });

  it('falls back to the configured deployment when the primary is unknown', async () => {
    const responses = [failure(404, DEPLOYMENT_NOT_FOUND), success()];
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));

    const response = await fetchStreamWithCompatibility(
      baseOptions({ fallbackDeployment: 'gpt-5.6-sol' }),
    );

    expect(response.ok).toBe(true);
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(urlOf(calls[0])).toContain('gpt-5.6-terra');
    expect(urlOf(calls[1])).toContain('gpt-5.6-sol');
  });

  it('returns a replayable failure for errors it cannot work around', async () => {
    const contentFilter = JSON.stringify({ error: { code: 'content_filter' } });
    global.fetch = vi.fn().mockResolvedValue(failure(400, contentFilter));

    const response = await fetchStreamWithCompatibility(baseOptions());

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe(contentFilter);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});
