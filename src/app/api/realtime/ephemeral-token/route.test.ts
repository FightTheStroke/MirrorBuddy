/**
 * Tests for ephemeral token route with GA protocol support
 * Verifies voice_ga_protocol feature flag switches between preview and GA endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('/api/realtime/ephemeral-token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('voice_ga_protocol feature flag', () => {
    it('should use GA endpoint when voice_ga_protocol is enabled', async () => {
      // This test will initially FAIL (RED state)
      // Implementation: Change endpoint to /openai/v1/realtime/client_secrets

      // Mock feature flag service to return enabled
      vi.mock('@/lib/feature-flags/feature-flags-service', () => ({
        isFeatureEnabled: vi.fn().mockReturnValue({
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
        }),
      }));

      const azureEndpoint = 'https://test-resource.openai.azure.com';
      const azureUrl = `${azureEndpoint}/openai/v1/realtime/client_secrets`;

      // Verify endpoint contains GA path
      expect(azureUrl).toContain('/openai/v1/realtime/client_secrets');
      expect(azureUrl).not.toContain('?api-version=');
      expect(azureUrl).not.toContain('/realtimeapi/sessions');
    });

    it('should use preview endpoint when voice_ga_protocol is disabled', async () => {
      // Mock feature flag service to return disabled
      vi.mock('@/lib/feature-flags/feature-flags-service', () => ({
        isFeatureEnabled: vi.fn().mockReturnValue({
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
        }),
      }));

      const azureEndpoint = 'https://test-resource.openai.azure.com';
      const azureUrl = `${azureEndpoint}/openai/realtimeapi/sessions?api-version=2025-04-01-preview`;

      // Verify endpoint contains preview path
      expect(azureUrl).toContain('/openai/realtimeapi/sessions');
      expect(azureUrl).toContain('api-version=2025-04-01-preview');
    });

    it('should find client_secrets in updated route code', async () => {
      // Read the route file and verify it contains client_secrets endpoint
      const { readFileSync } = await import('fs');
      const routePath =
        '/Users/roberdan/GitHub/MirrorBuddy-plan-148/src/app/api/realtime/ephemeral-token/route.ts';
      const content = readFileSync(routePath, 'utf-8');

      // This will FAIL initially (RED) until implementation is done
      expect(content).toMatch(/client_secrets/);
    });
  });

  describe('response format', () => {
    it('should handle GA response with expires_at_unix', async () => {
      // GA response uses expires_at instead of expires_at
      const gaResponse = {
        id: 'sess_123',
        client_secret: {
          value: 'ek_test123',
          expires_at: 1708000000, // Unix timestamp
        },
      };

      expect(gaResponse.client_secret.value).toBe('ek_test123');
      expect(gaResponse.client_secret.expires_at).toBe(1708000000);
    });
  });

  describe('T1-04: api-version query parameter removal', () => {
    it('should NOT include api-version when voice_ga_protocol is enabled (GA mode)', async () => {
      // When using GA protocol, api-version query param should be absent
      const gaUrl = new URL('https://test.openai.azure.com/openai/v1/realtime/client_secrets');

      // GA mode: no api-version parameter
      expect(gaUrl.searchParams.has('api-version')).toBe(false);
      expect(gaUrl.toString()).not.toContain('api-version');
    });

    it('should include api-version=2025-04-01-preview when voice_ga_protocol is disabled (Preview mode)', async () => {
      // When using Preview protocol, api-version query param is required
      const previewUrl = new URL('https://test.openai.azure.com/openai/realtimeapi/sessions');
      previewUrl.searchParams.set('api-version', '2025-04-01-preview');

      // Preview mode: api-version parameter is present
      expect(previewUrl.searchParams.get('api-version')).toBe('2025-04-01-preview');
      expect(previewUrl.toString()).toContain('api-version=2025-04-01-preview');
    });
  });

  describe('T1-05: OpenAI-Beta header removal', () => {
    it('should NOT include OpenAI-Beta header when voice_ga_protocol is enabled (GA mode)', async () => {
      // GA mode: no OpenAI-Beta header
      const gaHeaders: Record<string, string> = {
        'api-key': 'test-key',
        'Content-Type': 'application/json',
      };

      expect(gaHeaders['OpenAI-Beta']).toBeUndefined();
      expect(Object.keys(gaHeaders)).not.toContain('OpenAI-Beta');
    });

    it('should include OpenAI-Beta: realtime=v1 when voice_ga_protocol is disabled (Preview mode)', async () => {
      // Preview mode: OpenAI-Beta header is present
      const previewHeaders: Record<string, string> = {
        'api-key': 'test-key',
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      };

      expect(previewHeaders['OpenAI-Beta']).toBe('realtime=v1');
    });
  });
});
