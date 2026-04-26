import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security')>();
  return {
    ...actual,
    requireCSRF: vi.fn().mockReturnValue(true),
  };
});

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
    }),
  };
});

import { prisma } from '@/lib/db';
import { requireCSRF } from '@/lib/security';
import { validateAuth } from '@/lib/auth/server';
import { POST } from './route';

const ROUTE_PATH = path.resolve(__dirname, './route.ts');

function createVoteRequest(body: unknown = { contributionId: 'contrib-1' }): NextRequest {
  return new NextRequest('http://localhost/api/community/vote', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function mockVoteTransaction(overrides?: {
  contribution?: { id: string; status: string } | null;
  existingVote?: { id: string } | null;
  voteCount?: number;
}) {
  const tx = {
    communityContribution: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.contribution ?? {
          id: 'contrib-1',
          status: 'approved',
        },
      ),
    },
    contributionVote: {
      findUnique: vi.fn().mockResolvedValue(overrides?.existingVote ?? null),
      upsert: vi.fn().mockResolvedValue({ id: 'vote-1' }),
      delete: vi.fn().mockResolvedValue({ id: 'vote-1' }),
      count: vi.fn().mockResolvedValue(overrides?.voteCount ?? 1),
    },
  };

  vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) =>
    (callback as (ctx: typeof tx) => Promise<unknown>)(tx),
  );

  return tx;
}

describe('POST /api/community/vote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCSRF).mockReturnValue(true);
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
    });
  });

  it('uses pipe(withSentry, withCSRF, withAuth) and transaction toggle logic', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('pipe(');
    expect(source).toContain('withSentry');
    expect(source).toContain('withCSRF');
    expect(source).toContain('withAuth');
    expect(source).toContain('$transaction');
    expect(source).toContain('upsert');
    expect(source).toContain('delete');
  });

  it('toggles vote on and returns new count', async () => {
    const tx = mockVoteTransaction({
      existingVote: null,
      voteCount: 1,
    });

    const response = await POST(createVoteRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      voted: true,
      newVoteCount: 1,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.contributionVote.upsert).toHaveBeenCalledWith({
      where: {
        contributionId_userId: {
          contributionId: 'contrib-1',
          userId: 'user-1',
        },
      },
      update: { value: 1 },
      create: {
        contributionId: 'contrib-1',
        userId: 'user-1',
        value: 1,
      },
    });
  });

  it('toggles vote off and returns new count', async () => {
    const tx = mockVoteTransaction({
      existingVote: { id: 'vote-1' },
      voteCount: 0,
    });

    const response = await POST(createVoteRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      voted: false,
      newVoteCount: 0,
    });
    expect(tx.contributionVote.delete).toHaveBeenCalledWith({
      where: {
        contributionId_userId: {
          contributionId: 'contrib-1',
          userId: 'user-1',
        },
      },
    });
    expect(tx.contributionVote.upsert).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    vi.mocked(validateAuth).mockResolvedValueOnce({
      authenticated: false,
      userId: null,
    });

    const response = await POST(createVoteRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires CSRF token and runs CSRF before auth', async () => {
    vi.mocked(requireCSRF).mockReturnValueOnce(false);

    const response = await POST(createVoteRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid CSRF token' });
    expect(validateAuth).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects non-approved contributions', async () => {
    const tx = mockVoteTransaction({
      contribution: {
        id: 'contrib-1',
        status: 'pending',
      },
    });

    const response = await POST(createVoteRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Contribution is not approved',
    });
    expect(tx.contributionVote.findUnique).not.toHaveBeenCalled();
    expect(tx.contributionVote.upsert).not.toHaveBeenCalled();
    expect(tx.contributionVote.delete).not.toHaveBeenCalled();
  });

  it('handles concurrent vote attempts atomically with transaction upsert', async () => {
    let barrierCount = 0;
    let releaseBarrier: () => void = () => {};
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });

    async function waitForBarrier() {
      barrierCount += 1;
      if (barrierCount === 2) {
        releaseBarrier();
      }
      await barrier;
    }

    let upsertCalls = 0;
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
      const tx = {
        communityContribution: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'contrib-1',
            status: 'approved',
          }),
        },
        contributionVote: {
          findUnique: vi.fn(async () => {
            await waitForBarrier();
            return null;
          }),
          upsert: vi.fn(async () => {
            upsertCalls += 1;
            return { id: `vote-${upsertCalls}` };
          }),
          delete: vi.fn(),
          count: vi.fn().mockResolvedValue(1),
        },
      };

      return (callback as (ctx: typeof tx) => Promise<unknown>)(tx);
    });

    const [responseA, responseB] = await Promise.all([
      POST(createVoteRequest()),
      POST(createVoteRequest()),
    ]);

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    await expect(responseA.json()).resolves.toEqual({ voted: true, newVoteCount: 1 });
    await expect(responseB.json()).resolves.toEqual({ voted: true, newVoteCount: 1 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(upsertCalls).toBe(2);
  });
});
