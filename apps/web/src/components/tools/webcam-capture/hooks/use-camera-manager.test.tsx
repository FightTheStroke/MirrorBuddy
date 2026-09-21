import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCameraManager } from './use-camera-manager';
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

function Probe() {
  const { videoRef, isLoading, errorType, error, startCamera } = useCameraManager({});
  return (
    <>
      <video ref={videoRef} />
      <output data-testid="state">{isLoading ? 'loading' : errorType || 'ready'}</output>
      <output data-testid="error">{error}</output>
      <button onClick={() => void startCamera()}>Retry</button>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('camera capability failures', () => {
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
});
