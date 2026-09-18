/**
 * @vitest-environment node
 *
 * S1 regression: the materials collection route must scope every mutation to
 * the authenticated owner. Two synthetic users only; no real accounts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBoundaryPrisma, type DbState } from './prisma-boundary-mock';
import { ALICE, MALLORY, seedState } from './ownership-fixtures';

let db: ReturnType<typeof createBoundaryPrisma>;
let state: DbState;

vi.mock('@/lib/db', () => ({
  prisma: new Proxy(
    {},
    {
      get: (_target, prop: string) => (db as unknown as Record<string, unknown>)[prop],
    },
  ),
}));

vi.mock('@/lib/db/database-utils', () => ({ isPostgreSQL: () => false }));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/api/middlewares', () => ({
  pipe: () => (handler: (ctx: unknown) => Promise<Response>) => (ctx: unknown) => handler(ctx),
  withSentry: () => {},
  withAuth: {},
  withCSRF: {},
}));

const { POST, PATCH, DELETE, GET } = await import('../route');

const jsonCtx = (userId: string, body: unknown, method: string) => ({
  userId,
  req: new Request('http://localhost/api/materials', {
    method,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }),
});

const queryCtx = (userId: string, query: string) => ({
  userId,
  req: new Request(`http://localhost/api/materials?${query}`),
});

const aliceMaterial = () => state.materials.find((m) => m.id === 'mat-alice-1')!;

beforeEach(() => {
  state = seedState();
  db = createBoundaryPrisma(state);
});

describe('materials collection route — cross-owner mutations are refused', () => {
  it('POST cannot save a payload prepared by a different session owner', async () => {
    const response = await POST(
      jsonCtx(
        MALLORY,
        {
          userId: ALICE,
          toolId: 'tool-pending-owner-switch',
          toolType: 'quiz',
          title: 'Private study notes',
          content: { questions: [] },
        },
        'POST',
      ) as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Material identity changed' });
    expect(state.materials.some((m) => m.toolId === 'tool-pending-owner-switch')).toBe(false);
  });

  it('POST upsert cannot overwrite another user material with the same toolId', async () => {
    const response = await POST(
      jsonCtx(
        MALLORY,
        {
          toolId: 'tool-alice-1',
          toolType: 'mindmap',
          title: 'Hijacked title',
          content: { nodes: ['attacker'] },
        },
        'POST',
      ) as never,
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(aliceMaterial().title).toBe('Alice study map');
    expect(aliceMaterial().userId).toBe(ALICE);
    expect(aliceMaterial().content).toBe(JSON.stringify({ nodes: ['alice-1'] }));
  });

  it('PATCH cannot update another user material', async () => {
    const response = await PATCH(
      jsonCtx(
        MALLORY,
        { toolId: 'tool-alice-1', title: 'Hijacked title', userRating: 1 },
        'PATCH',
      ) as never,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Material not found',
    });
    expect(aliceMaterial().title).toBe('Alice study map');
    expect(aliceMaterial().userRating).toBeNull();
  });

  it('PATCH cannot retag another user material', async () => {
    const response = await PATCH(
      jsonCtx(MALLORY, { toolId: 'tool-alice-1', tagIds: ['tag-mallory'] }, 'PATCH') as never,
    );

    expect(response.status).toBe(404);
    expect(state.materialTags).toEqual([
      { id: 'mt-alice-1', materialId: 'mat-alice-1', tagId: 'tag-alice' },
    ]);
  });

  it('DELETE cannot soft-delete another user material', async () => {
    const response = await DELETE(queryCtx(MALLORY, 'toolId=tool-alice-1') as never);

    expect(response.status).toBe(404);
    expect(aliceMaterial().status).toBe('active');
  });

  it('PATCH cannot move an owned material into another user collection', async () => {
    const response = await PATCH(
      jsonCtx(MALLORY, { toolId: 'tool-mallory-1', collectionId: 'col-alice' }, 'PATCH') as never,
    );

    expect(response.status).toBe(404);
    expect(state.materials.find((m) => m.id === 'mat-mallory-1')!.collectionId).toBeNull();
  });

  it('PATCH cannot attach another user tag to an owned material', async () => {
    const response = await PATCH(
      jsonCtx(MALLORY, { toolId: 'tool-mallory-1', tagIds: ['tag-alice'] }, 'PATCH') as never,
    );

    expect(response.status).toBe(404);
    expect(state.materialTags.some((mt) => mt.materialId === 'mat-mallory-1')).toBe(false);
  });

  it('POST create cannot associate another user collection', async () => {
    const response = await POST(
      jsonCtx(
        MALLORY,
        {
          toolId: 'tool-mallory-new',
          toolType: 'quiz',
          title: 'New',
          content: { questions: [] },
          collectionId: 'col-alice',
        },
        'POST',
      ) as never,
    );

    expect(response.status).toBe(404);
    expect(state.materials.some((m) => m.toolId === 'tool-mallory-new')).toBe(false);
  });

  it('POST create cannot associate another user tag', async () => {
    const response = await POST(
      jsonCtx(
        MALLORY,
        {
          toolId: 'tool-mallory-new',
          toolType: 'quiz',
          title: 'New',
          content: { questions: [] },
          tagIds: ['tag-alice'],
        },
        'POST',
      ) as never,
    );

    expect(response.status).toBe(404);
    expect(state.materials.some((m) => m.toolId === 'tool-mallory-new')).toBe(false);
  });

  it('GET lists only materials owned by the caller', async () => {
    const response = await GET(queryCtx(MALLORY, '') as never);
    const body = (await response.json()) as {
      materials: Array<{ toolId: string }>;
    };

    expect(body.materials.map((m) => m.toolId)).toEqual(['tool-mallory-1']);
  });
});
