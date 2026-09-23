/**
 * Regression for #1160 (Sentry MIRRORBUDDY-3E, N+1 inserts on maintenance-notify)
 * and #1164: every decrypted record used to write its own audit row, on top of
 * one bulk row per field. A query now writes one audit batch, counting records.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as security from '@/lib/security';
import { Prisma } from '@prisma/client';
import { createPIIMiddleware } from '../pii-middleware';

vi.mock('@/lib/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security')>();
  return {
    ...actual,
    decryptPII: vi.fn((text: string) => Promise.resolve(text.replace('pii:v1:', ''))),
    logDecryptAccess: vi.fn(),
    logBulkDecryptAccess: vi.fn(),
    logDecryptAccessBatch: vi.fn(),
  };
});
vi.spyOn(Prisma, 'defineExtension').mockImplementation(((config: unknown) => config) as never);

type Middleware = {
  query: { $allModels: Record<string, (ctx: unknown) => Promise<unknown>> };
};

const users = ['a', 'b', 'c'].map((id) => ({
  id,
  email: `pii:v1:${id}@example.com`,
  profile: { name: `pii:v1:${id}` },
}));

describe('PII decrypt audit volume', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes one audit batch for a findMany, counting each decrypted field', async () => {
    const middleware = createPIIMiddleware() as unknown as Middleware;

    const result = (await middleware.query.$allModels.findMany({
      model: 'User',
      operation: 'findMany',
      args: {},
      query: () => Promise.resolve(users),
    })) as typeof users;

    expect(result.map((user) => user.email)).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);
    expect(security.logDecryptAccess).not.toHaveBeenCalled();
    expect(security.logBulkDecryptAccess).not.toHaveBeenCalled();
    expect(security.logDecryptAccessBatch).toHaveBeenCalledTimes(1);
    expect(security.logDecryptAccessBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        model: 'User',
        field: 'email',
        context: expect.objectContaining({ recordCount: 3, bulkOperation: true }),
      }),
      expect.objectContaining({
        model: 'Profile',
        field: 'name',
        context: expect.objectContaining({ recordCount: 3, bulkOperation: true }),
      }),
    ]);
  });

  it('writes one audit batch for a single record with an included relation', async () => {
    const middleware = createPIIMiddleware() as unknown as Middleware;

    await middleware.query.$allModels.findUnique({
      model: 'User',
      operation: 'findUnique',
      args: {},
      query: () => Promise.resolve(users[0]),
    });

    expect(security.logDecryptAccess).not.toHaveBeenCalled();
    expect(security.logDecryptAccessBatch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(security.logDecryptAccessBatch).mock.calls[0][0]).toHaveLength(2);
  });

  it('writes no audit row when nothing was decrypted', async () => {
    const middleware = createPIIMiddleware() as unknown as Middleware;

    await middleware.query.$allModels.findMany({
      model: 'User',
      operation: 'findMany',
      args: {},
      query: () => Promise.resolve([{ id: 'x', email: null }]),
    });

    expect(security.logDecryptAccessBatch).not.toHaveBeenCalled();
  });
});
