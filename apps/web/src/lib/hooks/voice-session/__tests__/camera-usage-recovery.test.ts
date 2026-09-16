import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCameraUsage, type CameraUsageRefs } from '../use-camera-usage';

const { csrfFetch } = vi.hoisted(() => ({ csrfFetch: vi.fn() }));
vi.mock('@/lib/auth', () => ({ csrfFetch }));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { error: vi.fn() },
}));

describe('failed camera finalization recovery', () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([0, 23])(
    'finalizes the retained reservation with %s seconds before retrying start',
    async (seconds) => {
      csrfFetch
        .mockResolvedValueOnce(Response.json({ id: 'usage-a', maxSeconds: 60 }))
        .mockResolvedValueOnce(Response.json({}, { status: 503 }))
        .mockResolvedValueOnce(Response.json({}))
        .mockResolvedValueOnce(Response.json({ id: 'usage-b', maxSeconds: 60 }));
      const refs: CameraUsageRefs = {
        sessionIdRef: { current: 'voice' },
        videoUsageIdRef: { current: null },
        videoMaxSecondsRef: { current: 60 },
      };
      const { result } = renderHook(() => useCameraUsage(refs));
      await act(async () => result.current.startVideoUsage());
      await act(async () => result.current.endUsageSession(seconds));
      expect(refs.videoUsageIdRef.current).toBe('usage-a');

      await act(async () => expect(result.current.startVideoUsage()).resolves.toBe(true));

      const requests = csrfFetch.mock.calls.map(([, options]) => JSON.parse(options.body));
      expect(requests.map((request) => request.action)).toEqual(['start', 'end', 'end', 'start']);
      expect(requests[2]).toEqual({ action: 'end', usageId: 'usage-a', secondsUsed: seconds });
      expect(refs.videoUsageIdRef.current).toBe('usage-b');
    },
  );

  it('does not allocate another reservation while finalization is still failing', async () => {
    csrfFetch
      .mockResolvedValueOnce(Response.json({ id: 'usage-a', maxSeconds: 60 }))
      .mockImplementation(async () => Response.json({}, { status: 503 }));
    const refs: CameraUsageRefs = {
      sessionIdRef: { current: 'voice' },
      videoUsageIdRef: { current: null },
      videoMaxSecondsRef: { current: 60 },
    };
    const { result } = renderHook(() => useCameraUsage(refs));
    await act(async () => result.current.startVideoUsage());
    await act(async () => result.current.endUsageSession(0));

    await act(async () => expect(result.current.startVideoUsage()).resolves.toBe(false));

    const requests = csrfFetch.mock.calls.map(([, options]) => JSON.parse(options.body));
    expect(requests.map((request) => request.action)).toEqual(['start', 'end', 'end']);
    expect(refs.videoUsageIdRef.current).toBe('usage-a');
  });
});
