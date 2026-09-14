/**
 * @vitest-environment node
 *
 * Companion to ownership.test.ts: the owner-scoped mutations must keep working
 * and the pre-existing missing-material / validation semantics must not change.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBoundaryPrisma, type DbState } from './prisma-boundary-mock';
import { ALICE, seedState } from './ownership-fixtures';

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

const { POST, PATCH, DELETE } = await import('../route');

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

describe('materials collection route — owner operations still work', () => {
  it('POST creates a material with the owner collection and tags', async () => {
    const response = await POST(
      jsonCtx(
        ALICE,
        {
          toolId: 'tool-alice-new',
          toolType: 'quiz',
          title: 'Fractions quiz',
          content: { questions: ['q1'] },
          collectionId: 'col-alice',
          tagIds: ['tag-alice'],
        },
        'POST',
      ) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      created: true,
    });

    const created = state.materials.find((m) => m.toolId === 'tool-alice-new')!;
    expect(created.userId).toBe(ALICE);
    expect(created.collectionId).toBe('col-alice');
    expect(state.materialTags.filter((mt) => mt.materialId === created.id)).toHaveLength(1);
  });

  it('POST upserts the owner existing material', async () => {
    const response = await POST(
      jsonCtx(
        ALICE,
        {
          toolId: 'tool-alice-1',
          toolType: 'mindmap',
          title: 'Alice study map v2',
          content: { nodes: ['updated'] },
        },
        'POST',
      ) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ updated: true });
    expect(aliceMaterial().title).toBe('Alice study map v2');
    expect(aliceMaterial().content).toBe(JSON.stringify({ nodes: ['updated'] }));
  });

  it('PATCH updates fields and replaces tags for the owner', async () => {
    const response = await PATCH(
      jsonCtx(
        ALICE,
        {
          toolId: 'tool-alice-1',
          title: 'Renamed',
          userRating: 4,
          isBookmarked: true,
          collectionId: 'col-alice',
          tagIds: [],
        },
        'PATCH',
      ) as never,
    );

    expect(response.status).toBe(200);
    expect(aliceMaterial().title).toBe('Renamed');
    expect(aliceMaterial().userRating).toBe(4);
    expect(aliceMaterial().isBookmarked).toBe(true);
    expect(aliceMaterial().collectionId).toBe('col-alice');
    expect(state.materialTags).toHaveLength(0);
  });

  it('PATCH clears the collection when collectionId is null', async () => {
    aliceMaterial().collectionId = 'col-alice';

    const response = await PATCH(
      jsonCtx(ALICE, { toolId: 'tool-alice-1', collectionId: null }, 'PATCH') as never,
    );

    expect(response.status).toBe(200);
    expect(aliceMaterial().collectionId).toBeNull();
  });

  it('DELETE soft-deletes the owner material', async () => {
    const response = await DELETE(queryCtx(ALICE, 'toolId=tool-alice-1') as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      toolId: 'tool-alice-1',
    });
    expect(aliceMaterial().status).toBe('deleted');
  });

  it('preserves missing-material and validation semantics', async () => {
    const missingPatch = await PATCH(
      jsonCtx(ALICE, { toolId: 'tool-does-not-exist', title: 'x' }, 'PATCH') as never,
    );
    expect(missingPatch.status).toBe(404);
    await expect(missingPatch.json()).resolves.toMatchObject({
      error: 'Material not found',
    });

    const missingDelete = await DELETE(queryCtx(ALICE, 'toolId=tool-does-not-exist') as never);
    expect(missingDelete.status).toBe(404);

    const noToolId = await PATCH(jsonCtx(ALICE, { title: 'x' }, 'PATCH') as never);
    expect(noToolId.status).toBe(400);
    await expect(noToolId.json()).resolves.toMatchObject({
      error: 'Missing toolId',
    });

    const noParams = await DELETE(queryCtx(ALICE, '') as never);
    expect(noParams.status).toBe(400);

    const badType = await POST(
      jsonCtx(
        ALICE,
        {
          toolId: 'tool-alice-bad',
          toolType: 'not-a-type',
          title: 't',
          content: {},
        },
        'POST',
      ) as never,
    );
    expect(badType.status).toBe(400);

    const missingFields = await POST(jsonCtx(ALICE, { toolId: 'tool-alice-bad' }, 'POST') as never);
    expect(missingFields.status).toBe(400);
  });
});
