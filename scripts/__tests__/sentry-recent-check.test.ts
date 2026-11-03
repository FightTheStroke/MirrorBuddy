// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkRecentSentry } from '../production-watch/sentry-recent-check';

const now = Date.parse('2026-11-03T10:00:00Z');
const config = { org: 'test', project: 'test', token: 'test-only' };
const issue = {
  id: '1',
  shortId: 'TEST-1',
  title: 'Private request content',
  count: '100',
  permalink: 'https://sentry.io/issues/1/',
  firstSeen: '2026-03-02T00:00:00Z',
  lastSeen: '2026-11-03T09:50:00Z',
};
const feed =
  (body: unknown): typeof fetch =>
  async () =>
    Response.json(body);

describe('read-only recent Sentry monitor', () => {
  it('reports recent recurrence without publishing event content or lifetime counts as recent', async () => {
    const result = await checkRecentSentry(feed([issue]), config, now);
    expect(result.recent).toBe(1);
    expect(result.lines.join('\n')).toContain(
      'sentry:TEST-1 | lifetime occurrences=100 | lastSeen=2026-11-03T09:50:00Z',
    );
    expect(result.lines.join('\n')).not.toMatch(/Private|https:|100 recent/);
  });

  it.each([
    ['2026-11-03T09:40:00Z', 1],
    ['2026-11-03T09:39:59.999Z', 0],
    ['2026-03-02T00:00:00Z', 0],
  ])(
    'uses the inclusive twenty-minute window rather than historical issue age: %s',
    async (lastSeen, recent) => {
      const result = await checkRecentSentry(feed([{ ...issue, lastSeen }]), config, now);
      expect(result.recent).toBe(recent);
    },
  );

  it('uses only read requests and follows pagination for recent issues on later pages', async () => {
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(init?.method ?? 'GET').toBe('GET');
      const url = new URL(String(input));
      requests.push(url.toString());
      const next = url.searchParams.has('cursor');
      return Response.json(
        [{ ...issue, lastSeen: next ? issue.lastSeen : '2026-03-02T00:00:00Z' }],
        {
          headers: next
            ? {}
            : { Link: `<${url.origin}${url.pathname}>; rel="next"; results="true"; cursor="next"` },
        },
      );
    };
    expect((await checkRecentSentry(fetchImpl, config, now)).recent).toBe(1);
    expect(requests).toHaveLength(2);
    expect(requests[0]).toContain('query=is%3Aunresolved');
  });

  it.each([
    null,
    {},
    [{ ...issue, lastSeen: null }],
    [{ ...issue, shortId: 'TEST-1\n::error::private' }],
  ])('fails closed for malformed or log-injecting issue data', async (body) => {
    await expect(checkRecentSentry(feed(body), config, now)).rejects.toThrow();
  });

  it('fails loudly when Sentry is unavailable instead of reporting healthy silence', async () => {
    const unavailable: typeof fetch = async () => new Response('', { status: 503 });
    await expect(checkRecentSentry(unavailable, config, now)).rejects.toThrow('503');
  });

  it.each([null, undefined, {}, { ...config, token: '' }])(
    'rejects missing credentials before fetching',
    async (input) => {
      let fetched = false;
      const fetchImpl: typeof fetch = async () => {
        fetched = true;
        return Response.json([]);
      };
      await expect(checkRecentSentry(fetchImpl, input, now)).rejects.toThrow('credentials');
      expect(fetched).toBe(false);
    },
  );
});
