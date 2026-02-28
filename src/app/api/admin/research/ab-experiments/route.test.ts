import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._fns: unknown[]) =>
    (handler: unknown) =>
      handler,
  withSentry: vi.fn(() => (ctx: unknown) => ctx),
  withCSRF: vi.fn(() => (ctx: unknown) => ctx),
  withAdmin: vi.fn(() => (ctx: unknown) => ctx),
  withAdminReadOnly: vi.fn(() => (ctx: unknown) => ctx),
}));

type MockPrismaWithAB = typeof prisma & {
  aBExperiment: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  aBBucketConfig: { createMany: ReturnType<typeof vi.fn> };
};

const mockPrisma = () => prisma as unknown as MockPrismaWithAB;

describe('GET /api/admin/research/ab-experiments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).aBExperiment = {
      findMany: vi.fn(),
      create: vi.fn(),
    };
    (prisma as any).aBBucketConfig = {
      createMany: vi.fn(),
    };
  });

  it('returns list of AB experiments with bucket configs', async () => {
    const mockExperiments = [
      {
        id: 'ab-1',
        name: 'Speed Test',
        status: 'active',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        bucketConfigs: [
          {
            id: 'bc-1',
            bucketLabel: 'control',
            percentage: 50,
            modelProvider: 'azure',
            modelName: 'gpt-4o',
            extraConfig: {},
          },
          {
            id: 'bc-2',
            bucketLabel: 'variant',
            percentage: 50,
            modelProvider: 'azure',
            modelName: 'gpt-4o-mini',
            extraConfig: {},
          },
        ],
      },
    ];

    mockPrisma().aBExperiment.findMany.mockResolvedValue(mockExperiments);

    const req = new Request('http://localhost/api/admin/research/ab-experiments');
    const ctx = { req };
    const response = await ((GET as any))(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('ab-1');
    expect(data[0].bucketConfigs).toHaveLength(2);
  });

  it('returns empty array when no experiments exist', async () => {
    mockPrisma().aBExperiment.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/admin/research/ab-experiments');
    const ctx = { req };
    const response = await ((GET as any))(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('filters by status query param', async () => {
    mockPrisma().aBExperiment.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/admin/research/ab-experiments?status=active');
    const ctx = { req };
    await ((GET as any))(ctx);

    expect(mockPrisma().aBExperiment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'active' }) }),
    );
  });
});

describe('POST /api/admin/research/ab-experiments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).aBExperiment = {
      findMany: vi.fn(),
      create: vi.fn(),
    };
    (prisma as any).aBBucketConfig = {
      createMany: vi.fn(),
    };
  });

  const validPayload = {
    name: 'My Experiment',
    startDate: '2026-03-01T00:00:00.000Z',
    buckets: [
      {
        bucketLabel: 'control',
        percentage: 50,
        modelProvider: 'azure',
        modelName: 'gpt-4o',
        extraConfig: {},
      },
      {
        bucketLabel: 'variant',
        percentage: 50,
        modelProvider: 'azure',
        modelName: 'gpt-4o-mini',
        extraConfig: {},
      },
    ],
  };

  it('creates experiment and returns 201', async () => {
    const created = {
      id: 'ab-new',
      name: 'My Experiment',
      status: 'draft',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: null,
      createdAt: new Date().toISOString(),
      bucketConfigs: validPayload.buckets,
    };
    mockPrisma().aBExperiment.create.mockResolvedValue(created);

    const req = new Request('http://localhost/api/admin/research/ab-experiments', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });
    const ctx = { req };
    const response = await ((POST as any))(ctx);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('ab-new');
  });

  it('returns 400 when name is missing', async () => {
    const req = new Request('http://localhost/api/admin/research/ab-experiments', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, name: undefined }),
    });
    const ctx = { req };
    const response = await ((POST as any))(ctx);

    expect(response.status).toBe(400);
  });

  it('returns 400 when fewer than 2 buckets provided', async () => {
    const req = new Request('http://localhost/api/admin/research/ab-experiments', {
      method: 'POST',
      body: JSON.stringify({
        ...validPayload,
        buckets: [
          {
            bucketLabel: 'only',
            percentage: 100,
            modelProvider: 'azure',
            modelName: 'gpt-4o',
            extraConfig: {},
          },
        ],
      }),
    });
    const ctx = { req };
    const response = await ((POST as any))(ctx);

    expect(response.status).toBe(400);
  });

  it('returns 400 when more than 10 buckets provided', async () => {
    const buckets = Array.from({ length: 11 }, (_, i) => ({
      bucketLabel: `b${i}`,
      percentage: 100 / 11,
      modelProvider: 'azure',
      modelName: 'gpt-4o',
      extraConfig: {},
    }));
    const req = new Request('http://localhost/api/admin/research/ab-experiments', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, buckets }),
    });
    const ctx = { req };
    const response = await ((POST as any))(ctx);

    expect(response.status).toBe(400);
  });

  it('returns 400 when bucket percentages do not sum to 100', async () => {
    const req = new Request('http://localhost/api/admin/research/ab-experiments', {
      method: 'POST',
      body: JSON.stringify({
        ...validPayload,
        buckets: [
          {
            bucketLabel: 'control',
            percentage: 60,
            modelProvider: 'azure',
            modelName: 'gpt-4o',
            extraConfig: {},
          },
          {
            bucketLabel: 'variant',
            percentage: 30,
            modelProvider: 'azure',
            modelName: 'gpt-4o-mini',
            extraConfig: {},
          },
        ],
      }),
    });
    const ctx = { req };
    const response = await ((POST as any))(ctx);

    expect(response.status).toBe(400);
  });

  it('returns 400 when startDate is missing', async () => {
    const req = new Request('http://localhost/api/admin/research/ab-experiments', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, startDate: undefined }),
    });
    const ctx = { req };
    const response = await ((POST as any))(ctx);

    expect(response.status).toBe(400);
  });
});
