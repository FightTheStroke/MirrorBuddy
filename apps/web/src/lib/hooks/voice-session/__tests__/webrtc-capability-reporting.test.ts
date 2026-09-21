import { beforeEach, describe, expect, it, vi } from 'vitest';
import { omero } from '@/data/maestri/omero';
import { clientLogger } from '@/lib/logger/client';
import { requestMicrophoneStream } from '@/lib/native/media-bridge';
import { addBreadcrumb } from '@/lib/sentry';
import { logVoiceError } from '../voice-error-logger';
import { WebRTCConnection } from '../webrtc-connection';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/sentry', () => ({ addBreadcrumb: vi.fn() }));
vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
vi.mock('@/lib/native/media-bridge', () => ({
  isMediaDevicesAvailable: () => true,
  requestMicrophoneStream: vi.fn(),
}));
vi.mock('../voice-error-logger', () => ({
  logVoiceError: vi.fn(),
  logMicrophonePermissionRequest: vi.fn(),
  logMediaStreamTracks: vi.fn(),
}));

function createConnection() {
  const onError = vi.fn();
  const connection = new WebRTCConnection({
    maestro: omero,
    connectionInfo: { provider: 'azure', azureResource: 'test' },
    getCachedToken: async () => 'cached-token',
    onError,
  });
  return { connection, onError };
}

describe('WebRTC capability reporting', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['NotSupportedError', 'NotAllowedError', 'NotFoundError', 'OverconstrainedError'])(
    'keeps %s as a breadcrumb while preserving the UI error',
    async (name) => {
      vi.mocked(requestMicrophoneStream).mockRejectedValue(
        Object.assign(new Error('Unavailable'), { name }),
      );
      const { connection, onError } = createConnection();

      await expect(connection.connect()).rejects.toMatchObject({
        message: 'Unavailable',
        _voiceRootCause: true,
      });

      expect(onError).toHaveBeenCalledOnce();
      expect(addBreadcrumb).toHaveBeenCalledWith(
        'voice',
        '[VoiceSession] WebRTC capability limitation',
        expect.objectContaining({ component: 'voice-error', errorMessage: 'Unavailable' }),
      );
      expect(clientLogger.warn).not.toHaveBeenCalled();
      expect(clientLogger.error).not.toHaveBeenCalled();
      expect(logVoiceError).not.toHaveBeenCalled();
    },
  );

  it('continues reporting unexpected microphone failures', async () => {
    vi.mocked(requestMicrophoneStream).mockRejectedValue(new Error('Device disconnected'));
    const { connection, onError } = createConnection();

    await expect(connection.connect()).rejects.toThrow('Device disconnected');

    expect(logVoiceError).toHaveBeenCalledWith(
      'WebRTCConnectionFailed',
      'Device disconnected',
      expect.objectContaining({ connectionTime: expect.any(Number) }),
    );
    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });
});
