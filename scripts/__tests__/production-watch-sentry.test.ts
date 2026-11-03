// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fetchSentryAlerts, sentryIssueToAlert } from '../production-watch/sources';
import { issueBody, issueTitle, markerFor, planIssues } from '../production-watch/plan';
import { sentryInventoryEvidence } from '../production-watch/sentry-inventory';

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
  return async (url) =>
    new Response(JSON.stringify(String(url).includes('/events/latest/') ? { tags: [] } : data));
}

describe('Sentry recent-activity evidence', () => {
  it('keeps event payloads private while reporting fixed technical classifications', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          message: 'private user text',
          request: { url: 'https://private.example/user' },
          exception: { values: [{ type: 'TypeError', value: 'private exception text' }] },
          extra: { errorName: 'NetworkError', statusCode: 503, name: 'Private Person' },
        }),
      );
    const evidence = await sentryInventoryEvidence(
      fetchImpl,
      sentryIssueToAlert(issue),
      'test-only',
    );
    expect(evidence).toContain(
      'category=unclassified | errorTypes=NetworkError,TypeError | httpStatuses=503',
    );
    expect(evidence).not.toContain('private');
    expect(evidence).not.toContain('Private Person');
  });

  it('reports vector-query counts and optional tool context without disclosing SQL or parameters', async () => {
    const fetchImpl: typeof fetch = async () =>
      Response.json({
        extra: { hasUserId: true, hasSessionId: false },
        spans: [1, 2].map((id) => ({
          span_id: String(id),
          op: 'db',
          description: 'SELECT * FROM search_similar_embeddings($1)',
          start_timestamp: id,
          timestamp: id + 0.1,
          data: { 'db.params': ['private user text', id] },
        })),
      });
    const evidence = await sentryInventoryEvidence(
      fetchImpl,
      sentryIssueToAlert(issue),
      'test-only',
    );
    expect(evidence).toContain('toolContext=user:true,session:false');
    expect(evidence).toContain('vectorSpans=2');
    expect(evidence).toContain('uniqueSqlText=1');
    expect(evidence).toContain('distinctParameterSets=2');
    expect(evidence).not.toMatch(/SELECT|private|span_id/);
  });

  it('distinguishes nested instrumentation from separate vector queries without exposing span ids', async () => {
    const fetchImpl: typeof fetch = async () =>
      Response.json({
        spans: [
          {
            span_id: 'private-parent',
            description: 'SELECT * FROM search_similar_embeddings($1)',
            start_timestamp: 1,
          },
          {
            span_id: 'private-child',
            parent_span_id: 'private-parent',
            description: 'SELECT * FROM search_similar_embeddings($1)',
            start_timestamp: 1,
          },
          {
            span_id: 'private-independent',
            description: 'SELECT * FROM search_similar_embeddings($1)',
            start_timestamp: 2,
          },
        ],
      });
    const alert = sentryIssueToAlert({
      ...issue,
      title: 'Failed to execute setRemoteDescription on RTCPeerConnection: private context',
    });

    const evidence = await sentryInventoryEvidence(fetchImpl, alert, 'test-only');

    expect(evidence).toContain('vectorSpans=3');
    expect(evidence).toContain('nestedVectorSpans=1');
    expect(evidence).toContain('vectorStartTimes=2');
    expect(evidence).toContain('failureSignals=webrtc');
    expect(evidence).not.toMatch(/private|SELECT|RTCPeerConnection/);
  });
  it.each(['preview', 'production', 'development'])(
    'preserves and truthfully labels the latest event environment %s',
    async (environment) => {
      const urls: string[] = [];
      const fetchImpl: typeof fetch = async (url) => {
        urls.push(String(url));
        return new Response(
          JSON.stringify(
            String(url).includes('/events/latest/')
              ? { tags: [{ key: 'environment', value: environment }] }
              : [issue],
          ),
        );
      };
      const alerts = await fetchSentryAlerts(fetchImpl, config, now);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].details).toContain(`Latest event environment tag: ${environment}`);
      expect(issueTitle(alerts[0])).toContain('[Sentry error]');
      expect(issueBody(alerts[0], new Date(now).toISOString())).not.toContain(
        '**Seen in production**',
      );
      expect(urls[0]).not.toContain('environment');
      expect(urls[1]).toBe('https://sentry.io/api/0/issues/1/events/latest/');
    },
  );

  it('marks unknown environment explicitly instead of assuming production', async () => {
    const [alert] = await fetchSentryAlerts(feed([issue]), config, now);
    expect(alert.details).toContain('Latest event environment tag: unknown');
  });

  it.each(['unavailable', 'malformed'])(
    'keeps the active alert and reports %s environment evidence',
    async (failure) => {
      const fetchImpl: typeof fetch = async (url) =>
        String(url).includes('/events/latest/')
          ? failure === 'unavailable'
            ? new Response('unavailable', { status: 503 })
            : new Response('null')
          : new Response(JSON.stringify([issue]));
      const [alert] = await fetchSentryAlerts(fetchImpl, config, now);
      expect(alert.key).toBe('sentry:TEST-1');
      expect(alert.details).toContain('Latest event environment tag: unknown');
      expect(alert.details.some((line) => line.startsWith('Environment lookup failed:'))).toBe(
        true,
      );
    },
  );

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

  it('includes historical unresolved issues and follows every results-bearing page on request', async () => {
    const urls: URL[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input));
      urls.push(url);
      const secondPage = url.searchParams.has('cursor');
      return new Response(
        JSON.stringify([
          { ...issue, shortId: secondPage ? 'TEST-2' : 'TEST-1', lastSeen: '2026-03-02T00:00:00Z' },
        ]),
        {
          headers: {
            Link: `<${url.origin}${url.pathname}?cursor=next>; rel="next"; results="${!secondPage}"; cursor="next"`,
          },
        },
      );
    };
    const alerts = await fetchSentryAlerts(fetchImpl, { ...config, allUnresolved: true }, now);
    expect(alerts.map((alert) => alert.key)).toEqual(['sentry:TEST-1', 'sentry:TEST-2']);
    expect(urls).toHaveLength(2);
    expect(urls[0].searchParams.get('statsPeriod')).toBe('');
    expect(urls[0].searchParams.get('query')).toBe('is:unresolved');
    expect(urls[1].searchParams.get('cursor')).toBe('next');
  });

  it.each([
    'https://untrusted.example/issues/?cursor=next',
    'https://sentry.io/api/0/other/?cursor=next',
  ])(
    'refuses a pagination destination outside the original Sentry endpoint: %s',
    async (destination) => {
      let requests = 0;
      const fetchImpl: typeof fetch = async () => {
        requests++;
        return new Response(JSON.stringify([issue]), {
          headers: { Link: `<${destination}>; rel="next"; results="true"; cursor="next"` },
        });
      };
      await expect(
        fetchSentryAlerts(fetchImpl, { ...config, allUnresolved: true }, now),
      ).rejects.toThrow('pagination');
      expect(requests).toBe(1);
    },
  );

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
