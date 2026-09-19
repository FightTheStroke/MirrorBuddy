import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHandleServerEvent } from '../event-handlers';
import { created, done, makeDeps } from './usage-event-fixture';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));
vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
import { csrfFetch } from '@/lib/auth';
import { clientLogger } from '@/lib/logger/client';
const calls = () =>
  vi
    .mocked(csrfFetch)
    .mock.calls.filter(([url]) => String(url).includes('/api/metrics/voice-usage'));
const flush = () => act(async () => {});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(csrfFetch).mockImplementation(async () => new Response('{"success":true}'));
});

describe('real handler and reporter internal usage identity', () => {
  it('preserves two output items but submits one response', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created());
    for (const transcript of ['First sentence.', 'Second sentence.'])
      result.current({ type: 'response.output_audio_transcript.done', transcript });
    result.current(done('resp_1'));
    expect(vi.mocked(deps.addTranscript).mock.calls.map(([, text]) => text)).toEqual([
      'First sentence.',
      'Second sentence.',
    ]);
    expect(calls()).toHaveLength(1);
    expect(deps.hasActiveResponseRef.current).toBe(false);
  });
  it('submits an identical response.done only once', () => {
    const { result } = renderHook(() => useHandleServerEvent(makeDeps()));
    result.current(created());
    result.current(done('resp_dup'));
    result.current(done('resp_dup'));
    expect(calls()).toHaveLength(1);
  });
  it('does not submit a delayed old response again or end the newer turn', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp_a'));
    result.current(done('resp_a'));
    await flush();
    result.current(created('resp_b'));
    result.current(done('resp_a'));
    expect(deps.hasActiveResponseRef.current).toBe(true);
    result.current(done('resp_b'));
    expect(calls()).toHaveLength(2);
  });
  it('does not report a cancelled response', () => {
    const { result } = renderHook(() => useHandleServerEvent(makeDeps()));
    result.current(created('resp_cancel'));
    result.current({ type: 'response.cancelled', response: { id: 'resp_cancel' } });
    expect(calls()).toHaveLength(0);
  });
  it('does not end the identified current response for an unidentifiable cancellation', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-current'));
    result.current({ type: 'response.cancelled', response: { id: null } });
    expect(deps.hasActiveResponseRef.current).toBe(true);
    expect(calls()).toHaveLength(0);
    result.current(done('resp-current'));
    expect(calls()).toHaveLength(1);
  });
  it('retries a failed request with the original response and keeps failure visible', async () => {
    const failure = new Error('Offline');
    vi.mocked(csrfFetch).mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useHandleServerEvent(makeDeps()));
    result.current(created('resp-retry'));
    result.current(done('resp-retry'));
    await flush();
    expect(clientLogger.error).toHaveBeenCalledWith(
      '[VoiceUsage] Could not report usage',
      undefined,
      failure,
    );
    result.current(done('resp-retry'));
    await flush();
    result.current(done('resp-retry'));
    expect(calls()).toHaveLength(2);
    expect(calls()[0][1]?.body).toBe(calls()[1][1]?.body);
    expect(JSON.parse(String(calls()[1][1]?.body)).responseId).toBe('resp-retry');
  });
  it('does not permanently acknowledge a failed HTTP response', async () => {
    vi.mocked(csrfFetch).mockResolvedValueOnce(
      new Response('{"error":"unavailable"}', { status: 503 }),
    );
    const { result } = renderHook(() => useHandleServerEvent(makeDeps()));
    result.current(created('resp-http'));
    result.current(done('resp-http'));
    await flush();
    result.current(done('resp-http'));
    await flush();
    expect(calls()).toHaveLength(2);
  });
  it('preserves the original session when an old event arrives after reconnect', async () => {
    const deps = makeDeps();
    const { result, rerender } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-old'));
    result.current(done('resp-old'));
    await flush();
    deps.sessionIdRef.current = 'voice-new-session';
    rerender();
    result.current(created());
    result.current(done('resp-old'));
    expect(deps.hasActiveResponseRef.current).toBe(true);
    result.current(done('resp-new'));
    await flush();
    const bodies = calls().map(([, options]) => JSON.parse(String(options?.body)));
    expect(bodies.map((item) => [item.sessionId, item.responseId])).toEqual([
      ['sess-c6', 'resp-old'],
      ['voice-new-session', 'resp-new'],
    ]);
  });
  it('counts the same provider ID separately when explicitly created in a new session', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-1'));
    result.current(done('resp-1'));
    await flush();
    deps.sessionIdRef.current = 'voice-second';
    result.current(created('resp-1'));
    result.current(done('resp-1'));
    await flush();
    expect(calls()).toHaveLength(2);
  });
  it('can replay after a real hook remount using the same durable identity', async () => {
    const first = renderHook(() => useHandleServerEvent(makeDeps()));
    first.result.current(created('resp-remount'));
    first.result.current(done('resp-remount'));
    await flush();
    first.unmount();
    const second = renderHook(() => useHandleServerEvent(makeDeps()));
    second.result.current(created('resp-remount'));
    second.result.current(done('resp-remount'));
    await flush();
    expect(calls()).toHaveLength(2);
    expect(calls()[0][1]?.body).toBe(calls()[1][1]?.body);
  });
  it.each([null, undefined, '', 42, 'x'.repeat(201)])(
    'does not attribute invalid terminal ID %s to an active response',
    (id) => {
      const deps = makeDeps();
      const { result } = renderHook(() => useHandleServerEvent(deps));
      result.current(created('resp-current'));
      result.current({ ...done('unused'), response: { ...done('unused').response, id } });
      expect(calls()).toHaveLength(0);
      expect(deps.hasActiveResponseRef.current).toBe(true);
      result.current(done('resp-current'));
      expect(calls()).toHaveLength(1);
    },
  );
  it('rejects null events without crashing the conversation', () => {
    const { result } = renderHook(() => useHandleServerEvent(makeDeps()));
    expect(() => {
      result.current(null);
      result.current(undefined);
    }).not.toThrow();
    expect(calls()).toHaveLength(0);
  });
  it('still accounts real usage if a cancelled response later supplies its final usage', async () => {
    const { result } = renderHook(() => useHandleServerEvent(makeDeps()));
    result.current(created('resp-cancel'));
    result.current({ type: 'response.cancelled', response: { id: 'resp-cancel' } });
    expect(calls()).toHaveLength(0);
    result.current({
      ...done('resp-cancel'),
      response: { ...done('resp-cancel').response, status: 'cancelled' },
    });
    await flush();
    result.current(done('resp-cancel'));
    expect(calls()).toHaveLength(1);
  });
});
