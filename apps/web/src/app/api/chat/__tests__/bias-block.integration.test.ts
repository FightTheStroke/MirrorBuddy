/**
 * @vitest-environment node
 *
 * Integration tests for T1.4: bias detection on AI output now BLOCKS.
 * When detectBias reports bias that is not safe for education, the route
 * replaces the biased text with the existing safe redirect (SAFE_RESPONSES)
 * instead of returning it to the child, and records the content-filter event.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Sandbox: the generated prisma client is unavailable (engine egress-blocked),
// and the route pulls @prisma/client transitively for types/enums. Stub it so
// the module graph loads; @/lib/db (the actual query surface) is mocked below.
vi.mock('@prisma/client', () => {
  const makeProxy = (): unknown =>
    new Proxy(function () {}, {
      get: (_t, p) => (p === Symbol.toPrimitive ? () => '' : makeProxy()),
      apply: () => makeProxy(),
      construct: () => ({}),
    });
  return { Prisma: makeProxy(), PrismaClient: class {}, default: {} };
});

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/ai/server', () => ({
  chatCompletion: vi.fn(),
  getActiveProvider: vi.fn(() => ({ provider: 'azure' })),
  getDeploymentForModel: vi.fn((model: string) => model),
  assessResponseTransparency: vi.fn(() => ({
    confidence: 'high',
    citations: [],
    hallucinationRisk: { indicators: [] },
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ success: true }),
  getClientIdentifier: vi.fn().mockReturnValue('test-client'),
  RATE_LIMITS: { CHAT: { maxRequests: 100, windowMs: 60000 } },
  rateLimitResponse: vi.fn(),
}));

vi.mock('../auth-handler', () => ({
  extractUserIdWithCoppaCheck: vi.fn().mockResolvedValue({
    allowed: true,
    userId: 'user-123',
  }),
}));

vi.mock('../trial-handler', () => ({
  checkTrialForAnonymous: vi.fn().mockResolvedValue({ allowed: true }),
  incrementTrialUsage: vi.fn(),
  incrementTrialToolUsage: vi.fn(),
  checkTrialToolLimit: vi.fn(),
}));

vi.mock('../budget-handler', () => ({
  loadUserSettings: vi.fn().mockResolvedValue(null),
  checkBudgetLimit: vi.fn().mockReturnValue(null),
  checkBudgetWarning: vi.fn(),
  updateBudget: vi.fn(),
}));

vi.mock('../context-builders', () => ({
  buildAllContexts: vi.fn().mockResolvedValue({
    enhancedPrompt: 'system prompt',
    hasMemory: false,
    hasToolContext: false,
    hasRAG: false,
    ragResultsForTransparency: [],
  }),
}));

vi.mock('@/lib/tier/server', () => ({
  tierService: {
    getModelForUserFeature: vi.fn().mockResolvedValue('gpt-5-mini'),
    getEffectiveTier: vi.fn().mockResolvedValue({ code: 'base' }),
  },
}));

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

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
}));

// Full manual mock (avoids loading the real prisma/email chain in the sandbox)
vi.mock('@/lib/safety/server', () => ({
  logSafetyEvent: vi.fn(),
  escalateCrisisDetected: vi.fn(),
  notifyParentOfCrisis: vi.fn(),
  recordComplianceCrisisDetected: vi.fn().mockResolvedValue(undefined),
  recordSessionStart: vi.fn().mockResolvedValue(undefined),
  recordMessage: vi.fn().mockResolvedValue(undefined),
  recordContentFiltered: vi.fn().mockResolvedValue(undefined),
}));

// Keep the real safety module (filterInput/sanitizeOutput/checkSTEMSafety/
// SAFE_RESPONSES) but let tests drive detectBias.
vi.mock('@/lib/safety', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/safety')>();
  return {
    ...actual,
    detectBias: vi.fn(),
  };
});

import { POST } from '../route';
import { chatCompletion } from '@/lib/ai/server';
import { detectBias, SAFE_RESPONSES } from '@/lib/safety';
import { recordContentFiltered } from '@/lib/safety/server';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const BENIGN_BODY = {
  messages: [{ role: 'user', content: 'Ciao, spiegami le frazioni' }],
  systemPrompt: 'You are MirrorBuddy',
  maestroId: 'leonardo',
  conversationId: 'conv-1',
  enableTools: false,
};

describe('POST /api/chat bias output blocking (T1.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chatCompletion).mockResolvedValue({
      content: 'Le ragazze non sono brave in matematica.',
      provider: 'azure',
      model: 'gpt-5-mini',
      usage: { total_tokens: 12, prompt_tokens: 6, completion_tokens: 6 },
    } as never);
  });

  it('blocks biased output and returns the safe redirect instead of the biased text', async () => {
    vi.mocked(detectBias).mockReturnValue({
      hasBias: true,
      riskScore: 45,
      detections: [
        {
          detected: true,
          category: 'gender',
          severity: 'high',
          match: 'ragazze non sono brave',
          reason: 'gender stereotype',
          suggestion: 'neutral phrasing',
        },
      ],
      safeForEducation: false,
      analyzedLength: 40,
    });

    const response = await POST(makeRequest(BENIGN_BODY));
    const data = await response.json();

    expect(data.blocked).toBe(true);
    expect(data.category).toBe('bias');
    expect(data.provider).toBe('safety_filter');
    expect(data.content).toBe(SAFE_RESPONSES.jailbreak);
    // The biased model text must NOT reach the child
    expect(data.content).not.toContain('ragazze');

    expect(vi.mocked(recordContentFiltered)).toHaveBeenCalledWith(
      'bias',
      expect.objectContaining({ actionTaken: 'blocked' }),
    );
  });

  it('passes safe output through unchanged (no over-blocking)', async () => {
    vi.mocked(detectBias).mockReturnValue({
      hasBias: false,
      riskScore: 0,
      detections: [],
      safeForEducation: true,
      analyzedLength: 10,
    });

    const response = await POST(makeRequest(BENIGN_BODY));
    const data = await response.json();

    expect(data.blocked).toBeUndefined();
    expect(data.content).toBe('Le ragazze non sono brave in matematica.');
    expect(vi.mocked(recordContentFiltered)).not.toHaveBeenCalled();
  });
});
