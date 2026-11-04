import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/api/middlewares', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/api/middlewares');
  return {
    ...actual,
    pipe:
      (..._mw: unknown[]) =>
      (handler: (ctx: unknown) => Promise<Response>) =>
      async (req: NextRequest, context: { params: Promise<{ id: string }> }) =>
        handler({ req, params: context.params, userId: 'u1' }),
  };
});

import { prisma } from '@/lib/db';
import { GET } from '../[id]/route';

const findFirst = prisma.conversation.findFirst as unknown as ReturnType<typeof vi.fn>;
const call = () =>
  GET(new NextRequest('http://localhost/api/conversations/c1'), {
    params: Promise.resolve({ id: 'c1' }),
  });

beforeEach(() => vi.resetAllMocks());

describe('GET /api/conversations/[id]', () => {
  it('scopes to owner and non-deleted, and loads the newest 100 messages', async () => {
    findFirst.mockResolvedValue({ id: 'c1', topics: '[]', keyFacts: null, messages: [] });
    await call();
    const arg = findFirst.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'c1', userId: 'u1', markedForDeletion: false });
    expect(arg.include.messages).toMatchObject({ orderBy: { createdAt: 'desc' }, take: 100 });
  });

  it('returns messages in chronological order', async () => {
    findFirst.mockResolvedValue({
      id: 'c1',
      topics: '[]',
      keyFacts: null,
      messages: [{ id: 'm3' }, { id: 'm2' }, { id: 'm1' }],
    });
    const body = await (await call()).json();
    expect(body.messages.map((m: { id: string }) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('returns 404 for a deleted or foreign conversation', async () => {
    findFirst.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });
});
