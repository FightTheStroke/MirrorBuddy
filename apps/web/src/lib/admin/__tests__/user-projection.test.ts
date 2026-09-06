import { describe, expect, it } from 'vitest';
import {
  ADMIN_USER_SELECT,
  parseUserListQuery,
  userListWhere,
  projectListUser,
  exportListUser,
  scanMatchingUsers,
  USER_SCAN_BATCH_SIZE,
} from '../user-list-query';

describe('bounded admin user query contract', () => {
  it('defaults and caps page size while rejecting malformed/unbounded pagination', () => {
    expect(parseUserListQuery(null)).toMatchObject({
      page: 1,
      pageSize: 25,
      tab: 'all',
      search: '',
      staging: false,
    });
    expect(parseUserListQuery({ pageSize: '9999' }).pageSize).toBe(100);
    for (const page of ['-1', '0', 'Infinity', '1.5', '1e9']) {
      expect(() => parseUserListQuery({ page })).toThrow();
    }
    expect(() => parseUserListQuery({ pageSize: 'all' })).toThrow();
    expect(() => parseUserListQuery({ page: ['1', '2'] })).toThrow();
  });

  it('applies status and staging predicates before any pagination', () => {
    expect(userListWhere(parseUserListQuery({ tab: 'active' }))).toEqual({
      disabled: false,
      isTestData: false,
    });
    expect(userListWhere(parseUserListQuery({ tab: 'disabled', staging: 'true' }))).toEqual({
      disabled: true,
    });
    expect(() => parseUserListQuery({ tab: 'owner' })).toThrow();
    expect(() => parseUserListQuery({ search: 'a'.repeat(201) })).toThrow();
  });

  it('uses an explicit schema allow-list without user credential or identity-session fields', () => {
    expect(Object.keys(ADMIN_USER_SELECT).sort()).toEqual([
      'createdAt',
      'disabled',
      'email',
      'id',
      'isTestData',
      'role',
      'subscription',
      'username',
    ]);
    const serialized = JSON.stringify(ADMIN_USER_SELECT);
    for (const key of [
      'passwordHash',
      'authSessions',
      'passwordResetTokens',
      'emailHash',
      'authVersion',
      'legacyRevoked',
      'googleAccount',
      'profile',
    ]) {
      expect(serialized).not.toContain(`"${key}"`);
    }
  });

  it('projects explicitly and removes unexpected fields, including nested credential-like JSON', () => {
    const result = projectListUser({
      id: 'user-1',
      username: 'one',
      email: 'one@example.com',
      role: 'ADMIN_READONLY',
      disabled: false,
      isTestData: false,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      passwordHash: 'must-not-export',
      authSessions: [{ token: 'must-not-export' }],
      subscription: {
        id: 'sub-1',
        overrideLimits: { chatLimitDaily: 20, apiKey: 'must-not-export' },
        overrideFeatures: { quizzes: true, token: 'must-not-export' },
        tier: {
          id: 'base',
          code: 'BASE',
          name: 'Base',
          chatLimitDaily: 10,
          voiceMinutesDaily: 5,
          toolsLimitDaily: 10,
          docsLimitTotal: 1,
          features: { quizzes: false, clientSecret: 'must-not-export' },
        },
      },
    });
    expect(result.role).toBe('ADMIN_READONLY');
    expect(result.subscription).toEqual({
      id: 'sub-1',
      tier: { id: 'base', code: 'BASE', name: 'Base' },
    });
    expect(JSON.stringify(result)).not.toContain('must-not-export');
    expect(Object.keys(exportListUser(result)).sort()).toEqual([
      'createdAt',
      'disabled',
      'email',
      'role',
      'username',
    ]);
    expect(() => projectListUser(undefined)).toThrow();
  });

  it('finds matches beyond the first source batch before selecting a page, including decrypted email fragments', async () => {
    const records = Array.from({ length: USER_SCAN_BATCH_SIZE + 4 }, (_, index) => ({
      id: `user-${index}`,
      username: `person${index}`,
      email: index >= USER_SCAN_BATCH_SIZE ? `target${index}@example.com` : null,
    }));
    const queries: Array<string | undefined> = [];
    const fetchBatch = async (after?: string) => {
      queries.push(after);
      const offset = after ? records.findIndex((row) => row.id === after) + 1 : 0;
      return records.slice(offset, offset + USER_SCAN_BATCH_SIZE);
    };
    const result = await scanMatchingUsers(
      parseUserListQuery({ search: 'TARGET', pageSize: '2', page: '2' }),
      fetchBatch,
    );
    expect(result.total).toBe(4);
    expect(result.ids).toEqual([
      `user-${USER_SCAN_BATCH_SIZE + 2}`,
      `user-${USER_SCAN_BATCH_SIZE + 3}`,
    ]);
    expect(queries.length).toBeGreaterThan(1);
    const last = await scanMatchingUsers(
      parseUserListQuery({ search: 'target', pageSize: '3', page: '99' }),
      fetchBatch,
    );
    expect(last).toMatchObject({ page: 2, total: 4, ids: [`user-${USER_SCAN_BATCH_SIZE + 3}`] });
  });

  it('fails explicitly on an invalid or non-advancing batch instead of looping or fabricating an empty result', async () => {
    const query = parseUserListQuery({ search: 'target' });
    await expect(scanMatchingUsers(query, async () => null)).rejects.toThrow();
    const repeated = Array.from({ length: USER_SCAN_BATCH_SIZE }, () => ({
      id: 'same',
      username: 'target',
      email: null,
    }));
    await expect(scanMatchingUsers(query, async () => repeated)).rejects.toThrow();
  });
});
