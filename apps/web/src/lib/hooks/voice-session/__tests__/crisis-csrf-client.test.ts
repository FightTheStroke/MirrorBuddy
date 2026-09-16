import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCSRFToken } from '@/lib/auth';
import { triggerSafetyIntervention } from '../safety-intervention';
import { clientLogger } from '@/lib/logger/client';

vi.mock('@/lib/feature-flags/client', () => ({
  isFeatureEnabled: () => ({ enabled: true }),
}));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function trigger() {
  const warning = vi.fn();
  triggerSafetyIntervention({
    sessionId: 'voice-1',
    maestroId: 'austen',
    dataChannel: null,
    setWarningState: warning,
    safetyResult: {
      actionTaken: 'escalate',
      severity: 'critical',
      flaggedPatterns: ['crisis'],
      checkDurationMs: 1,
    },
  });
  expect(warning).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
}

describe('crisis reporting CSRF transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCSRFToken();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('bootstraps anonymous CSRF and refreshes a rejected token without losing the crisis', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ csrfToken: 'old-token' }))
      .mockResolvedValueOnce(json({ error: 'Invalid CSRF token' }, 403))
      .mockResolvedValueOnce(json({ csrfToken: 'new-token' }))
      .mockResolvedValueOnce(json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    trigger();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const first = fetchMock.mock.calls[1][1] as RequestInit;
    const retry = fetchMock.mock.calls[3][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe('/api/session');
    expect(new Headers(retry.headers).get('X-CSRF-Token')).toBe('new-token');
    expect(retry.body).toBe(first.body);
    expect(retry).toMatchObject({ credentials: 'include', keepalive: true });
    expect(clientLogger.error).not.toHaveBeenCalled();
  });

  it('reports HTTP failures instead of treating a rejected crisis as success', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json({ csrfToken: 'token' }))
        .mockResolvedValueOnce(json({ error: 'Unavailable' }, 503)),
    );
    trigger();
    await vi.waitFor(() =>
      expect(clientLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Crisis escalation request failed'),
        expect.objectContaining({ error: 'Crisis escalation failed (503)' }),
      ),
    );
  });

  it('surfaces token bootstrap failure without blocking the local crisis intervention', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')));
    trigger();
    await vi.waitFor(() =>
      expect(clientLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Crisis escalation request failed'),
        expect.objectContaining({ error: 'Network unavailable' }),
      ),
    );
  });
});
