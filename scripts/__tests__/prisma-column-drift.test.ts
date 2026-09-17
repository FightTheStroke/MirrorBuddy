// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findColumnDrift } from '../lib/prisma-column-drift';

const repository = join(__dirname, '..', '..');

function fixture(schema: string, migrations: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'mirrorbuddy-column-drift-'));
  const schemaDir = join(root, 'schema');
  const migrationsDir = join(root, 'migrations');
  mkdirSync(schemaDir);
  mkdirSync(migrationsDir);
  writeFileSync(join(schemaDir, 'domain.prisma'), schema);
  for (const [name, sql] of Object.entries(migrations)) {
    mkdirSync(join(migrationsDir, name));
    writeFileSync(join(migrationsDir, name, 'migration.sql'), sql);
  }
  return { root, schemaDir, migrationsDir };
}

describe('Prisma model fields must exist as migration columns', () => {
  let created: string[] = [];

  beforeEach(() => {
    created = [];
  });

  afterEach(() => {
    for (const root of created) rmSync(root, { recursive: true, force: true });
  });

  function build(schema: string, migrations: Record<string, string>) {
    const paths = fixture(schema, migrations);
    created.push(paths.root);
    return findColumnDrift(paths.schemaDir, paths.migrationsDir);
  }

  const model = `model UsagePattern {
  id String @id
  userId String
  user User @relation(fields: [userId], references: [id])
  sessionCount Int @default(0)
  @@map("usage_patterns")
}

model User {
  id String @id
}
`;

  it('reports a hand-written migration whose column names differ from the model', () => {
    const drift = build(model, {
      '20260101000000_create': `CREATE TABLE "usage_patterns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_count" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "User" (
    "id" TEXT NOT NULL
);`,
    });

    expect(drift.map((entry) => entry.column).sort()).toEqual(['sessionCount', 'userId']);
    expect(drift[0]).toMatchObject({ model: 'UsagePattern', table: 'usage_patterns' });
  });

  it('accepts the same table once a later migration renames the columns', () => {
    const drift = build(model, {
      '20260101000000_create': `CREATE TABLE "usage_patterns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_count" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "User" (
    "id" TEXT NOT NULL
);`,
      '20260102000000_rename': `ALTER TABLE "usage_patterns" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "usage_patterns" RENAME COLUMN "session_count" TO "sessionCount";`,
    });

    expect(drift).toEqual([]);
  });

  it('accepts a column added by a later migration and respects @map', () => {
    const drift = build(
      `model Event {
  id String @id
  createdAt DateTime
  legacyRef String @map("legacy_ref")
}
`,
      {
        '20260101000000_create': `CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "legacy_ref" TEXT NOT NULL
);`,
        '20260102000000_add': `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL;`,
      },
    );

    expect(drift).toEqual([]);
  });

  it('reports a column removed by a later migration but still declared', () => {
    const drift = build(
      `model Event {
  id String @id
  removed String
}
`,
      {
        '20260101000000_create': `CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "removed" TEXT NOT NULL
);`,
        '20260102000000_drop': `ALTER TABLE "Event" DROP COLUMN "removed";`,
      },
    );

    expect(drift).toEqual([
      { model: 'Event', table: 'Event', field: 'removed', column: 'removed' },
    ]);
  });

  it('leaves this repository free of column drift', () => {
    expect(
      findColumnDrift(
        join(repository, 'apps/web/prisma/schema'),
        join(repository, 'apps/web/prisma/migrations'),
      ),
    ).toEqual([]);
  });
});
