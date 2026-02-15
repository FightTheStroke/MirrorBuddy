import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCConnection } from '../webrtc-connection';
import { probeWebRTC } from '../webrtc-probe';
import { isFeatureEnabled } from '@/lib/feature-flags/client';

vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  csrfFetch: vi.fn(),
}));

vi.mock('@/lib/feature-flags/client', () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock('@/lib/native/media-bridge', () => ({
  isMediaDevicesAvailable: vi.fn(() => true),
  requestMicrophoneStream: vi.fn(async () => ({
    getTracks: () => [{ enabled: false, stop: vi.fn() }],
    getAudioTracks: () => [{ enabled: false, stop: vi.fn() }],
  })),
}));

describe('WebRTC GA Protocol', () => {
  const mockIsFeatureEnabled = isFeatureEnabled as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.RTCPeerConnection = vi.fn(function (this: any) {
      this.createDataChannel = vi.fn(() => ({
        label: 'realtime-channel',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      this.createOffer = vi.fn(async () => ({ sdp: 'mock-offer', type: 'offer' }));
      this.setLocalDescription = vi.fn(async () => undefined);
      this.setRemoteDescription = vi.fn(async () => undefined);
      this.addTrack = vi.fn();
      this.addEventListener = vi.fn();
      this.removeEventListener = vi.fn();
      this.close = vi.fn();
      this.iceGatheringState = 'complete';
      this.localDescription = { sdp: 'mock-offer', type: 'offer' };
      return this;
    }) as never;
    global.RTCSessionDescription = vi.fn(function (this: any, init: RTCSessionDescriptionInit) {
      this.sdp = init.sdp;
      this.type = init.type;
      return this;
    }) as never;
  });

  describe('WebRTCConnection SDP exchange', () => {
    it('should use deterministic endpoint when voice_ga_protocol is enabled', async () => {
      mockIsFeatureEnabled.mockReturnValue({
        enabled: true,
        reason: 'enabled',
        flag: {
          id: 'voice_ga_protocol',
          name: 'Voice GA Protocol',
          description: 'Switch from preview to GA realtime API',
          status: 'enabled',
          enabledPercentage: 100,
          killSwitch: false,
          updatedAt: new Date(),
        },
      } as any);

      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

      // Mock ephemeral token response
      const { csrfFetch } = await import('@/lib/auth');
      const mockCsrfFetch = csrfFetch as ReturnType<typeof vi.fn>;
      mockCsrfFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'mock-token', expiresAt: '2026-12-31' }),
      });

      // Mock config response with Azure resource name
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          provider: 'azure',
          transport: 'webrtc',
          azureResource: 'my-resource',
          deployment: 'gpt-realtime',
        }),
      });

      // Mock SDP exchange response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'mock-answer-sdp',
      });

      const connection = new WebRTCConnection({
        maestro: { id: 'm1', name: 'Test' } as never,
        connectionInfo: { characterType: 'maestro' } as never,
      });

      // Override waitForConnection to avoid timeout

      (connection as any)['waitForConnection'] = vi.fn(async () => undefined);

      await connection.connect();

      // Verify: Should fetch config once
      expect(mockFetch).toHaveBeenCalledWith('/api/realtime/token');

      // Verify: Should use GA endpoint directly (no second config fetch)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://my-resource.openai.azure.com/openai/v1/realtime/calls',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/sdp',
            Authorization: 'Bearer mock-token',
          }),
          body: 'mock-offer',
        }),
      );

      // Should NOT fetch config twice
      expect(mockFetch).toHaveBeenCalledTimes(2); // token + SDP exchange only
    });

    it('should use preview endpoint when voice_ga_protocol is disabled', async () => {
      mockIsFeatureEnabled.mockReturnValue({
        enabled: false,
        reason: 'disabled',
        flag: {
          id: 'voice_ga_protocol',
          name: 'Voice GA Protocol',
          description: 'Switch from preview to GA realtime API',
          status: 'disabled',
          enabledPercentage: 0,
          killSwitch: false,
          updatedAt: new Date(),
        },
      } as any);

      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

      const { csrfFetch } = await import('@/lib/auth');
      const mockCsrfFetch = csrfFetch as ReturnType<typeof vi.fn>;
      mockCsrfFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'mock-token', expiresAt: '2026-12-31' }),
      });

      // First config fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          provider: 'azure',
          transport: 'webrtc',
          webrtcEndpoint:
            'https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=gpt-realtime',
        }),
      });

      // SDP exchange response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'mock-answer-sdp',
      });

      const connection = new WebRTCConnection({
        maestro: { id: 'm1', name: 'Test' } as never,
        connectionInfo: { characterType: 'maestro' } as never,
      });

      (connection as any)['waitForConnection'] = vi.fn(async () => undefined);

      await connection.connect();

      // Verify: Should fetch config to get webrtcEndpoint
      expect(mockFetch).toHaveBeenCalledWith('/api/realtime/token');

      // Verify: Should use preview endpoint from config
      expect(mockFetch).toHaveBeenCalledWith(
        'https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=gpt-realtime',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/sdp',
          }),
          body: 'mock-offer',
        }),
      );
    });
  });

  describe('probeWebRTC SDP exchange', () => {
    it('should use deterministic endpoint when voice_ga_protocol is enabled', async () => {
      mockIsFeatureEnabled.mockReturnValue({
        enabled: true,
        reason: 'enabled',
        flag: {
          id: 'voice_ga_protocol',
          name: 'Voice GA Protocol',
          description: 'Switch from preview to GA realtime API',
          status: 'enabled',
          enabledPercentage: 100,
          killSwitch: false,
          updatedAt: new Date(),
        },
      } as any);

      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

      const { csrfFetch } = await import('@/lib/auth');
      const mockCsrfFetch = csrfFetch as ReturnType<typeof vi.fn>;
      mockCsrfFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'probe-token', expiresAt: '2026-12-31' }),
      });

      // Mock config response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          provider: 'azure',
          transport: 'webrtc',
          azureResource: 'probe-resource',
          deployment: 'gpt-realtime',
        }),
      });

      // Mock SDP exchange response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'probe-answer',
      });

      const result = await probeWebRTC();

      expect(result.success).toBe(true);

      // Verify: Should use GA endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        'https://probe-resource.openai.azure.com/openai/v1/realtime/calls',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/sdp',
            Authorization: 'Bearer probe-token',
          }),
        }),
      );

      // Should NOT fetch config twice
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use preview endpoint when voice_ga_protocol is disabled', async () => {
      mockIsFeatureEnabled.mockReturnValue({
        enabled: false,
        reason: 'disabled',
        flag: {
          id: 'voice_ga_protocol',
          name: 'Voice GA Protocol',
          description: 'Switch from preview to GA realtime API',
          status: 'disabled',
          enabledPercentage: 0,
          killSwitch: false,
          updatedAt: new Date(),
        },
      } as any);

      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

      const { csrfFetch } = await import('@/lib/auth');
      const mockCsrfFetch = csrfFetch as ReturnType<typeof vi.fn>;
      mockCsrfFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'probe-token', expiresAt: '2026-12-31' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          provider: 'azure',
          transport: 'webrtc',
          webrtcEndpoint:
            'https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=gpt-4o',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'probe-answer',
      });

      const result = await probeWebRTC();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=gpt-4o',
        expect.any(Object),
      );
    });
  });
});
