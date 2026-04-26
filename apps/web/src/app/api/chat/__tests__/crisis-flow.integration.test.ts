/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/ai/server', () => ({
  chatCompletion: vi.fn(),
  getActiveProvider: vi.fn(),
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

vi.mock('@/lib/safety/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/safety/server')>();
  return {
    ...actual,
    logSafetyEvent: vi.fn(actual.logSafetyEvent),
    escalateCrisisDetected: vi.fn(actual.escalateCrisisDetected),
    notifyParentOfCrisis: vi.fn(actual.notifyParentOfCrisis),
    recordComplianceCrisisDetected: vi.fn().mockResolvedValue(undefined),
    recordSessionStart: vi.fn().mockResolvedValue(undefined),
    recordMessage: vi.fn().mockResolvedValue(undefined),
    recordContentFiltered: vi.fn().mockResolvedValue(undefined),
  };
});

import { POST } from '../route';
import * as safetyServer from '@/lib/safety/server';
import { chatCompletion } from '@/lib/ai/server';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/db';

describe('POST /api/chat crisis pipeline integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.coppaConsent.findFirst).mockResolvedValue({
      parentEmail: 'parent@example.com',
    } as never);
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({
      guardianEmail: null,
    } as never);
    vi.mocked(prisma.safetyEvent.findFirst).mockResolvedValue({ id: 'evt-1' } as never);
    vi.mocked(prisma.safetyEvent.update).mockResolvedValue({} as never);
  });

  it('blocks crisis input, skips LLM, logs and escalates with parent notification', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'non voglio più vivere' }],
        systemPrompt: 'You are MirrorBuddy',
        maestroId: 'leonardo',
        conversationId: 'conv-456',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blocked).toBe(true);
    expect(data.category).toBe('crisis');
    expect(data.content).toMatch(/Telefono Azzurro|19696/i);

    expect(vi.mocked(chatCompletion)).not.toHaveBeenCalled();

    expect(vi.mocked(safetyServer.logSafetyEvent)).toHaveBeenCalledWith(
      'crisis_detected',
      'critical',
      expect.objectContaining({
        userId: 'user-123',
        sessionId: 'conv-456',
        category: 'crisis',
      }),
    );

    expect(vi.mocked(safetyServer.escalateCrisisDetected)).toHaveBeenCalledWith(
      'user-123',
      'conv-456',
      expect.objectContaining({ maestroId: 'leonardo' }),
    );

    await vi.waitFor(() => {
      expect(vi.mocked(safetyServer.notifyParentOfCrisis)).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          category: 'crisis',
          severity: 'critical',
          maestroId: 'leonardo',
        }),
      );
    });

    await vi.waitFor(() => {
      expect(vi.mocked(sendEmail)).toHaveBeenCalled();
    });
  });
});
