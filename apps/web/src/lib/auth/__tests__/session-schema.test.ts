// @vitest-environment node
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const schemaDirectory = join(process.cwd(), 'apps/web/prisma/schema');
const userSchema = readFileSync(join(schemaDirectory, 'user.prisma'), 'utf8');
const configSchema = readFileSync(join(schemaDirectory, 'analytics.prisma'), 'utf8');

describe('durable auth session schema', () => {
  it('stores only the handle hash and server-owned session metadata', () => {
    const model = userSchema.match(/model AuthSession \{([\s\S]*?)\n\}/)?.[1];
    expect(model).toBeDefined();
    expect(model).toMatch(/handleHash\s+String\s+@id\s+@db\.VarChar\(64\)/);
    expect(model).toMatch(/userId\s+String/);
    expect(model).toMatch(/issuedAt\s+DateTime\s+@default\(now\(\)\)/);
    expect(model).toMatch(/expiresAt\s+DateTime(?!\?)/);
    expect(model).toMatch(/revokedAt\s+DateTime\?/);
    expect(model).toMatch(/authVersion\s+Int/);
    expect(model).toMatch(/legacyOrigin\s+Boolean\s+@default\(false\)/);
    expect(model).not.toMatch(/\b(?:handle|token|lastSeen|lastSeenAt)\s/);
    expect(model?.match(/expiresAt[^\n]*/)?.[0]).not.toContain('@default');
  });

  it('links each session to its owner with explicit cascades and lookup indexes', () => {
    expect(userSchema).toMatch(/authSessions\s+AuthSession\[\]/);
    expect(userSchema).toMatch(
      /@relation\(fields: \[userId\], references: \[id\], onDelete: Cascade, onUpdate: Cascade\)/,
    );
    const model = userSchema.match(/model AuthSession \{([\s\S]*?)\n\}/)?.[1];
    expect(model).toContain('@@index([userId])');
    expect(model).toContain('@@index([expiresAt])');
  });

  it('defaults existing accounts to an integer version and unrevoked legacy family', () => {
    const model = userSchema.match(/model User \{([\s\S]*?)\n\}/)?.[1];
    expect(model).toMatch(/authVersion\s+Int\s+@default\(0\)/);
    expect(model).toMatch(/legacyRevoked\s+Boolean\s+@default\(false\)/);
  });

  it('leaves activation absent, with no boot, migration or approval timestamp default', () => {
    const field = configSchema.match(/sessionActivatedAt[^\n]*/)?.[0];
    expect(field).toMatch(/^sessionActivatedAt\s+DateTime\?/);
    expect(field).not.toContain('@default');
    expect(field).not.toContain('@updatedAt');
  });

  it('limits the migration to additive session state and durable foundation guards', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'apps/web/prisma/migrations/20260905210000_add_auth_session_foundation/migration.sql',
      ),
      'utf8',
    );
    const changedTables = [
      ...migration.matchAll(/(?:ALTER TABLE|CREATE TABLE| ON) "([^"]+)"/g),
    ].map((match) => match[1]);
    expect(new Set(changedTables)).toEqual(new Set(['GlobalConfig', 'User', 'AuthSession']));
    expect(migration).not.toMatch(/\bDROP\b|\bTRUNCATE\b|\bDELETE FROM\b/);
    expect(migration).not.toMatch(
      /CreatedTool|usage_patterns|dependency_alerts|searchableTextVector/,
    );
    for (const guard of [
      'AuthSession_handle_hash_check',
      'AuthSession_expiry_immutable',
      'User_auth_version_monotonic',
      'User_legacy_revoked_one_way',
      'GlobalConfig_session_activation_immutable',
    ]) {
      expect(migration).toContain(guard);
    }
  });
});
