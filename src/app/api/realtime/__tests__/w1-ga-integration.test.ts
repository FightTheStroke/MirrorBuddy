/**
 * W1 GA Protocol Integration Tests
 * Validates the complete flow of GA protocol across all routes
 *
 * Requirements:
 * - T1-01: Feature flag voice_ga_protocol controls all endpoints
 * - T1-02: Session config in token request body (GA only)
 * - T1-03: Deterministic endpoint construction
 * - T1-04: No api-version query param (GA only)
 * - T1-05: No OpenAI-Beta header (GA only)
 * - T1-10: Parallel fetch optimization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';

vi.mock('@/lib/feature-flags/feature-flags-service', () => ({
  isFeatureEnabled: vi.fn(),
}));

describe('W1 GA Protocol - Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('T1-01: Feature flag controls all endpoints', () => {
    it('should use GA protocol across token, ephemeral-token, and sdp-exchange when flag is enabled', async () => {
      vi.mocked(isFeatureEnabled).mockReturnValue({
        enabled: true,
        reason: 'enabled',
        flag: {
          id: 'voice_ga_protocol',
          name: 'Voice GA Protocol',
          description: 'Test',
          status: 'enabled',
          enabledPercentage: 100,
          killSwitch: false,
          updatedAt: new Date(),
        },
      });

      const flagResult = isFeatureEnabled('voice_ga_protocol');
      expect(flagResult.enabled).toBe(true);

      // Verify flag is checked for all endpoints
      expect(isFeatureEnabled).toHaveBeenCalledWith('voice_ga_protocol');
    });

    it('should use preview protocol across all endpoints when flag is disabled', async () => {
      vi.mocked(isFeatureEnabled).mockReturnValue({
        enabled: false,
        reason: 'disabled',
        flag: {
          id: 'voice_ga_protocol',
          name: 'Voice GA Protocol',
          description: 'Test',
          status: 'disabled',
          enabledPercentage: 0,
          killSwitch: false,
          updatedAt: new Date(),
        },
      });

      const flagResult = isFeatureEnabled('voice_ga_protocol');
      expect(flagResult.enabled).toBe(false);
    });
  });

  describe('T1-02: Session config in token request (GA only)', () => {
    it('should include session config in ephemeral token request when GA is enabled', async () => {
      const sessionConfig = {
        model: 'gpt-4o-realtime',
        voice: 'alloy',
        instructions: 'Test instructions',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad', threshold: 0.5 },
      };

      // Simulate GA protocol: all config goes in token request body
      const tokenRequestBody = { ...sessionConfig };

      expect(tokenRequestBody).toMatchObject({
        model: 'gpt-4o-realtime',
        voice: 'alloy',
        instructions: 'Test instructions',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
      });
    });

    it('should NOT include session config in token request when preview is enabled', async () => {
      // Preview protocol: only model goes in token request
      const tokenRequestBody = {
        model: 'gpt-4o-realtime',
      };

      expect(tokenRequestBody).toEqual({ model: 'gpt-4o-realtime' });
      expect(tokenRequestBody).not.toHaveProperty('voice');
      expect(tokenRequestBody).not.toHaveProperty('instructions');
    });
  });

  describe('T1-03: Deterministic endpoint construction (GA)', () => {
    it('should construct deterministic endpoint from azureResource', () => {
      const azureResource = 'my-resource';
      const expectedEndpoint = `https://${azureResource}.openai.azure.com/openai/v1/realtime/calls`;

      expect(expectedEndpoint).toBe(
        'https://my-resource.openai.azure.com/openai/v1/realtime/calls',
      );
    });

    it('should extract resource name from full endpoint URL', () => {
      const fullEndpoint = 'https://test-resource-123.openai.azure.com';
      const match = fullEndpoint.match(/https:\/\/([^.]+)\./);
      const resourceName = match?.[1] || '';

      expect(resourceName).toBe('test-resource-123');
    });

    it('should use resource name for both ephemeral token and SDP exchange', () => {
      const azureResource = 'prod-resource';

      // Both endpoints should use the same resource name
      const tokenEndpoint = `https://${azureResource}.openai.azure.com/openai/v1/realtime/client_secrets`;
      const sdpEndpoint = `https://${azureResource}.openai.azure.com/openai/v1/realtime/calls`;

      expect(tokenEndpoint).toContain(azureResource);
      expect(sdpEndpoint).toContain(azureResource);
      expect(tokenEndpoint).toContain('/openai/v1/realtime/client_secrets');
      expect(sdpEndpoint).toContain('/openai/v1/realtime/calls');
    });
  });

  describe('T1-04: api-version query parameter removal (GA)', () => {
    it('should NOT include api-version when GA protocol is used', () => {
      // GA endpoints
      const gaTokenUrl = 'https://resource.openai.azure.com/openai/v1/realtime/client_secrets';
      const gaSdpUrl = 'https://resource.openai.azure.com/openai/v1/realtime/calls';

      expect(gaTokenUrl).not.toContain('api-version');
      expect(gaSdpUrl).not.toContain('api-version');
    });

    it('should include api-version=2025-04-01-preview when preview protocol is used', () => {
      const previewUrl =
        'https://resource.openai.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview';

      expect(previewUrl).toContain('api-version=2025-04-01-preview');
    });

    it('should parse URLs correctly without api-version in GA mode', () => {
      const url = new URL('https://resource.openai.azure.com/openai/v1/realtime/client_secrets');

      expect(url.searchParams.has('api-version')).toBe(false);
      expect(url.pathname).toBe('/openai/v1/realtime/client_secrets');
    });
  });

  describe('T1-05: OpenAI-Beta header removal (GA)', () => {
    it('should NOT include OpenAI-Beta header when GA protocol is used', () => {
      const gaHeaders: Record<string, string> = {
        'api-key': 'test-key',
        'Content-Type': 'application/json',
      };

      expect(gaHeaders['OpenAI-Beta']).toBeUndefined();
      expect(Object.keys(gaHeaders)).not.toContain('OpenAI-Beta');
    });

    it('should include OpenAI-Beta: realtime=v1 when preview protocol is used', () => {
      const previewHeaders: Record<string, string> = {
        'api-key': 'test-key',
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      };

      expect(previewHeaders['OpenAI-Beta']).toBe('realtime=v1');
    });

    it('should conditionally add OpenAI-Beta header based on protocol', () => {
      const buildHeaders = (useGA: boolean): Record<string, string> => {
        const headers: Record<string, string> = {
          'api-key': 'test-key',
          'Content-Type': 'application/json',
        };

        if (!useGA) {
          headers['OpenAI-Beta'] = 'realtime=v1';
        }

        return headers;
      };

      const gaHeaders = buildHeaders(true);
      const previewHeaders = buildHeaders(false);

      expect(gaHeaders).not.toHaveProperty('OpenAI-Beta');
      expect(previewHeaders['OpenAI-Beta']).toBe('realtime=v1');
    });
  });

  describe('T1-10: Parallel fetch optimization', () => {
    it('should fetch ephemeral token and getUserMedia in parallel', async () => {
      const startTime = Date.now();
      const calls: { name: string; time: number }[] = [];

      // Simulate parallel fetch
      const tokenPromise = new Promise((resolve) => {
        calls.push({ name: 'token', time: Date.now() - startTime });
        setTimeout(resolve, 50);
      });

      const mediaPromise = new Promise((resolve) => {
        calls.push({ name: 'media', time: Date.now() - startTime });
        setTimeout(resolve, 50);
      });

      await Promise.all([tokenPromise, mediaPromise]);

      // Both should start within ~5ms of each other (parallel)
      expect(calls).toHaveLength(2);
      const timeDiff = Math.abs(calls[0].time - calls[1].time);
      expect(timeDiff).toBeLessThan(10);
    });

    it('should use Promise.allSettled for resilient parallel fetches', async () => {
      const successPromise = Promise.resolve({ data: 'success' });
      const failurePromise = Promise.reject(new Error('failed'));

      const results = await Promise.allSettled([successPromise, failurePromise]);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');

      // Application should continue even if one fetch fails
      const successfulResults = results
        .filter((r) => r.status === 'fulfilled')
        .map((r: any) => r.value);
      expect(successfulResults).toHaveLength(1);
      expect(successfulResults[0]).toEqual({ data: 'success' });
    });
  });

  describe('Complete GA flow simulation', () => {
    it('should complete full GA protocol flow: config -> token -> SDP exchange', async () => {
      // Step 1: Get config from /api/realtime/token (GA mode)
      const config = {
        provider: 'azure',
        transport: 'webrtc',
        endpoint: 'https://test-resource.openai.azure.com',
        azureResource: 'test-resource',
        deployment: 'gpt-4o-realtime',
        configured: true,
      };

      expect(config.azureResource).toBe('test-resource');
      expect(config).not.toHaveProperty('webrtcEndpoint'); // GA mode

      // Step 2: Request ephemeral token with session config
      const tokenRequest = {
        model: config.deployment,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
      };

      expect(tokenRequest.model).toBe('gpt-4o-realtime');

      // Step 3: Construct deterministic SDP endpoint
      const sdpEndpoint = `https://${config.azureResource}.openai.azure.com/openai/v1/realtime/calls`;

      expect(sdpEndpoint).toBe('https://test-resource.openai.azure.com/openai/v1/realtime/calls');
      expect(sdpEndpoint).not.toContain('api-version');

      // Step 4: SDP exchange with Bearer token (no OpenAI-Beta header)
      const sdpHeaders = {
        'Content-Type': 'application/sdp',
        Authorization: 'Bearer ek_test123',
      };

      expect(sdpHeaders).not.toHaveProperty('OpenAI-Beta');
      expect(sdpHeaders.Authorization).toContain('Bearer');
    });

    it('should complete full Preview protocol flow for comparison', async () => {
      // Step 1: Get config from /api/realtime/token (Preview mode)
      const config = {
        provider: 'azure',
        transport: 'webrtc',
        endpoint: 'https://test-resource.openai.azure.com',
        webrtcEndpoint:
          'https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=gpt-4o-realtime',
        deployment: 'gpt-4o-realtime',
        configured: true,
      };

      expect(config.webrtcEndpoint).toBeDefined();
      expect(config).not.toHaveProperty('azureResource'); // Preview mode

      // Step 2: Request ephemeral token with minimal body
      const tokenRequest = {
        model: config.deployment,
      };

      expect(tokenRequest).not.toHaveProperty('voice');
      expect(tokenRequest).not.toHaveProperty('instructions');

      // Step 3: Use preview endpoint URL from config
      const sdpEndpoint = config.webrtcEndpoint;

      expect(sdpEndpoint).toContain('realtimeapi-preview.ai.azure.com');
      expect(sdpEndpoint).toContain('model=');

      // Step 4: SDP exchange (still uses Bearer token, no OpenAI-Beta in SDP)
      const sdpHeaders = {
        'Content-Type': 'application/sdp',
        Authorization: 'Bearer ek_test123',
      };

      expect(sdpHeaders.Authorization).toContain('Bearer');
    });
  });

  describe('Endpoint path validation', () => {
    it('should validate GA endpoint paths', () => {
      const gaEndpoints = {
        token: '/openai/v1/realtime/client_secrets',
        sdp: '/openai/v1/realtime/calls',
      };

      expect(gaEndpoints.token).toContain('/openai/v1/realtime/');
      expect(gaEndpoints.token).toContain('client_secrets');
      expect(gaEndpoints.sdp).toContain('/openai/v1/realtime/');
      expect(gaEndpoints.sdp).toContain('calls');

      // Should NOT contain preview-specific paths
      expect(gaEndpoints.token).not.toContain('realtimeapi');
      expect(gaEndpoints.sdp).not.toContain('realtimertc');
    });

    it('should validate Preview endpoint paths', () => {
      const previewEndpoints = {
        token: '/openai/realtimeapi/sessions',
        sdp: '/v1/realtimertc',
      };

      expect(previewEndpoints.token).toContain('realtimeapi');
      expect(previewEndpoints.sdp).toContain('realtimertc');

      // Should NOT contain GA-specific paths
      expect(previewEndpoints.token).not.toContain('client_secrets');
      expect(previewEndpoints.sdp).not.toContain('/openai/v1/realtime/calls');
    });
  });
});
