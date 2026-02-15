// ============================================================================
// TEST: GA Protocol - Session Config in Token Request Body
// Validates that when voice_ga_protocol flag is enabled, session config
// (model, instructions, voice, audio formats) is sent in the token request
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';
import { getClientIdentifier } from '@/lib/rate-limit';

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
  withCSRF: (handler: any) => handler,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ success: true }),
  getClientIdentifier: vi.fn(),
  RATE_LIMITS: { REALTIME_TOKEN: {} },
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/tracing', () => ({
  getRequestId: vi.fn().mockReturnValue('test-request-id'),
  getRequestLogger: vi.fn().mockReturnValue({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('@/lib/feature-flags/feature-flags-service', () => ({
  isFeatureEnabled: vi.fn(),
}));

let testCounter = 0;

describe('POST /api/realtime/ephemeral-token - GA Protocol', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Each test needs a unique client ID to avoid per-IP rate limiter (module-level state)
    testCounter++;
    vi.mocked(getClientIdentifier).mockReturnValue(`test-client-${testCounter}`);
    process.env = {
      ...ORIGINAL_ENV,
      AZURE_OPENAI_REALTIME_ENDPOINT: 'https://test.openai.azure.com',
      AZURE_OPENAI_REALTIME_API_KEY: 'test-key',
      AZURE_OPENAI_REALTIME_DEPLOYMENT: 'gpt-realtime',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should include session config in token request body when voice_ga_protocol is enabled', async () => {
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

    // Mock fetch to return GA format response
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        value: 'test-token',
        expires_at: Date.now() + 3600000,
        session: { id: 'test-session-id', model: 'gpt-realtime' },
      }),
    });
    global.fetch = mockFetch;

    const request = new NextRequest('http://localhost:3000/api/realtime/ephemeral-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'test-csrf-token',
      },
      body: JSON.stringify({
        model: 'gpt-realtime',
        voice: 'alloy',
        instructions: 'Test instructions',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad', threshold: 0.5 },
      }),
    });

    await POST(request as any);

    // Verify fetch was called with GA session format
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/openai/v1/realtime/client_secrets'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'api-key': 'test-key',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('"type":"realtime"'),
      }),
    );

    // Parse the request body to verify GA session format
    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    expect(requestBody).toHaveProperty('session');
    expect(requestBody.session).toMatchObject({
      type: 'realtime',
      model: 'gpt-realtime',
      instructions: expect.any(String),
      audio: expect.objectContaining({
        output: { voice: 'alloy' },
        input: expect.objectContaining({
          transcription: { model: 'whisper-1' },
          turn_detection: expect.objectContaining({ type: 'server_vad' }),
        }),
      }),
    });
  });

  it('should only send model in token request body when voice_ga_protocol is disabled', async () => {
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

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        client_secret: {
          value: 'test-token',
          expires_at: Date.now() + 3600000,
        },
        id: 'test-session-id',
      }),
    });
    global.fetch = mockFetch;

    const request = new NextRequest('http://localhost:3000/api/realtime/ephemeral-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'test-csrf-token',
      },
    });

    await POST(request as any);

    // Verify fetch was called with only model in body
    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    expect(requestBody).toEqual({
      model: 'gpt-realtime',
    });

    // Verify session config fields are NOT present
    expect(requestBody).not.toHaveProperty('voice');
    expect(requestBody).not.toHaveProperty('instructions');
    expect(requestBody).not.toHaveProperty('input_audio_format');
    expect(requestBody).not.toHaveProperty('output_audio_format');
  });

  it('should use default values when session config is not provided in request', async () => {
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

    // Mock fetch to return GA format response
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        value: 'test-token',
        expires_at: Date.now() + 3600000,
        session: { id: 'test-session-id', model: 'gpt-realtime' },
      }),
    });
    global.fetch = mockFetch;

    const request = new NextRequest('http://localhost:3000/api/realtime/ephemeral-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'test-csrf-token',
      },
    });

    await POST(request as any);

    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    // GA format: session wrapper with defaults
    expect(requestBody).toHaveProperty('session');
    expect(requestBody.session).toMatchObject({
      type: 'realtime',
      model: 'gpt-realtime',
      audio: expect.objectContaining({
        output: { voice: 'alloy' },
      }),
    });
  });
});
