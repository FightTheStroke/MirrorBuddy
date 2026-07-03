/**
 * @vitest-environment node
 *
 * Integration tests for T1.5: the dedicated jailbreak detector now runs as an
 * INPUT gate on /api/chat. filterInput already blocks obvious JAILBREAK_PATTERNS;
 * this gate runs the sophisticated detector AFTER it and blocks (fail-closed,
 * pre-LLM) when the detector's own action is block/terminate_session. Low/medium
 * 'warn' detections pass through (no over-blocking). detectJailbreak is mocked so
 * the gate — not filterInput's regex — is what the test exercises.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Sandbox: stub the generated prisma client (engine egress-blocked) so the
// module graph loads; @/lib/db (the query surface) is mocked below.
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

vi.mock('@/lib/trial/trial-budget-service', () => ({
  incrementTrialBudgetWithPublish: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/safety/server', () => ({
  logSafetyEvent: vi.fn(),
  escalateCrisisDetected: vi.fn(),
  notifyParentOfCrisis: vi.fn(),
  recordComplianceCrisisDetected: vi.fn().mockResolvedValue(undefined),
  recordSessionStart: vi.fn().mockResolvedValue(undefined),
  recordMessage: vi.fn().mockResolvedValue(undefined),
  recordContentFiltered: vi.fn().mockResolvedValue(undefined),
}));

// Keep the real safety module (filterInput/sanitizeOutput/getJailbreakResponse/
// buildContext) but let tests drive detectJailbreak + detectBias.
vi.mock('@/lib/safety', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/safety')>();
  return {
    ...actual,
    detectJailbreak: vi.fn(),
    detectBias: vi.fn(),
  };
});

import { POST } from '../route';
import { chatCompletion } from '@/lib/ai/server';
import { detectJailbreak, detectBias, type JailbreakDetection } from '@/lib/safety';
import { recordContentFiltered } from '@/lib/safety/server';

const SAFE_OUTPUT_BIAS = {
  hasBias: false,
  riskScore: 0,
  detections: [],
  safeForEducation: true,
  analyzedLength: 10,
};

const NO_JAILBREAK: JailbreakDetection = {
  detected: false,
  threatLevel: 'none',
  confidence: 0,
  categories: [],
  triggers: [],
  action: 'allow',
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Benign to filterInput (no JAILBREAK_PATTERN match) so the dedicated detector
// gate — not filterInput's regex — is what the test exercises.
const BENIGN_BODY = {
  messages: [{ role: 'user', content: 'Ciao, spiegami le frazioni' }],
  systemPrompt: 'You are MirrorBuddy',
  maestroId: 'leonardo',
  conversationId: 'conv-1',
  enableTools: false,
};

describe('POST /api/chat jailbreak input gate (T1.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(detectBias).mockReturnValue(SAFE_OUTPUT_BIAS);
    vi.mocked(detectJailbreak).mockReturnValue(NO_JAILBREAK);
    vi.mocked(chatCompletion).mockResolvedValue({
      content: 'Le frazioni rappresentano parti di un intero.',
      provider: 'azure',
      model: 'gpt-5-mini',
      usage: { total_tokens: 12, prompt_tokens: 6, completion_tokens: 6 },
    } as never);
  });

  it('blocks a high-threat jailbreak BEFORE the LLM call and returns the safe redirect', async () => {
    vi.mocked(detectJailbreak).mockReturnValue({
      detected: true,
      threatLevel: 'high',
      confidence: 0.8,
      categories: ['encoding_bypass'],
      triggers: ['Encoded content detected: base64'],
      action: 'block',
    });

    const response = await POST(makeRequest(BENIGN_BODY));
    const data = await response.json();

    expect(data.blocked).toBe(true);
    expect(data.category).toBe('jailbreak');
    expect(data.provider).toBe('safety_filter');
    expect(data.model).toBe('jailbreak-detector');
    // Fail-closed: the model must NOT be called on a blocked jailbreak.
    expect(vi.mocked(chatCompletion)).not.toHaveBeenCalled();
    expect(vi.mocked(recordContentFiltered)).toHaveBeenCalledWith(
      'jailbreak',
      expect.objectContaining({ actionTaken: 'blocked', maestroId: 'leonardo' }),
    );
  });

  it('blocks a critical (terminate_session) jailbreak', async () => {
    vi.mocked(detectJailbreak).mockReturnValue({
      detected: true,
      threatLevel: 'critical',
      confidence: 0.95,
      categories: ['code_injection', 'instruction_ignore'],
      triggers: ['multiple'],
      action: 'terminate_session',
    });

    const response = await POST(makeRequest(BENIGN_BODY));
    const data = await response.json();

    expect(data.blocked).toBe(true);
    expect(data.category).toBe('jailbreak');
    expect(vi.mocked(chatCompletion)).not.toHaveBeenCalled();
  });

  it('does NOT block a low/medium (warn) detection — no over-blocking legitimate play', async () => {
    vi.mocked(detectJailbreak).mockReturnValue({
      detected: true,
      threatLevel: 'medium',
      confidence: 0.4,
      categories: ['hypothetical_framing'],
      triggers: ['in a fictional world'],
      action: 'warn',
    });

    const response = await POST(makeRequest(BENIGN_BODY));
    const data = await response.json();

    expect(data.blocked).toBeUndefined();
    expect(data.content).toBe('Le frazioni rappresentano parti di un intero.');
    expect(vi.mocked(chatCompletion)).toHaveBeenCalled();
    expect(vi.mocked(recordContentFiltered)).not.toHaveBeenCalled();
  });

  it('passes safe input straight through to the model (no over-blocking)', async () => {
    const response = await POST(makeRequest(BENIGN_BODY));
    const data = await response.json();

    expect(data.blocked).toBeUndefined();
    expect(data.content).toBe('Le frazioni rappresentano parti di un intero.');
    expect(vi.mocked(chatCompletion)).toHaveBeenCalled();
  });
});
