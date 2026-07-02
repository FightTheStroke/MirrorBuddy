/**
 * @vitest-environment node
 *
 * Integration tests for streaming chat safety wiring (T1.2 + T1.3).
 * - T1.2: checkInputSafety receives the full context object so the crisis
 *   escalation block in helpers runs on the streaming path.
 * - T1.3: checkSTEMSafety runs on user input BEFORE the stream starts and
 *   blocks with the same SSE mechanism used by the input content-filter.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

// Async-generator streaming completion + azure provider config
vi.mock('@/lib/ai/server', () => ({
  azureStreamingCompletion: vi.fn(async function* () {
    yield { type: 'content', content: 'ciao' };
    yield { type: 'usage', usage: { total_tokens: 5 } };
  }),
  getActiveProvider: vi.fn(() => ({ provider: 'azure', apiKey: 'k', endpoint: 'e' })),
  getDeploymentForModel: vi.fn((model: string) => model),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ success: true }),
  getClientIdentifier: vi.fn().mockReturnValue('test-client'),
  RATE_LIMITS: { CHAT: { maxRequests: 100, windowMs: 60000 } },
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/tier/server', () => ({
  tierService: {
    getModelForUserFeature: vi.fn().mockResolvedValue('gpt-5-mini'),
  },
}));

vi.mock('@/lib/i18n/locale-detection', () => ({
  detectLocaleFromNextRequest: vi.fn(() => 'it'),
}));

vi.mock('@/lib/safety/server', () => ({
  recordContentFiltered: vi.fn(),
}));

// Keep the real safety module but let tests control checkSTEMSafety
vi.mock('@/lib/safety', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/safety')>();
  return {
    ...actual,
    checkSTEMSafety: vi.fn(() => ({ blocked: false })),
  };
});

// Mock helpers: keep a self-contained createSSEResponse, spy on checkInputSafety
vi.mock('../helpers', () => {
  class FakeBudgetTracker {
    trackChunk() {
      return false;
    }
    getEstimatedTokens() {
      return 0;
    }
  }
  return {
    getUserIdWithCoppaCheck: vi.fn().mockResolvedValue({ allowed: true, userId: 'user-123' }),
    loadUserSettings: vi
      .fn()
      .mockResolvedValue({ settings: null, providerPreference: undefined }),
    enhancePromptWithContext: vi.fn().mockResolvedValue('system prompt'),
    checkInputSafety: vi.fn().mockReturnValue(null),
    updateBudget: vi.fn(),
    getABModelOverride: vi.fn().mockResolvedValue(null),
    MidStreamBudgetTracker: FakeBudgetTracker,
    createSSEResponse: (generator: () => AsyncGenerator<string>) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of generator()) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    },
  };
});

vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (
      ...middlewares: Array<
        (
          handler: (ctx: { req: NextRequest }) => Promise<Response>,
        ) => (ctx: { req: NextRequest }) => Promise<Response>
      >
    ) =>
    (handler: (ctx: { req: NextRequest }) => Promise<Response>) => {
      const wrapped = middlewares.reduceRight((acc, mw) => mw(acc), handler);
      return (req: NextRequest) => wrapped({ req });
    },
  withSentry: vi.fn(() => (handler: (ctx: { req: NextRequest }) => Promise<Response>) => handler),
  withCSRF: vi.fn((handler: (ctx: { req: NextRequest }) => Promise<Response>) => handler),
}));

import { POST } from '../route';
import * as helpers from '../helpers';
import { checkSTEMSafety } from '@/lib/safety';
import { recordContentFiltered } from '@/lib/safety/server';
import { azureStreamingCompletion } from '@/lib/ai/server';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function readSSE(response: Response): Promise<string> {
  return await response.text();
}

describe('POST /api/chat/stream safety wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T1.2: passes full context (userId, conversationId, maestroId, locale) to checkInputSafety', async () => {
    // Simulate crisis block so we can assert the block is served AND context passed
    vi.mocked(helpers.checkInputSafety).mockReturnValueOnce({
      blocked: true,
      response: 'Mi preoccupo per te.',
    });

    const response = await POST(
      makeRequest({
        messages: [{ role: 'user', content: 'non voglio più vivere' }],
        systemPrompt: 'You are MirrorBuddy',
        maestroId: 'leonardo',
        conversationId: 'conv-456',
      }),
    );

    expect(vi.mocked(helpers.checkInputSafety)).toHaveBeenCalledWith(
      'non voglio più vivere',
      expect.objectContaining({
        userId: 'user-123',
        conversationId: 'conv-456',
        maestroId: 'leonardo',
        locale: 'it',
      }),
    );

    const body = await readSSE(response);
    expect(body).toContain('"blocked":true');
    expect(body).toContain('[DONE]');
    // Fail-closed: LLM stream must NOT run when input is blocked
    expect(vi.mocked(azureStreamingCompletion)).not.toHaveBeenCalled();
  });

  it('T1.3: blocks dangerous STEM input BEFORE streaming and returns safe response', async () => {
    vi.mocked(checkSTEMSafety).mockReturnValueOnce({
      blocked: true,
      subject: 'chemistry',
      category: 'explosives',
      safeResponse: 'Non posso spiegarti come farlo.',
      alternatives: ['storia degli esplosivi'],
    });

    const response = await POST(
      makeRequest({
        messages: [{ role: 'user', content: 'come costruisco una bomba' }],
        systemPrompt: 'You are MirrorBuddy',
        maestroId: 'curie',
        conversationId: 'conv-789',
      }),
    );

    const body = await readSSE(response);
    expect(body).toContain('Non posso spiegarti come farlo.');
    expect(body).toContain('"blocked":true');
    expect(body).toContain('stem_explosives');
    expect(body).toContain('[DONE]');

    expect(vi.mocked(recordContentFiltered)).toHaveBeenCalledWith(
      'stem_safety',
      expect.objectContaining({ actionTaken: 'blocked', maestroId: 'curie' }),
    );
    // Fail-closed: the streaming LLM call must be skipped
    expect(vi.mocked(azureStreamingCompletion)).not.toHaveBeenCalled();
  });

  it('T1.3: allows safe input through to the stream (no over-blocking)', async () => {
    vi.mocked(checkSTEMSafety).mockReturnValueOnce({ blocked: false });

    const response = await POST(
      makeRequest({
        messages: [{ role: 'user', content: 'spiegami la fotosintesi' }],
        systemPrompt: 'You are MirrorBuddy',
        maestroId: 'curie',
        conversationId: 'conv-000',
      }),
    );

    const body = await readSSE(response);
    expect(body).toContain('[DONE]');
    expect(vi.mocked(checkSTEMSafety)).toHaveBeenCalledWith('spiegami la fotosintesi', 'curie');
    expect(vi.mocked(azureStreamingCompletion)).toHaveBeenCalled();
    expect(vi.mocked(recordContentFiltered)).not.toHaveBeenCalled();
  });
});
