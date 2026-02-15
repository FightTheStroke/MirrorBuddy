/**
 * Tests for /api/realtime/token route with GA protocol support
 * Validates voice_ga_protocol feature flag switches between preview and GA response formats
 *
 * Requirements:
 * - T1-01: Feature flag controls endpoint format
 * - T1-03: GA mode returns azureResource + deployment for deterministic endpoint
 * - T1-03: Preview mode returns webrtcEndpoint URL
 * - F-01: Rate limiting (10 req/min per IP)
 * - F-02: Configuration validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';
import { checkRateLimitAsync, getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit';

// Mock dependencies
vi.mock('@/lib/api/middlewares', () => ({
  pipe: (..._fns: Array<(handler: any) => any>) => {
    return (handler: any) => {
      return async (req: Request) => {
        const ctx = { req };
        return handler(ctx);
      };
    };
  },
  withSentry: () => (handler: any) => handler,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn(),
  getClientIdentifier: vi.fn(),
  RATE_LIMITS: { REALTIME_TOKEN: {} },
  rateLimitResponse: vi.fn(),
}));

const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@/lib/tracing', () => ({
  getRequestId: vi.fn(() => 'test-request-id'),
  getRequestLogger: vi.fn(() => mockLogger),
}));

vi.mock('@/lib/feature-flags/feature-flags-service', () => ({
  isFeatureEnabled: vi.fn(),
}));

describe('GET /api/realtime/token - GA Protocol', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup default mock return values
    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      success: true,
      remaining: 10,
      resetTime: Date.now() + 60000,
      limit: 30,
    });
    vi.mocked(getClientIdentifier).mockReturnValue('test-client');
    vi.mocked(rateLimitResponse).mockReturnValue({
      json: () => ({ error: 'Rate limit exceeded' }),
      headers: new Headers(),
      status: 429,
    } as any);

    process.env = {
      ...ORIGINAL_ENV,
      AZURE_OPENAI_REALTIME_ENDPOINT: 'https://test-resource.openai.azure.com',
      AZURE_OPENAI_REALTIME_API_KEY: 'test-key',
      AZURE_OPENAI_REALTIME_DEPLOYMENT: 'gpt-4o-realtime',
      AZURE_OPENAI_REALTIME_REGION: 'swedencentral',
      VOICE_TRANSPORT: 'webrtc',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.clearAllMocks();
  });

  describe('T1-01: voice_ga_protocol feature flag', () => {
    it('should return azureResource and deployment when voice_ga_protocol is enabled (GA mode)', async () => {
      // Mock feature flag as enabled
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

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      // GA mode: should return azureResource and deployment for deterministic endpoint construction
      expect(data).toMatchObject({
        provider: 'azure',
        transport: 'webrtc',
        endpoint: 'https://test-resource.openai.azure.com',
        azureResource: 'test-resource',
        deployment: 'gpt-4o-realtime',
        configured: true,
      });

      // GA mode: should NOT return webrtcEndpoint (that's preview-only)
      expect(data).not.toHaveProperty('webrtcEndpoint');
    });

    it('should return webrtcEndpoint when voice_ga_protocol is disabled (Preview mode)', async () => {
      // Mock feature flag as disabled
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

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      // Preview mode: should return webrtcEndpoint URL
      expect(data).toMatchObject({
        provider: 'azure',
        transport: 'webrtc',
        endpoint: 'https://test-resource.openai.azure.com',
        webrtcEndpoint:
          'https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=gpt-4o-realtime',
        deployment: 'gpt-4o-realtime',
        configured: true,
      });

      // Preview mode: should NOT return azureResource (that's GA-only)
      expect(data).not.toHaveProperty('azureResource');
    });
  });

  describe('T1-03: Resource name extraction for GA protocol', () => {
    it('should extract resource name from endpoint URL', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      // Should extract 'test-resource' from 'https://test-resource.openai.azure.com'
      expect(data.azureResource).toBe('test-resource');
    });

    it('should handle different resource name formats', async () => {
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

      process.env.AZURE_OPENAI_REALTIME_ENDPOINT =
        'https://my-awesome-resource-123.openai.azure.com';

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.azureResource).toBe('my-awesome-resource-123');
    });

    it('should return empty string if resource name cannot be extracted', async () => {
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

      process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://invalid-format';

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.azureResource).toBe('');
    });
  });

  describe('F-01: Rate limiting', () => {
    it('should apply rate limiting (10 req/min per IP)', async () => {
      // Mock rate limit exceeded
      vi.mocked(checkRateLimitAsync).mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        limit: 30,
      });

      vi.mocked(rateLimitResponse).mockReturnValue({
        json: () => ({ error: 'Rate limit exceeded' }),
        headers: new Headers(),
        status: 429,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);

      expect(response.status).toBe(429);
      expect(checkRateLimitAsync).toHaveBeenCalledWith(
        'realtime-token:test-client',
        expect.any(Object),
      );
    });
  });

  describe('F-02: Configuration validation', () => {
    it('should return 503 when Azure endpoint is missing', async () => {
      delete process.env.AZURE_OPENAI_REALTIME_ENDPOINT;

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Azure OpenAI not configured');
      expect(data.missingVariables).toContain('AZURE_OPENAI_REALTIME_ENDPOINT');
    });

    it('should return 503 when API key is missing', async () => {
      delete process.env.AZURE_OPENAI_REALTIME_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Azure OpenAI not configured');
      expect(data.missingVariables).toContain('AZURE_OPENAI_REALTIME_API_KEY');
    });

    it('should return 503 when deployment is missing', async () => {
      delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Azure OpenAI not configured');
      expect(data.missingVariables).toContain('AZURE_OPENAI_REALTIME_DEPLOYMENT');
    });

    it('should trim whitespace from environment variables', async () => {
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

      process.env.AZURE_OPENAI_REALTIME_ENDPOINT = ' https://test-resource.openai.azure.com \n';
      process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = ' gpt-4o-realtime  ';

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.endpoint).toBe('https://test-resource.openai.azure.com');
      expect(data.deployment).toBe('gpt-4o-realtime');
    });
  });

  describe('Transport mode', () => {
    it('should return webrtc transport when VOICE_TRANSPORT=webrtc', async () => {
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

      process.env.VOICE_TRANSPORT = 'webrtc';

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.transport).toBe('webrtc');
    });

    it('should return websocket transport when VOICE_TRANSPORT=websocket', async () => {
      // Websocket mode doesn't need feature flag, but mock it to prevent undefined errors
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

      process.env.VOICE_TRANSPORT = 'websocket';
      process.env.WS_PROXY_PORT = '3001';

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.transport).toBe('websocket');
      expect(data.proxyPort).toBe(3001);
      expect(data).not.toHaveProperty('endpoint');
      expect(data).not.toHaveProperty('azureResource');
      expect(data).not.toHaveProperty('webrtcEndpoint');
    });

    it('should default to webrtc if VOICE_TRANSPORT not set', async () => {
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

      delete process.env.VOICE_TRANSPORT;

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.transport).toBe('webrtc');
    });
  });

  describe('HEAD /api/realtime/token - Configuration check', () => {
    it('should return 200 when fully configured', async () => {
      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'HEAD',
      });

      // Import HEAD handler
      const { HEAD } = await import('./route');
      const response = await HEAD(request as any);

      expect(response.status).toBe(200);
    });

    it('should return 503 when configuration is incomplete', async () => {
      delete process.env.AZURE_OPENAI_REALTIME_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'HEAD',
      });

      const { HEAD } = await import('./route');
      const response = await HEAD(request as any);

      expect(response.status).toBe(503);
    });
  });

  describe('Regional endpoint for preview mode', () => {
    it('should use AZURE_OPENAI_REALTIME_REGION for preview webrtcEndpoint', async () => {
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

      process.env.AZURE_OPENAI_REALTIME_REGION = 'eastus2';

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.webrtcEndpoint).toContain('eastus2.realtimeapi-preview.ai.azure.com');
    });

    it('should default to swedencentral if region not set', async () => {
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

      delete process.env.AZURE_OPENAI_REALTIME_REGION;

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.webrtcEndpoint).toContain('swedencentral.realtimeapi-preview.ai.azure.com');
    });
  });

  describe('Response headers', () => {
    it('should include X-Request-ID header', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/realtime/token', {
        method: 'GET',
      });

      const response = await GET(request as any);

      expect(response.headers.get('X-Request-ID')).toBe('test-request-id');
    });
  });
});
