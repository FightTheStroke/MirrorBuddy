/**
 * Every relation declared in the Prisma schema must exist as a real PostgreSQL
 * foreign key in the migration history.
 *
 * A relation that lives only in the Prisma schema is silently unenforced:
 * PostgreSQL never cascades the delete, so erasing a user leaves their rows
 * behind. That is both a data-integrity defect and a GDPR erasure gap, and it
 * is invisible to `prisma generate` because Prisma models the relation anyway.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const SCHEMA_DIR = join(process.cwd(), 'apps/web/prisma/schema');
const MIGRATIONS_DIR = join(process.cwd(), 'apps/web/prisma/migrations');

interface DeclaredRelation {
  model: string;
  field: string;
  constraint: string;
}

function readSchema(): string {
  return readdirSync(SCHEMA_DIR)
    .filter((file) => file.endsWith('.prisma'))
    .map((file) => readFileSync(join(SCHEMA_DIR, file), 'utf-8'))
    .join('\n');
}

function readMigrations(): string {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      try {
        return readFileSync(join(MIGRATIONS_DIR, entry.name, 'migration.sql'), 'utf-8');
      } catch {
        return '';
      }
    })
    .join('\n');
}

function declaredRelations(schema: string): DeclaredRelation[] {
  const relations: DeclaredRelation[] = [];
  const models = schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g);
  for (const [, model, body] of models) {
    for (const line of body.split('\n')) {
      const match = line.match(/@relation\(fields:\s*\[(\w+)\]/);
      if (!match) continue;
      relations.push({ model, field: match[1], constraint: `${model}_${match[1]}_fkey` });
    }
  }
  return relations;
}

describe('Prisma relations are enforced by the database', () => {
  const schema = readSchema();
  const migrations = readMigrations();
  const relations = declaredRelations(schema);

  it('finds the relations declared in the schema', () => {
    expect(relations.length).toBeGreaterThan(0);
  });

  it('creates a foreign key constraint for every declared relation', () => {
    const unenforced = relations
      .filter(({ constraint }) => !migrations.includes(`"${constraint}"`))
      .map(({ model, field }) => `${model}.${field}`);

    expect(unenforced).toEqual([]);
  });

  it('cascades user-owned content so account erasure removes it', () => {
    const ownedByUser = relations.filter(
      ({ field, model }) => field === 'userId' && model !== 'ComplianceAuditEntry',
    );

    const notCascading = ownedByUser.filter(({ constraint }) => {
      const statement = migrations.match(
        new RegExp(`ADD CONSTRAINT "${constraint}"[\\s\\S]{0,240}?;`),
      );
      return !statement || !/ON DELETE CASCADE/.test(statement[0]);
    });

    expect(notCascading.map(({ model }) => model)).toEqual([]);
  });
});
