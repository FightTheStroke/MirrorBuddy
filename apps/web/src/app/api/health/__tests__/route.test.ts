/**
 * The health check must not go looking for a process that cannot be there.
 *
 * When Azure was unconfigured this route probed `http://localhost:11434` — the
 * Ollama default — even on Vercel, where localhost is the function itself and
 * nothing has ever listened on that port. The probe could only time out: up to
 * two seconds spent per health check to learn a fact already on record, and a
 * verdict ("No AI provider configured or available") that reads like an outage
 * when the truth is that Ollama was never part of this deployment.
 *
 * These tests pin the distinction the route now makes: an unset OLLAMA_URL is an
 * answer, not a URL to guess at.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]) },
}));

vi.mock('@/lib/version', () => ({ getAppVersion: () => '0.0.0-test' }));

vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._m: Array<unknown>) =>
    (handler: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) =>
      handler(...args),
  withSentry: () => async (_ctx: unknown, next: () => Promise<Response>) => next(),
}));

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = global.fetch;

const loadRoute = async () => {
  vi.resetModules();
  return import('../route');
};

describe('/api/health - AI provider check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.OLLAMA_URL;
    // These tests are about production behaviour: the test-env escape hatch
    // would mask exactly the branch under examination.
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.CI;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    global.fetch = ORIGINAL_FETCH;
  });

  it('does not touch the network when neither Azure nor Ollama is configured', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/health') as never);
    const body = await response.json();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(body.checks.ai_provider.status).toBe('fail');
    expect(body.checks.ai_provider.message).toBe('No AI provider configured');
  });

  it('never probes localhost:11434 by default', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;

    const { GET } = await loadRoute();
    await GET(new Request('http://localhost/api/health') as never);

    const probed = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(probed.some((u) => u.includes('11434'))).toBe(false);
  });

  it('probes Ollama only when OLLAMA_URL declares it', async () => {
    process.env.OLLAMA_URL = 'http://ollama.internal:11434';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/health') as never);
    const body = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://ollama.internal:11434/api/tags',
      expect.any(Object),
    );
    expect(body.checks.ai_provider.status).toBe('pass');
  });

  it('says Ollama is unreachable, not that no provider was configured', async () => {
    process.env.OLLAMA_URL = 'http://ollama.internal:11434';
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout')) as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/health') as never);
    const body = await response.json();

    expect(body.checks.ai_provider.status).toBe('fail');
    expect(body.checks.ai_provider.message).toBe('Ollama configured but unreachable');
  });

  it('short-circuits on Azure without any probe', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://azure.example.com';
    process.env.AZURE_OPENAI_API_KEY = 'k';
    process.env.OLLAMA_URL = 'http://ollama.internal:11434';
    const mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;

    const { GET } = await loadRoute();
    const response = await GET(new Request('http://localhost/api/health') as never);
    const body = await response.json();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(body.checks.ai_provider.message).toBe('Azure OpenAI configured');
  });
});
