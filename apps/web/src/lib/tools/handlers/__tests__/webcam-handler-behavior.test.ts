import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerToolHandler } from '../../tool-executor';
import { tierService } from '@/lib/tier/server';
import { logger } from '@/lib/logger';
import { analyzeImageWithVision } from '../webcam-handler';

vi.mock('../../tool-executor', () => ({ registerToolHandler: vi.fn() }));
vi.mock('@/lib/tier/server', () => ({
  tierService: { getFeatureAIConfigForUser: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

const fetchMock = vi.fn();
const handler = vi
  .mocked(registerToolHandler)
  .mock.calls.find(([name]) => name === 'capture_webcam')?.[1];
if (!handler) throw new Error('Webcam handler was not registered');
const context = { userId: 'student', maestroId: 'galileo', conversationId: 'conversation' };
const runHandler = (args: Record<string, unknown>) => handler(args, context);
const response = (content: string) => Response.json({ choices: [{ message: { content } }] });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
  vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://azure.example');
  vi.stubEnv('AZURE_OPENAI_VISION_DEPLOYMENT', 'vision');
  vi.stubEnv('AZURE_OPENAI_DEPLOYMENT', 'chat');
  vi.stubEnv('AZURE_OPENAI_API_VERSION', '2026-01-01');
  vi.mocked(tierService.getFeatureAIConfigForUser).mockResolvedValue({
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 512,
  });
  fetchMock.mockResolvedValue(
    response(JSON.stringify({ text: 'F=ma', description: 'Force diagram' })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('registered webcam handler', () => {
  it.each([{}, { imageBase64: null }, { imageBase64: '' }, { imageBase64: 42 }])(
    'rejects missing and non-string input %j without contacting Azure',
    async (args) => {
      expect(await runHandler(args)).toMatchObject({
        success: false,
        toolType: 'webcam',
        error: 'imageBase64 is required and must be a base64 string',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(['invalid!@', 'data:text/plain;base64,SGVsbG8=', 'data:image/webp;base64,SGVsbG8='])(
    'rejects unsupported image input %s',
    async (imageBase64) => {
      expect(await runHandler({ imageBase64 })).toMatchObject({
        success: false,
        error: 'Invalid base64 image format',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(['SGVsbG8=', 'data:image/png;base64,SGVsbG8='])(
    'returns extracted educational content and uses tier settings for %s',
    async (imageBase64) => {
      const result = await runHandler({ imageBase64 });
      expect(result).toMatchObject({
        success: true,
        toolType: 'webcam',
        data: {
          imageBase64,
          extractedText: 'F=ma',
          imageDescription: 'Force diagram',
          analysisTimestamp: expect.any(Date),
        },
      });
      expect(tierService.getFeatureAIConfigForUser).toHaveBeenCalledWith('student', 'webcam');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://azure.example/openai/deployments/vision/chat/completions?api-version=2026-01-01',
        expect.objectContaining({
          method: 'POST',
          headers: { 'api-key': 'test-key', 'Content-Type': 'application/json' },
        }),
      );
      const request = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(request).toMatchObject({
        temperature: 0.2,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      });
      expect(request.messages[1].content[1].image_url.url).toBe(
        imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
      );
    },
  );

  it.each([new Error('offline'), 'offline'])(
    'reports analysis failures to callers',
    async (error) => {
      fetchMock.mockRejectedValue(error);
      expect(await runHandler({ imageBase64: 'SGVsbG8=' })).toMatchObject({
        success: false,
        error: error instanceof Error ? 'offline' : 'Unknown error during image analysis',
      });
      expect(logger.error).toHaveBeenCalledWith(
        '[Webcam Handler] Error during image analysis',
        undefined,
        error,
      );
    },
  );
});

describe('Azure vision adapter', () => {
  it.each(['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_DEPLOYMENT'])(
    'rejects missing %s',
    async (name) => {
      vi.stubEnv('AZURE_OPENAI_VISION_DEPLOYMENT', '');
      vi.stubEnv(name, '');
      await expect(analyzeImageWithVision('SGVsbG8=')).rejects.toThrow('configuration missing');
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('uses deployment/version defaults and anonymous tier when no user is supplied', async () => {
    vi.stubEnv('AZURE_OPENAI_VISION_DEPLOYMENT', '');
    vi.stubEnv('AZURE_OPENAI_API_VERSION', '');
    fetchMock.mockResolvedValue(response('{}'));
    expect(await analyzeImageWithVision('SGVsbG8=')).toEqual({ text: '', description: '' });
    expect(tierService.getFeatureAIConfigForUser).toHaveBeenCalledWith(null, 'webcam');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://azure.example/openai/deployments/chat/chat/completions?api-version=2024-08-01-preview',
    );
  });

  it.each([{}, { choices: [] }, { choices: [{}] }, { choices: [{ message: {} }] }])(
    'rejects a response with no model content: %j',
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body));
      await expect(analyzeImageWithVision('SGVsbG8=')).rejects.toThrow('No content');
    },
  );

  it('rejects malformed model JSON and records the parse failure', async () => {
    fetchMock.mockResolvedValue(response('{broken'));
    await expect(analyzeImageWithVision('SGVsbG8=')).rejects.toThrow('Invalid JSON response');
    expect(logger.error).toHaveBeenCalledWith(
      '[Webcam Handler] Failed to parse Vision API response',
      { content: '{broken' },
      expect.any(SyntaxError),
    );
  });

  it('sanitizes upstream HTTP failures before surfacing the error', async () => {
    fetchMock.mockResolvedValue(new Response('private upstream text', { status: 503 }));
    await expect(analyzeImageWithVision('SGVsbG8=')).rejects.toMatchObject({
      name: 'AzureHttpError',
    });
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(
      'private upstream text',
    );
  });
});
