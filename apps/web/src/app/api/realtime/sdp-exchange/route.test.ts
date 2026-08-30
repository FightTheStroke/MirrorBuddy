/**
 * Tests for the SDP relay route.
 *
 * These execute the handler. The previous version of this file read route.ts as
 * text and asserted on substrings, which passes whether or not the route works.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const checkRateLimitAsync = vi.fn();

vi.mock('@/lib/api/middlewares', () => ({
  pipe: () => (handler: (ctx: { req: Request }) => Promise<Response>) => (req: Request) =>
    handler({ req }),
  withSentry: () => {},
  withCSRF: () => {},
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: (...args: unknown[]) => checkRateLimitAsync(...args),
  getClientIdentifier: () => 'client-1',
  rateLimitResponse: () => new Response('rate limited', { status: 429 }),
}));

vi.mock('@/lib/tracing', () => ({
  getRequestId: () => 'req-1',
  getRequestLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const VALID_SDP = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n';
const VALID_TOKEN = 'ek_test_token';

function relayRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/realtime/sdp-exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/realtime/sdp-exchange', () => {
  const originalEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;

  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitAsync.mockResolvedValue({ success: true });
    process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://example.openai.azure.com';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('v=0\r\nanswer\r\n', {
          status: 200,
          headers: { 'Content-Type': 'application/sdp' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.AZURE_OPENAI_REALTIME_ENDPOINT = originalEndpoint;
  });

  it('relays the offer to Azure and returns the answer', async () => {
    const { POST } = await import('./route');

    const response = await POST(relayRequest({ sdp: VALID_SDP, token: VALID_TOKEN }));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('answer');
    expect(response.headers.get('X-Request-ID')).toBe('req-1');
  });

  it('keeps webrtcfilter off so tool calls survive the relay path', async () => {
    const { POST } = await import('./route');

    await POST(relayRequest({ sdp: VALID_SDP, token: VALID_TOKEN }));

    const [calledUrl] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledUrl).toContain('/openai/v1/realtime/calls');
    expect(calledUrl).toContain('webrtcfilter=off');
  });

  it('rejects an oversized body before parsing it', async () => {
    const { POST } = await import('./route');
    const request = relayRequest(
      { sdp: VALID_SDP, token: VALID_TOKEN },
      {
        'content-length': String(10 * 1024 * 1024),
      },
    );
    const jsonSpy = vi.spyOn(request, 'json');

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('uses a dedicated rate-limit bucket so a fallback storm stays contained', async () => {
    const { POST } = await import('./route');

    await POST(relayRequest({ sdp: VALID_SDP, token: VALID_TOKEN }));

    expect(checkRateLimitAsync).toHaveBeenCalledWith(
      'realtime-sdp-relay:client-1',
      expect.objectContaining({ maxRequests: 60 }),
    );
  });

  it('returns 429 without calling Azure when the bucket is empty', async () => {
    checkRateLimitAsync.mockResolvedValue({ success: false });
    const { POST } = await import('./route');

    const response = await POST(relayRequest({ sdp: VALID_SDP, token: VALID_TOKEN }));

    expect(response.status).toBe(429);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a body that is not a valid SDP offer', async () => {
    const { POST } = await import('./route');

    const response = await POST(relayRequest({ sdp: 'not-an-offer', token: VALID_TOKEN }));

    expect(response.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a token that is not an ephemeral key', async () => {
    const { POST } = await import('./route');

    const response = await POST(relayRequest({ sdp: VALID_SDP, token: 'sk-real-api-key' }));

    expect(response.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const { POST } = await import('./route');

    const response = await POST(relayRequest('{ not json'));

    expect(response.status).toBe(400);
  });

  it('never leaks the upstream error body to the student', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('invalid subscription key sk-secret-123', { status: 401 })),
    );
    const { POST } = await import('./route');

    const response = await POST(relayRequest({ sdp: VALID_SDP, token: VALID_TOKEN }));
    const payload = await response.text();

    expect(response.status).toBe(401);
    expect(payload).not.toContain('sk-secret-123');
  });

  it('reports a timeout as 504 rather than a generic failure', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));
    const { POST } = await import('./route');

    const response = await POST(relayRequest({ sdp: VALID_SDP, token: VALID_TOKEN }));

    expect(response.status).toBe(504);
  });

  it('returns 503 when the Azure endpoint is not configured', async () => {
    delete process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
    const { POST } = await import('./route');

    const response = await POST(relayRequest({ sdp: VALID_SDP, token: VALID_TOKEN }));

    expect(response.status).toBe(503);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
