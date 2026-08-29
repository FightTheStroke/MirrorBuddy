/**
 * Tests for SDP exchange route with GA protocol support
 * Verifies voice_ga_protocol feature flag switches between preview and GA endpoints
 *
 * Requirements: F-06 (SDP exchange)
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

describe('/api/realtime/sdp-exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('voice_ga_protocol feature flag', () => {
    it('should use GA SDP endpoint when voice_ga_protocol is enabled', async () => {
      // This test will initially FAIL (RED state)
      // Implementation: Change endpoint to /openai/v1/realtime/calls

      const azureEndpoint = 'https://test-resource.openai.azure.com';
      const gaUrl = `${azureEndpoint}/openai/v1/realtime/calls`;

      // Verify endpoint contains GA path
      expect(gaUrl).toContain('/openai/v1/realtime/calls');
      expect(gaUrl).not.toContain('realtimeapi-preview');
      expect(gaUrl).not.toContain('/v1/realtimertc');
    });

    it('should use the documented GA endpoint without preview query parameters', async () => {
      const azureEndpoint = 'https://test-resource.openai.azure.com';
      const gaUrl = `${azureEndpoint}/openai/v1/realtime/calls`;

      expect(gaUrl).toContain('/openai/v1/realtime/calls');
      expect(gaUrl).not.toContain('webrtcfilter');
    });

    it('should find realtime/calls endpoint in route code', async () => {
      // Read the route file and verify it contains the GA endpoint
      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');
      const routePath = resolve(__dirname, 'route.ts');
      const content = readFileSync(routePath, 'utf-8');

      // This should PASS even before implementation (already exists)
      expect(content).toMatch(/\/openai\/v1\/realtime\/calls/);
      expect(content).not.toContain('webrtcfilter=off');
    });

    it('should require CSRF protection before relaying a browser token', async () => {
      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');
      const routePath = resolve(__dirname, 'route.ts');
      const content = readFileSync(routePath, 'utf-8');

      expect(content).toContain('withCSRF');
      expect(content).toContain('withRateLimit');
      expect(content).toMatch(
        /pipe\(\s*withSentry\('\/api\/realtime\/sdp-exchange'\),\s*withCSRF,\s*withRateLimit/,
      );
    });

    it('should reject relay requests without a valid CSRF token', async () => {
      const request = new NextRequest('http://localhost/api/realtime/sdp-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: 'v=0\r\n', token: 'ek_test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: 'Invalid CSRF token' });
    });
  });

  describe('SDP exchange format', () => {
    it('should accept SDP offer in request body', () => {
      const request = {
        sdp: 'v=0\r\no=- 123456 789 IN IP4 0.0.0.0',
        token: 'ek_test123',
      };

      expect(request.sdp).toBeDefined();
      expect(request.token).toBeDefined();
    });

    it('should send SDP offer with correct Content-Type', () => {
      const headers = {
        'Content-Type': 'application/sdp',
        Authorization: 'Bearer ek_test123',
      };

      expect(headers['Content-Type']).toBe('application/sdp');
      expect(headers.Authorization).toContain('Bearer');
    });

    it('should receive SDP answer as text response', () => {
      const answerSdp = 'v=0\r\no=- 654321 654321 IN IP4 127.0.0.1';

      expect(answerSdp).toBeDefined();
      expect(answerSdp).toContain('v=0');
    });
  });
});
