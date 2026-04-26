import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assignBucket } from '../bucketing';

const { mockABExperiment, mockConversation } = vi.hoisted(() => ({
  mockABExperiment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  mockConversation: {
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return {
    prisma: {
      ...createMockPrisma(),
      aBExperiment: mockABExperiment,
      conversation: mockConversation,
    },
  };
});

import { __resetActiveExperimentsCacheForTests } from '../ab-service';
import { injectABMetadata } from '../session-injector';

describe('A/B chat integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetActiveExperimentsCacheForTests();
  });

  it('writes conversation AB metadata and returns matching model override', async () => {
    const experimentId = 'exp-1';
    const userId = 'user-42';
    const conversationId = 'conversation-42';
    const bucketConfigs = [
      {
        bucketLabel: 'control',
        percentage: 50,
        modelProvider: 'azure',
        modelName: 'gpt-4.1-mini',
        extraConfig: { temperature: 0.1 },
      },
      {
        bucketLabel: 'variant',
        percentage: 50,
        modelProvider: 'azure',
        modelName: 'gpt-5-mini',
        extraConfig: { temperature: 0.3 },
      },
    ];

    mockABExperiment.findMany.mockResolvedValue([
      { id: experimentId, status: 'active', bucketConfigs },
    ]);

    const result = await injectABMetadata(userId, conversationId);

    const expectedBucket = assignBucket(userId, experimentId, {
      control: [0, 49],
      variant: [50, 99],
    });
    const expectedConfig = bucketConfigs.find((config) => config.bucketLabel === expectedBucket);

    expect(expectedConfig).toBeDefined();
    expect(mockConversation.update).toHaveBeenCalledWith({
      where: { id: conversationId },
      data: {
        abExperimentId: experimentId,
        abBucketLabel: expectedBucket,
      },
    });
    expect(result).toEqual({
      experimentId,
      bucketLabel: expectedBucket,
      modelProvider: expectedConfig?.modelProvider,
      modelName: expectedConfig?.modelName,
      extraConfig: expectedConfig?.extraConfig,
    });
  });

  it('returns null when no active experiment exists', async () => {
    mockABExperiment.findMany.mockResolvedValue([]);

    const result = await injectABMetadata('user-1', 'conversation-1');

    expect(result).toBeNull();
    expect(mockConversation.update).not.toHaveBeenCalled();
  });

  it('can be caught by caller without breaking chat flow when injection fails', async () => {
    mockABExperiment.findMany.mockRejectedValue(new Error('db down'));

    let modelOverride: string | null = null;

    await expect(
      (async () => {
        try {
          const override = await injectABMetadata('user-1', 'conversation-1');
          modelOverride = override?.modelName ?? null;
        } catch {
          // mirrors src/app/api/chat/route.ts non-blocking catch
        }
      })(),
    ).resolves.toBeUndefined();

    expect(modelOverride).toBeNull();
    expect(mockConversation.update).not.toHaveBeenCalled();
  });
});
