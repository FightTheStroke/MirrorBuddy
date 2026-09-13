import { describe, expect, it } from 'vitest';
import { collectUserExport } from '../user-list-export';
import {
  parseUserListQuery,
  userListUrl,
  USER_LIST_ORDER,
  USER_TRASH_ORDER,
} from '../user-list-query';
import { projectUserLimitDetails } from '../user-list-projection';
import { collectionPage, parseUserCollection } from '../user-list-collection';
import { projectListUser } from '../user-list-projection';

function user(index: number) {
  return {
    id: `user-${index}`,
    username: `person${index}`,
    email: `person${index}@example.com`,
    role: 'USER',
    disabled: false,
    isTestData: false,
    createdAt: '2026-01-01T00:00:00Z',
    subscription: null,
    passwordHash: 'not-exported',
    authSessions: [{ token: 'not-exported' }],
  };
}

describe('user export and deterministic listing contract', () => {
  it('uses a deterministic unique tie breaker for living and deleted records', () => {
    expect(USER_LIST_ORDER).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(USER_TRASH_ORDER).toEqual([{ deletedAt: 'desc' }, { userId: 'desc' }]);
  });

  it('exports all matching users through capped pages, with only declared export fields', async () => {
    const calls: URLSearchParams[] = [];
    const result = await collectUserExport(
      parseUserListQuery({ search: 'person', staging: 'true', tab: 'active' }),
      async (url) => {
        const params = new URL(url, 'http://localhost').searchParams;
        calls.push(params);
        const request = parseUserCollection(params);
        const start = request.processed;
        return Response.json(
          collectionPage(
            request,
            105,
            Array.from({ length: Math.min(100, 105 - start) }, (_, index) =>
              projectListUser(user(start + index)),
            ),
            start + 100 < 105,
          ),
        );
      },
    );
    expect(calls).toHaveLength(2);
    expect(calls.map((params) => params.get('pageSize'))).toEqual(['100', '100']);
    expect(calls[1].get('search')).toBe('person');
    expect(calls[1].get('tab')).toBe('active');
    expect(result).toHaveLength(105);
    expect(Object.keys(result[0]).sort()).toEqual([
      'createdAt',
      'disabled',
      'email',
      'role',
      'username',
    ]);
    expect(JSON.stringify(result)).not.toContain('not-exported');
  });

  it('refuses a partial or changing export instead of silently producing a truncated file', async () => {
    const query = parseUserListQuery();
    await expect(
      collectUserExport(query, async () =>
        Response.json({
          query: { ...query, pageSize: 100 },
          users: [user(1)],
          collection: {
            cursor: null,
            nextCursor: null,
            candidateCount: 5,
            scanned: 1,
            processed: 1,
            complete: true,
          },
        }),
      ),
    ).rejects.toThrow(/incomplete/i);
    await expect(
      collectUserExport(query, async () => Response.json({ error: 'Denied' }, { status: 403 })),
    ).rejects.toThrow();
  });

  it('rejects a response for different filters and an inconsistent page-count bound', async () => {
    const query = parseUserListQuery({ search: 'target' });
    await expect(
      collectUserExport(query, async () =>
        Response.json({
          query: { ...query, search: 'someone else', pageSize: 100 },
          users: [user(1)],
          collection: {
            cursor: null,
            nextCursor: null,
            candidateCount: 1,
            scanned: 1,
            processed: 1,
            complete: true,
          },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      collectUserExport(query, async () =>
        Response.json({
          query: { ...query, pageSize: 100 },
          users: [user(1)],
          collection: {
            cursor: null,
            nextCursor: 'user-1',
            candidateCount: 1,
            scanned: 1,
            processed: 0,
            complete: false,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects trash collection explicitly before making an HTTP request', async () => {
    let called = false;
    await expect(
      collectUserExport(parseUserListQuery({ tab: 'trash' }), async () => {
        called = true;
        return Response.json({});
      }),
    ).rejects.toThrow('Trash');
    expect(called).toBe(false);
  });

  it('keeps editor configuration separate and loaded on demand without projecting unrelated subscription fields', () => {
    const details = projectUserLimitDetails({
      id: 'subscription',
      stripeCustomerId: 'not-needed',
      tier: {
        id: 'base',
        code: 'BASE',
        name: 'Base',
        chatLimitDaily: 10,
        voiceMinutesDaily: 5,
        toolsLimitDaily: 10,
        docsLimitTotal: 1,
        features: { quizzes: true },
        stripePriceId: 'not-needed',
      },
      overrideLimits: null,
      overrideFeatures: { quizzes: false, futureFeature: true },
    });
    expect(details.overrideFeatures).toEqual({ quizzes: false, futureFeature: true });
    expect(JSON.stringify(details)).not.toContain('not-needed');
  });

  it('preserves the existing empty-feature editor behavior for an explicit JSON null', () => {
    expect(
      projectUserLimitDetails({
        id: 'subscription',
        tier: {
          id: 'base',
          code: 'BASE',
          name: 'Base',
          chatLimitDaily: 10,
          voiceMinutesDaily: 5,
          toolsLimitDaily: 10,
          docsLimitTotal: 1,
          features: null,
        },
        overrideLimits: null,
        overrideFeatures: null,
      }).tier.features,
    ).toEqual({});
  });

  it('encodes search content rather than treating it as URL query syntax', () => {
    const url = new URL(
      userListUrl(parseUserListQuery({ search: 'a&staging=true' })),
      'http://localhost',
    );
    expect(url.searchParams.get('search')).toBe('a&staging=true');
    expect(url.searchParams.get('staging')).toBe('false');
  });
});
