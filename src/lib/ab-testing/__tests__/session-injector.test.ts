import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConversation, mockGetActiveExperiments, mockResolveUserBucket } = vi.hoisted(() => ({
  mockConversation: {
    update: vi.fn(),
  },
  mockGetActiveExperiments: vi.fn(),
  mockResolveUserBucket: vi.fn(),
}));

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return {
    prisma: {
      ...createMockPrisma(),
      conversation: mockConversation,
    },
  };
});

vi.mock('../ab-service', () => ({
  getActiveExperiments: mockGetActiveExperiments,
  resolveUserBucket: mockResolveUserBucket,
}));

import { injectABMetadata } from '../session-injector';

describe('session-injector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no active experiments exist', async () => {
    mockGetActiveExperiments.mockResolvedValue([]);

    const result = await injectABMetadata('user-1', 'conversation-1');

    expect(result).toBeNull();
    expect(mockConversation.update).not.toHaveBeenCalled();
    expect(mockResolveUserBucket).not.toHaveBeenCalled();
  });

  it('writes conversation metadata and returns model override', async () => {
    mockGetActiveExperiments.mockResolvedValue([{ id: 'exp-1' }]);
    mockResolveUserBucket.mockResolvedValue({
      bucketLabel: 'treatment',
      modelProvider: 'azure',
      modelName: 'gpt-4.1',
      extraConfig: { temperature: 0.2 },
    });

    const result = await injectABMetadata('user-1', 'conversation-1');

    expect(mockResolveUserBucket).toHaveBeenCalledWith('user-1', 'exp-1');
    expect(mockConversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: {
        abExperimentId: 'exp-1',
        abBucketLabel: 'treatment',
      },
    });
    expect(result).toEqual({
      experimentId: 'exp-1',
      bucketLabel: 'treatment',
      modelProvider: 'azure',
      modelName: 'gpt-4.1',
      extraConfig: { temperature: 0.2 },
    });
  });
});
