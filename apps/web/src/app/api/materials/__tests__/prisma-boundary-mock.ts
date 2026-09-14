/**
 * Representative Prisma boundary fake for the materials collection route.
 *
 * Unlike `@/test/mocks/prisma` (vi.fn stubs that ignore arguments), this fake
 * evaluates the `where` clause the route actually sends. An unscoped
 * `where: { toolId }` therefore reaches another owner's row, which is exactly
 * the S1 defect the ownership tests must be able to observe.
 *
 * Only the operations used by the materials collection route are implemented.
 */

export interface MaterialRow {
  id: string;
  userId: string;
  toolId: string;
  toolType: string;
  title: string;
  content: string;
  searchableText: string | null;
  preview: string | null;
  status: string;
  userRating: number | null;
  isBookmarked: boolean;
  collectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

interface NamedRow {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  [key: string]: unknown;
}

interface MaterialTagRow {
  id: string;
  materialId: string;
  tagId: string;
  [key: string]: unknown;
}

export interface DbState {
  materials: MaterialRow[];
  collections: NamedRow[];
  tags: NamedRow[];
  materialTags: MaterialTagRow[];
}

export class FakePrismaError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
  }
}

type Where = Record<string, unknown>;

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
    const filter = expected as { in?: unknown[]; not?: unknown };
    if (Array.isArray(filter.in)) return filter.in.includes(actual);
    if ('not' in filter) return actual !== filter.not;
    return false;
  }
  return actual === expected;
}

function matchesWhere(
  row: Record<string, unknown>,
  where: Where | undefined,
  state: DbState,
): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'material') {
      const parent = state.materials.find((m) => m.id === row.materialId);
      return parent ? matchesWhere(parent, expected as Where, state) : false;
    }
    return matchesValue(row[key], expected);
  });
}

function applyData(row: MaterialRow, data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (key === 'tags') continue;
    row[key] = value;
  }
}

function withIncludes(
  row: MaterialRow,
  include: Record<string, unknown> | undefined,
  state: DbState,
) {
  if (!include) return { ...row };
  const result: Record<string, unknown> = { ...row };
  if (include.collection) {
    const collection = state.collections.find((c) => c.id === row.collectionId);
    result.collection = collection
      ? { id: collection.id, name: collection.name, color: collection.color }
      : null;
  }
  if (include.tags) {
    result.tags = state.materialTags
      .filter((mt) => mt.materialId === row.id)
      .map((mt) => {
        const tag = state.tags.find((t) => t.id === mt.tagId);
        return {
          tag: tag ? { id: tag.id, name: tag.name, color: tag.color } : null,
        };
      });
  }
  return result;
}

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-generated-${++sequence}`;

export function createBoundaryPrisma(state: DbState) {
  const material = {
    findUnique: async ({ where }: { where: Where }) =>
      state.materials.find((m) => matchesWhere(m, where, state)) ?? null,
    findFirst: async ({ where, include }: { where?: Where; include?: Record<string, unknown> }) => {
      const row = state.materials.find((m) => matchesWhere(m, where, state));
      return row ? withIncludes(row, include, state) : null;
    },
    findMany: async ({ where, include }: { where?: Where; include?: Record<string, unknown> }) =>
      state.materials
        .filter((m) => matchesWhere(m, where, state))
        .map((m) => withIncludes(m, include, state)),
    count: async ({ where }: { where?: Where }) =>
      state.materials.filter((m) => matchesWhere(m, where, state)).length,
    update: async ({
      where,
      data,
      include,
    }: {
      where: Where;
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) => {
      const row = state.materials.find((m) => matchesWhere(m, where, state));
      if (!row) {
        throw new FakePrismaError(
          'P2025',
          'An operation failed because it depends on records that were required but not found.',
        );
      }
      applyData(row, data);
      return withIncludes(row, include, state);
    },
    create: async ({
      data,
      include,
    }: {
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) => {
      if (state.materials.some((m) => m.toolId === data.toolId)) {
        throw new FakePrismaError('P2002', 'Unique constraint failed on the fields: (`toolId`)');
      }
      const row = {
        id: nextId('mat'),
        searchableText: null,
        preview: null,
        status: 'active',
        userRating: null,
        isBookmarked: false,
        collectionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as unknown as MaterialRow;
      delete (row as Record<string, unknown>).tags;
      state.materials.push(row);
      const nested = data.tags as { create?: Array<{ tagId: string }> } | undefined;
      for (const entry of nested?.create ?? []) {
        state.materialTags.push({
          id: nextId('mt'),
          materialId: row.id,
          tagId: entry.tagId,
        });
      }
      return withIncludes(row, include, state);
    },
  };

  const namedModel = (rows: () => NamedRow[]) => ({
    findFirst: async ({ where }: { where?: Where }) =>
      rows().find((r) => matchesWhere(r, where, state)) ?? null,
    findMany: async ({ where }: { where?: Where }) =>
      rows().filter((r) => matchesWhere(r, where, state)),
  });

  return {
    material,
    collection: namedModel(() => state.collections),
    tag: namedModel(() => state.tags),
    materialTag: {
      findMany: async ({ where }: { where?: Where }) =>
        state.materialTags.filter((mt) => matchesWhere(mt, where, state)),
      deleteMany: async ({ where }: { where?: Where }) => {
        const kept = state.materialTags.filter((mt) => !matchesWhere(mt, where, state));
        const count = state.materialTags.length - kept.length;
        state.materialTags = kept;
        return { count };
      },
      create: async ({ data }: { data: { materialId: string; tagId: string } }) => {
        const row: MaterialTagRow = {
          id: nextId('mt'),
          materialId: data.materialId,
          tagId: data.tagId,
        };
        state.materialTags.push(row);
        return row;
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  };
}
