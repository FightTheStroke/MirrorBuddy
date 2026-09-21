// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fetchSentryAlerts } from '../production-watch/sources';
import { issueTitle } from '../production-watch/plan';

const now = Date.parse('2026-09-21T08:00:00Z');
const issue = {
  id: '1',
  shortId: 'MIRRORBUDDY-TEST',
  title: 'Metrics collector failed',
  count: '2',
  permalink: 'https://sentry.io/issues/1/',
  firstSeen: '2026-09-21T07:00:00Z',
  lastSeen: '2026-09-21T07:30:00Z',
};
const config = { org: 'test', project: 'test', token: 'test-only' };

describe('monitoring-only warning classification', () => {
  it.each([
    {
      issueLevel: 'warning',
      eventLevel: 'warning',
      component: 'metrics-collector',
      monitoring: true,
    },
    {
      issueLevel: 'error',
      eventLevel: 'warning',
      component: 'metrics-collector',
      monitoring: false,
    },
    {
      issueLevel: 'warning',
      eventLevel: 'error',
      component: 'metrics-collector',
      monitoring: false,
    },
    { issueLevel: 'warning', eventLevel: 'warning', component: 'payments', monitoring: false },
    {
      issueLevel: undefined,
      eventLevel: 'warning',
      component: 'metrics-collector',
      monitoring: false,
    },
    {
      issueLevel: 'warning',
      eventLevel: undefined,
      component: 'metrics-collector',
      monitoring: false,
    },
  ])(
    'retains $issueLevel/$eventLevel in $component as monitoring=$monitoring',
    async ({ issueLevel, eventLevel, component, monitoring }) => {
      const fetchImpl: typeof fetch = async (url) =>
        Response.json(
          String(url).includes('/events/latest/')
            ? { level: eventLevel, tags: [{ key: 'component', value: component }] }
            : [{ ...issue, level: issueLevel }],
        );
      const alerts = await fetchSentryAlerts(fetchImpl, config, now);
      expect(alerts).toHaveLength(1);
      expect(Boolean(alerts[0].monitoring)).toBe(monitoring);
      expect(issueTitle(alerts[0])).toBe(
        `[${monitoring ? 'Monitoring warning' : 'Sentry error'}] Metrics collector failed`,
      );
    },
  );

  it('retains the incident if the event cannot be classified', async () => {
    const fetchImpl: typeof fetch = async (url) =>
      String(url).includes('/events/latest/')
        ? new Response(null, { status: 503 })
        : Response.json([{ ...issue, level: 'warning' }]);
    expect(await fetchSentryAlerts(fetchImpl, config, now)).toHaveLength(1);
  });
});
