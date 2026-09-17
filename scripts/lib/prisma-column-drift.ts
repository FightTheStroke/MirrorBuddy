import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ColumnDrift {
  model: string;
  table: string;
  field: string;
  column: string;
}

interface ModelField {
  field: string;
  column: string;
}

interface ParsedModel {
  model: string;
  table: string;
  fields: ModelField[];
}

const MODEL_BLOCK = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
const FIELD_LINE = /^\s{2,}(\w+)\s+([\w.]+)(\[\])?(\?)?\s*(.*)$/;

function readSql(directory: string): { name: string; sql: string }[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((name) => {
      const path = join(directory, name, 'migration.sql');
      try {
        return [{ name, sql: readFileSync(path, 'utf8') }];
      } catch {
        // A migration directory without SQL contributes no columns.
        return [];
      }
    });
}

export function parseModels(schemaDirectory: string): ParsedModel[] {
  const sources = readdirSync(schemaDirectory)
    .filter((name) => name.endsWith('.prisma'))
    .sort()
    .map((name) => readFileSync(join(schemaDirectory, name), 'utf8'));

  const blocks: { model: string; body: string }[] = [];
  for (const source of sources) {
    for (const match of source.matchAll(MODEL_BLOCK)) {
      blocks.push({ model: match[1], body: match[2] });
    }
  }
  const modelNames = new Set(blocks.map((block) => block.model));

  return blocks.map(({ model, body }) => {
    const table = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? model;
    const fields: ModelField[] = [];
    for (const rawLine of body.split('\n')) {
      const line = rawLine.split('//')[0];
      if (!line.trim() || line.trim().startsWith('@@')) continue;
      const parsed = FIELD_LINE.exec(line);
      if (!parsed) continue;
      const [, field, type, list, , attributes] = parsed;
      // Relations and lists occupy no column of their own.
      if (list || modelNames.has(type) || attributes.includes('@relation')) continue;
      fields.push({ field, column: /@map\("([^"]+)"\)/.exec(attributes)?.[1] ?? field });
    }
    return { model, table, fields };
  });
}

export function parseMigrationColumns(migrationsDirectory: string): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  const columnsOf = (table: string) => {
    const existing = tables.get(table);
    if (existing) return existing;
    const created = new Set<string>();
    tables.set(table, created);
    return created;
  };

  for (const { sql } of readSql(migrationsDirectory)) {
    for (const match of sql.matchAll(
      /CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"\s*\(([\s\S]*?)\n\);/g,
    )) {
      const columns = columnsOf(match[1]);
      for (const line of match[2].split('\n')) {
        const column = /^\s*"([^"]+)"\s+\S/.exec(line);
        if (column) columns.add(column[1]);
      }
    }
    for (const match of sql.matchAll(
      /ALTER TABLE (?:IF EXISTS )?"([^"]+)"\s+RENAME COLUMN "([^"]+)" TO "([^"]+)"/g,
    )) {
      const columns = columnsOf(match[1]);
      columns.delete(match[2]);
      columns.add(match[3]);
    }
    for (const match of sql.matchAll(/ALTER TABLE (?:IF EXISTS )?"([^"]+)"([\s\S]*?);/g)) {
      const columns = columnsOf(match[1]);
      // Optional existence clauses are removed first so the column patterns stay simple.
      const statement = match[2].split(' IF NOT EXISTS').join('').split(' IF EXISTS').join('');
      for (const added of statement.matchAll(/ADD COLUMN\s+"([^"]+)"/g)) {
        columns.add(added[1]);
      }
      for (const dropped of statement.matchAll(/DROP COLUMN\s+"([^"]+)"/g)) {
        columns.delete(dropped[1]);
      }
    }
  }
  return tables;
}

/**
 * Every scalar field a model declares must exist as a column in the migration
 * history. `check-schema-drift.sh` only proves the table was created, so a
 * hand-written migration whose column names differ from the model passes it and
 * then fails at runtime with "column does not exist".
 */
export function findColumnDrift(
  schemaDirectory: string,
  migrationsDirectory: string,
): ColumnDrift[] {
  const tables = parseMigrationColumns(migrationsDirectory);
  const drift: ColumnDrift[] = [];
  for (const { model, table, fields } of parseModels(schemaDirectory)) {
    const columns = tables.get(table);
    // A model with no CREATE TABLE at all is already reported by check-schema-drift.sh.
    if (!columns || columns.size === 0) continue;
    for (const { field, column } of fields) {
      if (!columns.has(column)) drift.push({ model, table, field, column });
    }
  }
  return drift;
}
