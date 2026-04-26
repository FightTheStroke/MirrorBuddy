import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Buffer } from 'buffer';
import { POST } from '../route';
import type { FeatureFlagCheckResult, KnownFeatureFlag } from '@/lib/feature-flags/types';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';

vi.mock('@/lib/api/pipe', () => ({
  pipe:
    (..._middlewares: Array<(...args: any[]) => any>) =>
    (handler: any) => {
      return async (req: Request) =>
        handler({
          req,
          params: Promise.resolve({}),
        });
    },
}));

vi.mock('@/lib/api/middlewares', () => ({
  withSentry: () => async (_ctx: any, next: () => Promise<Response>) => next(),
  withCSRF: async (_ctx: any, next: () => Promise<Response>) => next(),
  withAuth: async (_ctx: any, next: () => Promise<Response>) => next(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
  getClientIdentifier: vi.fn().mockReturnValue('test-client'),
  RATE_LIMITS: { TTS: {} },
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/feature-flags/feature-flags-service', () => ({
  isFeatureEnabled: vi.fn(),
}));

const buildFlagResult = (flagId: KnownFeatureFlag, enabled: boolean): FeatureFlagCheckResult => ({
  enabled,
  reason: enabled ? 'enabled' : 'disabled',
  flag: {
    id: flagId,
    name: flagId,
    description: `${flagId} test flag`,
    status: enabled ? 'enabled' : 'disabled',
    enabledPercentage: enabled ? 100 : 0,
    killSwitch: false,
    updatedAt: new Date(),
  },
});

const setTtsAudio15Flag = (enabled: boolean) => {
  vi.mocked(isFeatureEnabled).mockImplementation((flagId: KnownFeatureFlag) => {
    if (flagId === 'tts_audio_15') {
      return buildFlagResult(flagId, enabled);
    }
    return buildFlagResult(flagId, false);
  });
};

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = global.fetch;

const createRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': 'test-token',
    },
    body: JSON.stringify(body),
  });

describe('/api/tts POST - provider selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      AZURE_OPENAI_ENDPOINT: 'https://azure.example.com',
      AZURE_OPENAI_API_KEY: 'test-azure-key',
      AZURE_OPENAI_AUDIO_DEPLOYMENT: 'gpt-audio-1_5',
      AZURE_OPENAI_TTS_DEPLOYMENT: 'azure-tts-hd',
      OPENAI_API_KEY: 'openai-test-key',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    global.fetch = ORIGINAL_FETCH;
  });

  it('uses gpt-audio-1.5 chat completions and decodes base64 audio when flag enabled', async () => {
    setTtsAudio15Flag(true);
    const audioBytes = Uint8Array.from([1, 2, 3]);
    const base64Audio = Buffer.from(audioBytes).toString('base64');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              audio: {
                data: base64Audio,
              },
            },
          },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const response = await POST(createRequest({ text: 'Ciao Maestro', voice: 'alloy' }) as any);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({
        body: expect.stringContaining('"modalities":["text","audio"]'),
      }),
    );

    const [, fetchOptions] = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchOptions.body);
    expect(requestBody.messages?.[0]?.content).toEqual([
      { type: 'input_text', text: 'Ciao Maestro' },
    ]);

    expect(response.status).toBe(200);
    const buffer = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(buffer)).toEqual(Array.from(audioBytes));
  });

  it('falls back to Azure tts-hd when audio 1.5 is disabled', async () => {
    setTtsAudio15Flag(false);

    const azureBytes = Uint8Array.from([9, 8]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => azureBytes.buffer,
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const response = await POST(createRequest({ text: 'Fallback to azure' }) as any);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/audio/speech'),
      expect.any(Object),
    );

    expect(response.status).toBe(200);
    const buffer = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(buffer)).toEqual(Array.from(azureBytes));
  });

  it('falls back to OpenAI when Azure is not configured', async () => {
    setTtsAudio15Flag(false);
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_TTS_DEPLOYMENT;
    delete process.env.AZURE_OPENAI_AUDIO_DEPLOYMENT;

    const openAiBytes = Uint8Array.from([4, 5, 6]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => openAiBytes.buffer,
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const response = await POST(createRequest({ text: 'Use openai fallback' }) as any);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/speech',
      expect.any(Object),
    );

    expect(response.status).toBe(200);
    const buffer = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(buffer)).toEqual(Array.from(openAiBytes));
  });
});
