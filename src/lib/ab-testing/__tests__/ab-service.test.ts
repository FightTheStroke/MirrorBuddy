import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  __resetActiveExperimentsCacheForTests,
  getActiveExperiments,
  getExperimentConfig,
  resolveUserBucket,
} from '../ab-service';
import { injectABMetadata } from '../session-injector';

describe('ab-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetActiveExperimentsCacheForTests();
  });

  it('injectABMetadata returns null when no active experiment exists', async () => {
    mockABExperiment.findMany.mockResolvedValue([]);

    const result = await injectABMetadata('user-1', 'conversation-1');

    expect(result).toBeNull();
    expect(mockConversation.update).not.toHaveBeenCalled();
  });

  it('injectABMetadata writes AB metadata fields to conversation', async () => {
    mockABExperiment.findMany.mockResolvedValue([
      {
        id: 'exp-10',
        status: 'active',
        bucketConfigs: [
          {
            bucketLabel: 'control',
            percentage: 100,
            modelProvider: 'azure',
            modelName: 'gpt-4.1',
            extraConfig: { temperature: 0.1 },
          },
        ],
      },
    ]);

    const result = await injectABMetadata('user-1', 'conversation-1');

    expect(mockConversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: {
        abExperimentId: 'exp-10',
        abBucketLabel: 'control',
      },
    });
    expect(result).toEqual({
      experimentId: 'exp-10',
      bucketLabel: 'control',
      modelProvider: 'azure',
      modelName: 'gpt-4.1',
      extraConfig: { temperature: 0.1 },
    });
  });

  it('getActiveExperiments caches active experiments for 60 seconds', async () => {
    vi.useFakeTimers();
    mockABExperiment.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        status: 'active',
        bucketConfigs: [
          {
            bucketLabel: 'control',
            percentage: 100,
            modelProvider: 'azure',
            modelName: 'gpt-4.1',
            extraConfig: {},
          },
        ],
      },
    ]);

    const first = await getActiveExperiments();
    const second = await getActiveExperiments();

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(mockABExperiment.findMany).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_001);
    await getActiveExperiments();

    expect(mockABExperiment.findMany).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('getExperimentConfig returns the requested experiment with bucket config', async () => {
    mockABExperiment.findUnique.mockResolvedValue({
      id: 'exp-2',
      status: 'active',
      bucketConfigs: [
        {
          bucketLabel: 'treatment',
          percentage: 100,
          modelProvider: 'openai',
          modelName: 'gpt-5-mini',
          extraConfig: { temperature: 0.2 },
        },
      ],
    });

    const config = await getExperimentConfig('exp-2');

    expect(config?.id).toBe('exp-2');
    expect(config?.bucketConfigs[0].modelProvider).toBe('openai');
    expect(mockABExperiment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'exp-2' } }),
    );
  });

  it('resolveUserBucket returns model provider and model for the assigned bucket', async () => {
    mockABExperiment.findUnique.mockResolvedValue({
      id: 'exp-3',
      status: 'active',
      bucketConfigs: [
        {
          bucketLabel: 'control',
          percentage: 100,
          modelProvider: 'azure',
          modelName: 'gpt-4.1',
          extraConfig: { temperature: 0.3 },
        },
      ],
    });

    const resolved = await resolveUserBucket('user-1', 'exp-3');

    expect(resolved).toEqual({
      bucketLabel: 'control',
      modelProvider: 'azure',
      modelName: 'gpt-4.1',
      extraConfig: { temperature: 0.3 },
    });
  });
});
