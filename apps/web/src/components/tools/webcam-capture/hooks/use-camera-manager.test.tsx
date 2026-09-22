import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { deferred, Probe, stream, readyFrameByDefault } from './camera-manager-test-utils';
import { logger } from '@/lib/logger';
import { addBreadcrumb } from '@/lib/sentry';

vi.mock('@/lib/sentry', () => ({ addBreadcrumb: vi.fn() }));
vi.mock('next-intl', async () => {
  const { createTranslator } = await vi.importActual<typeof import('next-intl')>('next-intl');
  const { default: messages } = await import('../../../../../messages/en/tools.json');
  const t = createTranslator({ locale: 'en', messages, namespace: 'tools.webcam' });
  return { useTranslations: () => t };
});

const { requestStream } = vi.hoisted(() => ({ requestStream: vi.fn() }));
vi.mock('@/lib/native/media-bridge', () => ({
  requestVideoStream: requestStream,
  isMediaDevicesAvailable: () => true,
}));
vi.mock('../utils/camera-utils', () => ({
  isMobile: () => false,
  enumerateCameras: async () => [],
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  readyFrameByDefault();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('camera capability failures', () => {
  it('stops a stream granted after the capture dialog unmounts', async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    let grantAccess!: (stream: { getTracks: () => { stop: typeof stop }[] }) => void;
    requestStream.mockReturnValueOnce(
      new Promise((resolve) => {
        grantAccess = resolve;
      }),
    );
    const { unmount } = render(<Probe />);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      grantAccess({ getTracks: () => [{ stop }] });
    });

    expect(stop).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(10000));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('keeps unsupported-device failures visible without an unhandled rejection', async () => {
    requestStream.mockRejectedValueOnce(new DOMException('Not supported', 'NotSupportedError'));
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('unavailable'));
    expect(screen.getByTestId('error')).not.toBeEmptyDOMElement();
    expect(screen.getByTestId('error')).toHaveTextContent(
      'This browser or device does not support camera access.',
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(addBreadcrumb).toHaveBeenCalled();
  });

  it('shows translated permission guidance without error reporting', async () => {
    requestStream.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('permission'));
    expect(screen.getByTestId('error')).toHaveTextContent('Allow camera access');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('keeps unexpected camera failures at error severity', async () => {
    requestStream.mockRejectedValueOnce(new Error('Unexpected driver failure'));
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('unavailable'));
    expect(logger.error).toHaveBeenCalled();
  });

  it('can recover on retry and releases the supported stream on unmount', async () => {
    const stop = vi.fn();
    requestStream
      .mockRejectedValueOnce(new DOMException('Not supported', 'NotSupportedError'))
      .mockResolvedValueOnce({ getTracks: () => [{ stop }], getVideoTracks: () => [] });
    const { unmount } = render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
    expect(requestStream).toHaveBeenCalledTimes(2);
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it.each([null, undefined, { name: 42, message: 42 }, new Error('Unexpected failure')])(
    'reports current acquisition failure once without an unhandled rejection: %s',
    async (failure) => {
      requestStream.mockRejectedValueOnce(failure);
      render(<Probe />);
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('unavailable'));
      expect(logger.error).toHaveBeenCalledOnce();
      expect(requestStream).toHaveBeenCalledOnce();
    },
  );

  it.each(['success', 'failure'] as const)(
    'keeps a selected-device fallback bounded: %s',
    async (end) => {
      const acquired = stream();
      requestStream.mockResolvedValueOnce(stream()).mockRejectedValueOnce(new Error('Device lost'));
      if (end === 'success') requestStream.mockResolvedValueOnce(acquired);
      else requestStream.mockRejectedValueOnce(new Error('Fallback lost'));
      const { unmount } = render(<Probe />);
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
      fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
      await waitFor(() =>
        expect(screen.getByTestId('state')).toHaveTextContent(
          end === 'success' ? 'ready' : 'unavailable',
        ),
      );
      expect(requestStream).toHaveBeenCalledTimes(3);
      expect(requestStream).toHaveBeenNthCalledWith(3, undefined, 'caller');
      expect(logger.error).toHaveBeenCalledTimes(end === 'success' ? 1 : 2);
      if (end === 'failure') {
        expect(logger.error).toHaveBeenLastCalledWith(
          'Camera error',
          undefined,
          expect.objectContaining({ message: 'Fallback lost' }),
        );
      }
      unmount();
      expect(acquired.getTracks()[0].stop).toHaveBeenCalledTimes(end === 'success' ? 1 : 0);
    },
  );

  it('recovers after timeout without reviving the timed-out request', async () => {
    vi.useFakeTimers();
    const pending = deferred<ReturnType<typeof stream>>();
    const late = stream('late');
    const current = stream('current');
    requestStream.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(current);
    const { unmount } = render(<Probe />);
    act(() => vi.advanceTimersByTime(10000));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(async () => {});
    await act(async () => pending.resolve(late));
    expect(screen.getByTestId('state')).toHaveTextContent('ready');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
    expect(late.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(current.getTracks()[0].stop).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
  });

  it('does not show camera switching when initially opening the preferred device', async () => {
    const pending = deferred<ReturnType<typeof stream>>();
    requestStream.mockReturnValueOnce(pending.promise);
    render(<Probe preferredCameraId="preferred" />);
    expect(screen.getByTestId('switching')).toHaveTextContent('false');
    await act(async () => pending.resolve(stream()));
    expect(requestStream).toHaveBeenCalledExactlyOnceWith(
      {
        deviceId: { ideal: 'preferred' },
      },
      'caller',
    );
  });

  it('releases the superseded StrictMode acquisition and keeps only the current stream', async () => {
    const first = deferred<ReturnType<typeof stream>>();
    const orphan = stream();
    const current = stream();
    requestStream.mockReturnValueOnce(first.promise).mockResolvedValueOnce(current);
    const { unmount } = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    await act(async () => first.resolve(orphan));
    expect(screen.getByTestId('state')).toHaveTextContent('ready');
    expect(requestStream).toHaveBeenCalledTimes(2);
    expect(orphan.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(current.getTracks()[0].stop).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    unmount();
    expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('does not stop tracks again when capture has already ended them', async () => {
    const acquired = stream();
    requestStream.mockResolvedValueOnce(acquired);
    const { unmount } = render(<Probe />);
    await act(async () => {});
    acquired.getTracks()[0].stop();
    unmount();
    expect(acquired.getTracks()[0].stop).toHaveBeenCalledOnce();
  });
});
