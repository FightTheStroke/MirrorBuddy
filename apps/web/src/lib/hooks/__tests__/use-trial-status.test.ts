import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { setClientIdentity } from '@/lib/auth';
import { useTrialStatus } from '../use-trial-status';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/telemetry/trial-events', () => ({ trackTrialStart: track }));
const session = {
  sessionId: 'visitor-valid',
  chatsUsed: 3,
  chatsRemaining: 7,
  maxChats: 10,
  voiceSecondsUsed: 120,
  voiceSecondsRemaining: 180,
  maxVoiceSeconds: 300,
  toolsUsed: 2,
  toolsRemaining: 8,
  maxTools: 10,
};
const account = {
  status: 'authenticated' as const,
  userId: 'account',
  role: 'USER' as const,
  legacyOrigin: false,
  needsLegacyUpgrade: false,
};
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.clearAllMocks();
  setClientIdentity(account);
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useTrialStatus authoritative separation', () => {
  it('starts with pending identity and does not issue trial requests', () => {
    setClientIdentity({ status: 'pending' });
    const { result } = renderHook(() => useTrialStatus());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isTrialMode).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('authenticated credential-bearing users are not trial', async () => {
    fetchMock.mockResolvedValue(Response.json({ isTrialUser: false }));
    const { result } = renderHook(() => useTrialStatus());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isTrialMode).toBe(false);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/user/trial-status');
    expect(track).not.toHaveBeenCalled();
  });
  it('authenticated credentialless users keep real trial quotas', async () => {
    fetchMock.mockImplementation(async (url) =>
      Response.json(url === '/api/user/trial-status' ? { isTrialUser: true } : session),
    );
    const { result } = renderHook(() => useTrialStatus());
    await waitFor(() => expect(result.current.isTrialMode).toBe(true));
    expect(result.current).toMatchObject({ ...session, visitorId: session.sessionId });
    expect(track).toHaveBeenCalledExactlyOnceWith(session.sessionId);
  });
  it('confirmed anonymous visitors use the actual trial session, not the account API', async () => {
    setClientIdentity({ status: 'anonymous' });
    fetchMock.mockResolvedValue(Response.json(session));
    const { result } = renderHook(() => useTrialStatus());
    await waitFor(() => expect(result.current.isTrialMode).toBe(true));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/trial/session');
  });
  it.each([401, 503])('account status HTTP %s never falls through to trial', async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));
    const { result } = renderHook(() => useTrialStatus());
    await waitFor(() => expect(result.current.error).toBe('TRIAL_STATUS_UNAVAILABLE'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isTrialMode).toBe(false);
    expect(result.current.chatsRemaining).toBe(0);
  });
  it('network failure does not mint default quotas', async () => {
    fetchMock.mockRejectedValue(new TypeError('Offline'));
    const { result } = renderHook(() => useTrialStatus());
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.toolsRemaining).toBe(0);
    expect(track).not.toHaveBeenCalled();
  });
  it.each([{}, { ...session, sessionId: undefined }, { sessionId: 'partial', chatsUsed: 5 }])(
    'malformed trial response is unavailable rather than fabricated success',
    async (data) => {
      setClientIdentity({ status: 'anonymous' });
      fetchMock.mockResolvedValue(Response.json(data));
      const { result } = renderHook(() => useTrialStatus());
      await waitFor(() => expect(result.current.error).toBeTruthy());
      expect(result.current.visitorId).toBeUndefined();
      expect(result.current.isTrialMode).toBe(false);
      expect(track).not.toHaveBeenCalled();
    },
  );
  it('revocation/unavailability hides old trial data and sends no new request', async () => {
    setClientIdentity({ status: 'anonymous' });
    fetchMock.mockResolvedValue(Response.json(session));
    const { result } = renderHook(() => useTrialStatus());
    await waitFor(() => expect(result.current.isTrialMode).toBe(true));
    act(() => setClientIdentity({ status: 'unavailable', reason: 'SESSION_REJECTED' }));
    expect(result.current.error).toBe('SESSION_REJECTED');
    expect(result.current.visitorId).toBeUndefined();
    expect(result.current.isTrialMode).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
