import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { invalidateActiveExperimentsCache } from '@/lib/ab-testing/ab-service';

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
}));

vi.mock('@/lib/ab-testing/ab-service', () => ({
  invalidateActiveExperimentsCache: vi.fn(),
}));

type MockPrismaWithAB = typeof prisma & {
  aBExperiment: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = () => prisma as unknown as MockPrismaWithAB;

const makeCtx = (method: string, body?: unknown, id = 'ab-1') => ({
  req: new Request(`http://localhost/api/admin/research/ab-experiments/${id}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  }),
  params: Promise.resolve({ id }),
});

describe('PATCH /api/admin/research/ab-experiments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as unknown as MockPrismaWithAB).aBExperiment = {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
  });

  it('transitions draft -> active and invalidates cache', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue({ id: 'ab-1', status: 'draft' });
    const updated = { id: 'ab-1', status: 'active', bucketConfigs: [] };
    mockPrisma().aBExperiment.update.mockResolvedValue(updated);

    const ctx = makeCtx('PATCH', { status: 'active' });
    const response = await (PATCH as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('active');
    expect(invalidateActiveExperimentsCache).toHaveBeenCalled();
  });

  it('transitions active -> completed and invalidates cache', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue({ id: 'ab-1', status: 'active' });
    const updated = { id: 'ab-1', status: 'completed', bucketConfigs: [] };
    mockPrisma().aBExperiment.update.mockResolvedValue(updated);

    const ctx = makeCtx('PATCH', { status: 'completed' });
    const response = await (PATCH as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('completed');
    expect(invalidateActiveExperimentsCache).toHaveBeenCalled();
  });

  it('returns 404 when experiment not found', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue(null);

    const ctx = makeCtx('PATCH', { status: 'active' });
    const response = await (PATCH as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);

    expect(response.status).toBe(404);
  });

  it('returns 409 for invalid transition (completed -> active)', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue({ id: 'ab-1', status: 'completed' });

    const ctx = makeCtx('PATCH', { status: 'active' });
    const response = await (PATCH as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);

    expect(response.status).toBe(409);
    expect(invalidateActiveExperimentsCache).not.toHaveBeenCalled();
  });

  it('returns 409 for invalid transition (active -> draft)', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue({ id: 'ab-1', status: 'active' });

    const ctx = makeCtx('PATCH', { status: 'draft' });
    const response = await (PATCH as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);

    expect(response.status).toBe(409);
    expect(invalidateActiveExperimentsCache).not.toHaveBeenCalled();
  });

  it('returns 400 when status field is missing', async () => {
    const ctx = makeCtx('PATCH', {});
    const response = await (PATCH as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/admin/research/ab-experiments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as unknown as MockPrismaWithAB).aBExperiment = {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
  });

  it('deletes a draft experiment successfully', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue({ id: 'ab-1', status: 'draft' });
    mockPrisma().aBExperiment.delete.mockResolvedValue({ id: 'ab-1' });

    const ctx = makeCtx('DELETE');
    const response = await (DELETE as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);

    expect(response.status).toBe(200);
    expect(mockPrisma().aBExperiment.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ab-1' } }),
    );
  });

  it('deletes a completed experiment successfully', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue({ id: 'ab-1', status: 'completed' });
    mockPrisma().aBExperiment.delete.mockResolvedValue({ id: 'ab-1' });

    const ctx = makeCtx('DELETE');
    const response = await (DELETE as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);

    expect(response.status).toBe(200);
  });

  it('returns 409 when trying to delete an active experiment', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue({ id: 'ab-1', status: 'active' });

    const ctx = makeCtx('DELETE');
    const response = await (DELETE as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);

    expect(response.status).toBe(409);
    expect(mockPrisma().aBExperiment.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when experiment not found', async () => {
    mockPrisma().aBExperiment.findUnique.mockResolvedValue(null);

    const ctx = makeCtx('DELETE');
    const response = await (DELETE as unknown as (ctx: typeof ctx) => Promise<Response>)(ctx);

    expect(response.status).toBe(404);
  });
});
