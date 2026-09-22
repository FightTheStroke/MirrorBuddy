import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, Probe, stream, readyFrameByDefault } from './camera-manager-test-utils';
import { logger } from '@/lib/logger';

const { requestStream, enumerate } = vi.hoisted(() => ({
  requestStream: vi.fn(),
  enumerate: vi.fn(),
}));
vi.mock('@/lib/native/media-bridge', () => ({
  requestVideoStream: requestStream,
  isMediaDevicesAvailable: () => true,
}));
vi.mock('../utils/camera-utils', () => ({ isMobile: () => false, enumerateCameras: enumerate }));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

const flush = () => act(async () => {});
const click = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await flush();
};
const state = (value: string) => expect(screen.getByTestId('state')).toHaveTextContent(value);

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  readyFrameByDefault();
  enumerate.mockResolvedValue([]);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => {
  cleanup();
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('camera attempt ownership', () => {
  it.each(['grant', 'reject'] as const)(
    'ignores stale %s after a newer success',
    async (outcome) => {
      const older = deferred<ReturnType<typeof stream>>();
      const orphan = stream('old');
      const current = stream('new');
      requestStream.mockReturnValueOnce(older.promise).mockResolvedValueOnce(current);
      const { unmount } = render(<Probe />);
      await click('Retry');
      state('ready');
      await act(async () => {
        if (outcome === 'grant') older.resolve(orphan);
        else older.reject(new Error('Late device failure'));
      });
      expect(orphan.getTracks()[0].stop).toHaveBeenCalledTimes(outcome === 'grant' ? 1 : 0);
      expect(current.getTracks()[0].stop).not.toHaveBeenCalled();
      expect(screen.getByTestId('label')).toHaveTextContent('new');
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
      expect(logger.error).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
      state('ready');
      unmount();
      expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
    },
  );

  it('expires acquisition and releases a late grant without starting playback', async () => {
    const pending = deferred<ReturnType<typeof stream>>();
    const late = stream();
    requestStream.mockReturnValueOnce(pending.promise);
    render(<Probe />);
    act(() => vi.advanceTimersByTime(10000));
    state('timeout');
    await act(async () => pending.resolve(late));
    state('timeout');
    expect(late.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each(['unmount', 'timeout', 'replace'] as const)(
    'releases pending playback on %s',
    async (end) => {
      const playback = deferred<void>();
      const old = stream('old');
      const next = stream('next');
      vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(playback.promise);
      requestStream.mockResolvedValueOnce(old).mockResolvedValueOnce(next);
      const { unmount } = render(<Probe />);
      await flush();
      const video = document.querySelector('video')!;
      if (end === 'unmount') unmount();
      else if (end === 'timeout') act(() => vi.advanceTimersByTime(10000));
      else await click('Retry');
      await act(async () => playback.reject(new Error('Late playback failure')));
      expect(old.getTracks()[0].stop).toHaveBeenCalledOnce();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      if (end === 'replace') {
        state('ready');
        expect(video.srcObject).toBe(next);
        expect(next.getTracks()[0].stop).not.toHaveBeenCalled();
      } else {
        expect(video.srcObject).toBeNull();
        if (end === 'timeout') state('timeout');
      }
    },
  );

  it('reports a current playback rejection and never announces ready or retries capture', async () => {
    const acquired = stream();
    requestStream.mockResolvedValueOnce(acquired);
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('Decoder failed'));
    render(<Probe />);
    await flush();
    state('unavailable');
    expect(acquired.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(document.querySelector('video')!.srcObject).toBeNull();
    expect(requestStream).toHaveBeenCalledOnce();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      'Camera error',
      undefined,
      expect.objectContaining({ message: 'Decoder failed' }),
    );
  });

  it('releases acquisition without a preview and reports the failure', async () => {
    const acquired = stream();
    requestStream.mockResolvedValueOnce(acquired);
    render(<Probe preview={false} />);
    await flush();
    state('unavailable');
    expect(acquired.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('releases each stream exactly once over repeated starts and remounts', async () => {
    for (let cycle = 0; cycle < 3; cycle++) {
      const first = stream();
      const second = stream();
      requestStream.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
      const { unmount } = render(<Probe />);
      await flush();
      await click('Retry');
      state('ready');
      expect(first.getTracks()[0].stop).toHaveBeenCalledOnce();
      unmount();
      expect(second.getTracks()[0].stop).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    }
    expect(requestStream).toHaveBeenCalledTimes(6);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(6);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('does not let an obsolete switch reset a newer switching state', async () => {
    const older = deferred<ReturnType<typeof stream>>();
    const newer = deferred<ReturnType<typeof stream>>();
    requestStream
      .mockResolvedValueOnce(stream())
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    render(<Probe />);
    await flush();
    await click('Switch');
    await click('Switch');
    await act(async () => older.reject(new Error('Obsolete switch')));
    expect(screen.getByTestId('switching')).toHaveTextContent('true');
    await act(async () => newer.resolve(stream()));
    expect(screen.getByTestId('switching')).toHaveTextContent('false');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('releases a fallback grant after unmount without another report or retry', async () => {
    const fallback = deferred<ReturnType<typeof stream>>();
    const orphan = stream();
    requestStream
      .mockResolvedValueOnce(stream())
      .mockRejectedValueOnce(new Error('Device lost'))
      .mockReturnValueOnce(fallback.promise);
    const { unmount } = render(<Probe />);
    await flush();
    await click('Switch');
    expect(logger.error).toHaveBeenCalledOnce();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => fallback.resolve(orphan));
    expect(orphan.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(requestStream).toHaveBeenCalledTimes(3);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('does not publish old camera enumeration after a newer attempt', async () => {
    const oldDevices = deferred<[]>();
    enumerate.mockReturnValueOnce(oldDevices.promise).mockResolvedValueOnce([]);
    requestStream.mockResolvedValueOnce(stream('old')).mockResolvedValueOnce(stream('new'));
    render(<Probe />);
    await flush();
    await click('Retry');
    await act(async () => oldDevices.reject(new Error('Old enumeration')));
    state('ready');
    expect(screen.getByTestId('label')).toHaveTextContent('new');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
