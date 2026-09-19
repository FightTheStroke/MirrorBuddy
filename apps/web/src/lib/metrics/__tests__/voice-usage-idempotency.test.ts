import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});
import { prisma } from '@/lib/db';
import { recordVoiceUsage } from '../voice-usage-service';
import { voiceUsageKey } from '../voice-usage-identity';

const input = {
  userId: 'user-1',
  sessionId: 'session-1',
  responseId: 'resp-1',
  model: 'gpt-realtime-mini',
  usage: {
    input_token_details: { audio_tokens: 100 },
    output_token_details: { audio_tokens: 200 },
  },
};
const stored = {
  id: voiceUsageKey(input.userId, input.sessionId, input.responseId),
  userId: input.userId,
  sessionId: input.sessionId,
  model: input.model,
  maestroId: null,
  audioInputTokens: 100,
  audioOutputTokens: 200,
  textInputTokens: 0,
  textOutputTokens: 0,
  cachedInputTokens: 0,
  costEur: 0.005,
  periodDay: '2026-09-19',
  periodMonth: '2026-09',
  isTestData: false,
  createdAt: new Date(),
};
beforeEach(() => vi.resetAllMocks());

describe('durable voice response identity contract', () => {
  it('uses the existing primary key for the authenticated user/session/response', async () => {
    vi.mocked(prisma.voiceUsageEvent.create).mockResolvedValue(stored);
    await recordVoiceUsage(input);
    expect(vi.mocked(prisma.voiceUsageEvent.create).mock.calls[0][0].data.id).toBe(
      voiceUsageKey('user-1', 'session-1', 'resp-1'),
    );
  });
  it('does not return success-shaped null on a storage failure', async () => {
    const failure = new Error('Owned storage unavailable');
    vi.mocked(prisma.voiceUsageEvent.create).mockRejectedValue(failure);
    await expect(recordVoiceUsage(input)).rejects.toBe(failure);
  });
  it('namespaces identity across accounts and sessions', () => {
    expect(
      new Set([
        voiceUsageKey('user-1', 'session-1', 'resp-1'),
        voiceUsageKey('user-2', 'session-1', 'resp-1'),
        voiceUsageKey('user-1', 'session-2', 'resp-1'),
        voiceUsageKey('user-1', 'session-1', 'resp-2'),
      ]).size,
    ).toBe(4);
  });
  it('returns the committed receipt on unique-key replay without updating it', async () => {
    vi.mocked(prisma.voiceUsageEvent.create).mockRejectedValue(
      Object.assign(new Error('duplicate'), { code: 'P2002' }),
    );
    vi.mocked(prisma.voiceUsageEvent.findUnique).mockResolvedValue(stored);
    expect((await recordVoiceUsage(input))?.costEur).toBe(stored.costEur);
    expect(prisma.voiceUsageEvent.update).not.toHaveBeenCalled();
  });
  it('rejects conflicting data instead of mutating a committed response', async () => {
    vi.mocked(prisma.voiceUsageEvent.create).mockRejectedValue(
      Object.assign(new Error('duplicate'), { code: 'P2002' }),
    );
    vi.mocked(prisma.voiceUsageEvent.findUnique).mockResolvedValue({
      ...stored,
      audioOutputTokens: 999,
    });
    await expect(recordVoiceUsage(input)).rejects.toThrow('different usage');
  });
  it('does not swallow another unique failure without its own committed row', async () => {
    const failure = Object.assign(new Error('other unique failure'), { code: 'P2002' });
    vi.mocked(prisma.voiceUsageEvent.create).mockRejectedValue(failure);
    vi.mocked(prisma.voiceUsageEvent.findUnique).mockResolvedValue(null);
    await expect(recordVoiceUsage(input)).rejects.toBe(failure);
  });
  it('allows a failed attempt to be retried with exactly the same identity', async () => {
    vi.mocked(prisma.voiceUsageEvent.create)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(stored);
    await expect(recordVoiceUsage(input)).rejects.toThrow('offline');
    expect((await recordVoiceUsage(input))?.costEur).toBeGreaterThan(0);
    const attempts = vi.mocked(prisma.voiceUsageEvent.create).mock.calls;
    expect(attempts[0][0].data.id).toBe(attempts[1][0].data.id);
  });
  it.each([null, undefined])('rejects nullish input: %s', async (value) => {
    await expect(recordVoiceUsage(value)).rejects.toThrow('Invalid voice usage identity');
    expect(prisma.voiceUsageEvent.create).not.toHaveBeenCalled();
  });
});
