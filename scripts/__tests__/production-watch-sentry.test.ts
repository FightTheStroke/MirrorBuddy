// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fetchSentryAlerts, sentryIssueToAlert } from '../production-watch/sources';
import { issueBody, markerFor, planIssues } from '../production-watch/plan';

const now = Date.parse('2026-09-13T16:00:00Z');
const config = { org: 'test', project: 'test', token: 'test-only' };
const issue = {
  id: '1',
  shortId: 'TEST-1',
  title: 'failure',
  count: '100',
  permalink: 'https://sentry.io/issues/1/',
  firstSeen: '2026-03-02T00:00:00Z',
  lastSeen: '2026-09-13T15:00:00Z',
};

function feed(data: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(data));
}

describe('Sentry recent-activity evidence', () => {
  it('does not announce an old unresolved issue or close its GitHub record', async () => {
    const old = { ...issue, lastSeen: '2026-09-02T17:45:16Z' };
    const alerts = await fetchSentryAlerts(feed([old]), config, now);
    expect(alerts).toEqual([]);
    const plan = planIssues(
      alerts,
      [
        {
          number: 913,
          state: 'OPEN',
          body: markerFor(sentryIssueToAlert(old)),
        },
      ],
      { answered: ['sentry'] },
    );
    expect(plan).toEqual({ create: [], update: [], close: [] });
  });

  it.each([
    ['2026-09-13T15:00:00Z', 1],
    ['2026-09-12T16:00:00Z', 1],
    ['2026-09-12T15:59:59.999Z', 0],
  ])('uses the actual window boundary: %s', async (lastSeen, expected) => {
    const alerts = await fetchSentryAlerts(feed([{ ...issue, lastSeen }]), config, now);
    expect(alerts).toHaveLength(expected);
  });

  it.each([null, undefined, '', 'invalid', '2026-09-13T16:00:01Z'])(
    'refuses untrustworthy lastSeen values: %s',
    async (lastSeen) => {
      await expect(
        fetchSentryAlerts(feed([{ ...issue, lastSeen }]), config, now),
      ).rejects.toThrow();
    },
  );

  it.each([null, {}, [null], [{ ...issue, count: 'invalid' }]])(
    'does not turn a malformed feed into healthy silence: %j',
    async (data) => {
      await expect(fetchSentryAlerts(feed(data), config, now)).rejects.toThrow();
    },
  );

  it('preserves feed failures', async () => {
    const failedFetch: typeof fetch = async () => new Response('unavailable', { status: 503 });
    await expect(fetchSentryAlerts(failedFetch, config, now)).rejects.toThrow('503');
  });

  it('labels cumulative counts as lifetime, never as a 24-hour count', () => {
    const body = issueBody(sentryIssueToAlert(issue), new Date(now).toISOString());
    expect(body).toContain('100 time(s) over the issue lifetime');
    expect(body).not.toContain('100 time(s) in the last 24 hours');
  });
});
