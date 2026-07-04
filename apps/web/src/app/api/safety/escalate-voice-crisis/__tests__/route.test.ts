/**
 * @vitest-environment node
 *
 * T1.1/D-01: the voice path must escalate a detected crisis with the same
 * compliance record + parent notification the non-streaming chat path gets.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (
      ...middlewares: Array<
        (
          handler: (ctx: { req: NextRequest }) => Promise<Response>,
        ) => (ctx: { req: NextRequest }) => Promise<Response>
      >
    ) =>
    (handler: (ctx: { req: NextRequest }) => Promise<Response>) => {
      const wrapped = middlewares.reduceRight((acc, mw) => mw(acc), handler);
      return (req: NextRequest) => wrapped({ req });
    },
  withSentry: vi.fn(() => (handler: (ctx: { req: NextRequest }) => Promise<Response>) => handler),
}));

vi.mock('@/lib/auth/server', () => ({
  validateAuth: vi.fn(),
}));

vi.mock('@/lib/i18n/locale-detection', () => ({
  detectLocaleFromNextRequest: vi.fn(() => 'it'),
}));

vi.mock('@/lib/safety/server', () => ({
  logSafetyEvent: vi.fn().mockResolvedValue(undefined),
  recordComplianceCrisisDetected: vi.fn().mockResolvedValue(undefined),
  escalateCrisisDetected: vi.fn().mockResolvedValue(undefined),
  notifyParentOfCrisis: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '../route';
import { validateAuth } from '@/lib/auth/server';
import {
  logSafetyEvent,
  recordComplianceCrisisDetected,
  escalateCrisisDetected,
  notifyParentOfCrisis,
} from '@/lib/safety/server';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/safety/escalate-voice-crisis', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/safety/escalate-voice-crisis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request with no sessionId', async () => {
    vi.mocked(validateAuth).mockResolvedValue({ authenticated: false } as never);

    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it('authenticated user: escalates + notifies the parent, keyed to the real userId', async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: 'user-123',
    } as never);

    const response = await POST(
      makeRequest({ sessionId: 'voice-sess-1', maestroId: 'euclide', contentSnippet: 'aiuto' }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Side effects run via after(); in the test env after() throws (no
    // request-scoped execution context) so the route falls back to
    // fire-and-forget — await a microtask so the .catch()-wrapped calls land.
    await vi.waitFor(() => {
      expect(vi.mocked(logSafetyEvent)).toHaveBeenCalledWith(
        'crisis_detected',
        'critical',
        expect.objectContaining({ userId: 'user-123', sessionId: 'voice-sess-1' }),
      );
    });
    expect(vi.mocked(recordComplianceCrisisDetected)).toHaveBeenCalledWith(
      'crisis_detected',
      expect.objectContaining({ sessionId: 'voice-sess-1', maestroId: 'euclide' }),
    );
    expect(vi.mocked(escalateCrisisDetected)).toHaveBeenCalledWith(
      'user-123',
      'voice-sess-1',
      expect.objectContaining({ maestroId: 'euclide' }),
    );
    expect(vi.mocked(notifyParentOfCrisis)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123', category: 'crisis', severity: 'critical' }),
    );
  });

  it('anonymous (Trial) session: escalates as "anonymous", skips parent notification', async () => {
    vi.mocked(validateAuth).mockResolvedValue({ authenticated: false } as never);

    const response = await POST(makeRequest({ sessionId: 'voice-sess-anon' }));
    expect(response.status).toBe(200);

    await vi.waitFor(() => {
      expect(vi.mocked(escalateCrisisDetected)).toHaveBeenCalledWith(
        'anonymous',
        'voice-sess-anon',
        expect.anything(),
      );
    });
    expect(vi.mocked(notifyParentOfCrisis)).not.toHaveBeenCalled();
  });

  it('never persists more than a 50-char content snippet (GDPR Art. 25)', async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: 'user-123',
    } as never);
    const longContent = 'x'.repeat(500);

    await POST(makeRequest({ sessionId: 'voice-sess-2', contentSnippet: longContent }));

    await vi.waitFor(() => {
      expect(vi.mocked(logSafetyEvent)).toHaveBeenCalledWith(
        'crisis_detected',
        'critical',
        expect.objectContaining({ contentSnippet: 'x'.repeat(50) }),
      );
    });
  });
});
