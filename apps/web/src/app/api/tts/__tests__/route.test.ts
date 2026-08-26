import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Buffer } from 'buffer';
import { POST } from '../route';
import type { FeatureFlagCheckResult, KnownFeatureFlag } from '@/lib/feature-flags/types';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';
import { logger } from '@/lib/logger';

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

  it('falls back to tts-hd when gpt-audio-1.5 fails at runtime (#216)', async () => {
    setTtsAudio15Flag(true);

    const azureBytes = Uint8Array.from([7, 7]);
    const mockFetch = vi
      .fn()
      // 1st call: gpt-audio-1.5 chat/completions fails
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'audio model unavailable',
      })
      // 2nd call: tts-hd audio/speech succeeds
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => azureBytes.buffer,
      });
    global.fetch = mockFetch as unknown as typeof fetch;

    const response = await POST(createRequest({ text: 'Fallback please' }) as any);

    expect(mockFetch.mock.calls[0][0]).toContain('/chat/completions');
    expect(mockFetch.mock.calls[1][0]).toContain('/audio/speech');
    expect(response.status).toBe(200);
    const buffer = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(buffer)).toEqual(Array.from(azureBytes));
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

/**
 * Who spoke, and where.
 *
 * The fallback ladder ends at api.openai.com, which is not in the EU. Until
 * these headers existed the route answered 200 with an audio body and no way —
 * for the caller, for the operator reading logs afterwards, or for anyone
 * asked a data-residency question — to tell whether a child's sentence had
 * stayed on Azure EU. The fallback itself is right (silence would be worse for
 * the student); its invisibility was the defect.
 */
describe('/api/tts POST - which provider actually spoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      AZURE_OPENAI_ENDPOINT: 'https://azure.example.com',
      AZURE_OPENAI_API_KEY: 'test-azure-key',
      AZURE_OPENAI_TTS_DEPLOYMENT: 'azure-tts-hd',
      OPENAI_API_KEY: 'openai-test-key',
    };
    delete process.env.AZURE_OPENAI_AUDIO_DEPLOYMENT;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    global.fetch = ORIGINAL_FETCH;
  });

  it('declares azure-eu when Azure served the request', async () => {
    setTtsAudio15Flag(false);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1]).buffer,
    }) as unknown as typeof fetch;

    const response = await POST(createRequest({ text: 'ciao' }) as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-TTS-Provider')).toBe('azure');
    expect(response.headers.get('X-TTS-Requested-Provider')).toBe('azure');
    expect(response.headers.get('X-TTS-Data-Residency')).toBe('azure-eu');
  });

  it('says openai-global when the text left the EU, and does not pretend Azure answered', async () => {
    setTtsAudio15Flag(false);
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'azure down' })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Uint8Array.from([2]).buffer });
    global.fetch = mockFetch as unknown as typeof fetch;

    const response = await POST(createRequest({ text: 'ciao' }) as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-TTS-Provider')).toBe('openai');
    // The request we MEANT to make is still visible: a header that only reported
    // the winner would hide that a fallback happened at all.
    expect(response.headers.get('X-TTS-Requested-Provider')).toBe('azure');
    expect(response.headers.get('X-TTS-Data-Residency')).toBe('openai-global');
  });

  it('logs leaving the EU at error level, not as a routine warning', async () => {
    setTtsAudio15Flag(false);
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'azure down' })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Uint8Array.from([3]).buffer });
    global.fetch = mockFetch as unknown as typeof fetch;

    await POST(createRequest({ text: 'ciao' }) as any);

    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining('OUT of the EU'),
      expect.objectContaining({
        requested: 'azure',
        servedBy: 'openai',
        residency: 'openai-global',
      }),
    );
  });

  it('when only OpenAI is configured there is no fallback to report, but residency is still stated', async () => {
    setTtsAudio15Flag(false);
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_TTS_DEPLOYMENT;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([4]).buffer,
    }) as unknown as typeof fetch;

    const response = await POST(createRequest({ text: 'ciao' }) as any);

    expect(response.headers.get('X-TTS-Provider')).toBe('openai');
    expect(response.headers.get('X-TTS-Requested-Provider')).toBe('openai');
    expect(response.headers.get('X-TTS-Data-Residency')).toBe('openai-global');
    expect(vi.mocked(logger.error)).not.toHaveBeenCalled();
  });
});
