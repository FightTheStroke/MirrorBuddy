import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCameraTest } from '@/components/settings/sections/audio-settings/hooks/use-camera-test';
import { useVideoCapture } from '../voice-session/video-capture';
import { useWebcamAnalysis } from '@/components/education/webcam-analysis-mobile/use-webcam-analysis';
import { logger } from '@/lib/logger';
import { clientLogger } from '@/lib/logger/client';
import toast from '@/components/ui/toast';

vi.mock('@/lib/native/media-bridge', () => ({
  requestVideoStream: vi
    .fn()
    .mockRejectedValue(new DOMException('Not supported', 'NotSupportedError')),
  enumerateMediaDevices: vi
    .fn()
    .mockResolvedValue([{ kind: 'videoinput', deviceId: 'camera', label: 'Camera' }]),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/sentry', () => ({ addBreadcrumb: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ default: { error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('handled camera conditions across consumers', () => {
  it('shows feedback without escalation in settings', async () => {
    const { result } = renderHook(() => useCameraTest(null));
    await act(() => result.current.startCamTest());
    expect(result.current.camTestActive).toBe(false);
    expect(logger.error).not.toHaveBeenCalled();
    expect(clientLogger.error).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('non supporta'));
  });

  it('shows feedback without escalation in voice capture', async () => {
    const { result } = renderHook(() => useVideoCapture({ onFrame: vi.fn(), maxSeconds: 60 }));
    await act(async () => {
      expect(await result.current.startCapture()).toBe(false);
    });
    expect(clientLogger.error).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('non supporta'));
  });

  it('shows localized feedback in mobile analysis', async () => {
    const { result } = renderHook(() => useWebcamAnalysis());
    await act(async () => {});
    expect(result.current.error).toContain('non supporta');
    expect(clientLogger.error).not.toHaveBeenCalled();
  });
});
