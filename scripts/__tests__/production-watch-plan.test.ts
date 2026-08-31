// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  issueBody,
  issueTitle,
  keyOf,
  markerFor,
  planIssues,
  type ExistingIssue,
} from '../production-watch/plan';
import {
  fetchVercelAlerts,
  sentryIssueToAlert,
  vercelDeploymentToAlert,
  type ProductionAlert,
} from '../production-watch/sources';

function alert(overrides: Partial<ProductionAlert> = {}): ProductionAlert {
  return {
    key: 'sentry:MIRRORBUDDY-1',
    title: 'TypeError: undefined is not a function',
    details: ['Where: app/page.tsx'],
    url: 'https://sentry.io/issue/1',
    occurrences: 12,
    source: 'sentry',
    ...overrides,
  };
}

function issue(overrides: Partial<ExistingIssue> = {}): ExistingIssue {
  return {
    number: 10,
    body: `${markerFor(alert())}\nsomething`,
    state: 'OPEN',
    ...overrides,
  };
}

describe('recognising an alert we already filed', () => {
  it('reads back the key it wrote', () => {
    expect(keyOf(issue())).toBe('sentry:MIRRORBUDDY-1');
  });

  it('ignores issues opened by a human', () => {
    expect(keyOf(issue({ body: 'the app feels slow' }))).toBeNull();
  });
});

describe('planning what to do about production alerts', () => {
  it('opens an issue for a failure nobody has filed yet', () => {
    const plan = planIssues([alert()], []);

    expect(plan.create).toHaveLength(1);
    expect(plan.update).toEqual([]);
    expect(plan.close).toEqual([]);
  });

  it('updates instead of duplicating when the failure is already tracked', () => {
    const plan = planIssues([alert()], [issue()]);

    expect(plan.create).toEqual([]);
    expect(plan.update).toEqual([{ number: 10, alert: alert() }]);
  });

  it('closes an issue once production stops reporting it', () => {
    const plan = planIssues([], [issue()]);

    expect(plan.close).toEqual([10]);
  });

  it('never touches issues a human opened by hand', () => {
    const plan = planIssues([], [issue({ number: 99, body: 'the robot is rude' })]);

    expect(plan.close).toEqual([]);
  });

  it('leaves already closed issues alone', () => {
    const plan = planIssues([], [issue({ state: 'CLOSED' })]);

    expect(plan.close).toEqual([]);
  });

  it('files a fresh issue when a closed failure comes back', () => {
    const plan = planIssues([alert()], [issue({ state: 'CLOSED' })]);

    expect(plan.create).toHaveLength(1);
  });

  it('does not re-file a failure that already stopped when we closed its issue', () => {
    const plan = planIssues(
      [alert({ lastSeen: '2026-08-30T18:13:07Z' })],
      [issue({ state: 'CLOSED', closedAt: '2026-08-30T19:40:00Z' })],
    );

    expect(plan.create).toEqual([]);
  });

  it('files a fresh issue when the failure happened again after we closed it', () => {
    const plan = planIssues(
      [alert({ lastSeen: '2026-08-31T02:00:00Z' })],
      [issue({ state: 'CLOSED', closedAt: '2026-08-30T19:40:00Z' })],
    );

    expect(plan.create).toHaveLength(1);
  });

  it('keeps Sentry issues open when the Sentry feed did not answer', () => {
    const plan = planIssues([], [issue()], { answered: ['vercel'] });

    expect(plan.close).toEqual([]);
  });

  it('still closes Vercel issues when only the Sentry feed is down', () => {
    const vercelIssue = issue({
      number: 42,
      body: markerFor(alert({ key: 'vercel:dpl_1', source: 'vercel' })),
    });
    const plan = planIssues([], [vercelIssue], { answered: ['vercel'] });

    expect(plan.close).toEqual([42]);
  });

  it('closes both sources when both feeds answered', () => {
    const plan = planIssues([], [issue()], { answered: ['sentry', 'vercel'] });

    expect(plan.close).toEqual([10]);
  });
});

describe('what the issue says', () => {
  it('labels a Sentry alert as a production error', () => {
    expect(issueTitle(alert())).toContain('[Production error]');
  });

  it('labels a Vercel alert as a deployment failure', () => {
    const vercelAlert = alert({ source: 'vercel', title: 'Production deployment failed (ERROR)' });

    expect(issueTitle(vercelAlert)).toContain('[Deployment failure]');
  });

  it('carries the marker, the count and the link', () => {
    const body = issueBody(alert(), '2026-08-29');

    expect(body).toContain(markerFor(alert()));
    expect(body).toContain('12 time(s)');
    expect(body).toContain('https://sentry.io/issue/1');
  });
});

describe('turning raw API payloads into alerts', () => {
  it('keeps the Sentry short id as the key so it survives retitling', () => {
    const converted = sentryIssueToAlert({
      id: '1',
      shortId: 'MIRRORBUDDY-7',
      title: 'boom',
      culprit: 'api/route',
      count: '5',
      userCount: 2,
      permalink: 'https://sentry.io/x',
      firstSeen: '2026-08-28T00:00:00Z',
      lastSeen: '2026-08-29T00:00:00Z',
    });

    expect(converted.key).toBe('sentry:MIRRORBUDDY-7');
    expect(converted.occurrences).toBe(5);
  });

  it('describes a failed deployment by its commit', () => {
    const converted = vercelDeploymentToAlert({
      uid: 'dpl_1',
      name: 'mirrorbuddy',
      url: 'mirrorbuddy.vercel.app',
      state: 'ERROR',
      createdAt: 0,
      meta: { githubCommitSha: 'abcdef1234', githubCommitMessage: 'fix: something\nbody' },
    });

    expect(converted.key).toBe('vercel:dpl_1');
    expect(converted.details.join(' ')).toContain('abcdef12');
    expect(converted.details.join(' ')).toContain('fix: something');
  });
});

describe('which deployments count as production failures', () => {
  function deploymentFeed(states: string[]): typeof fetch {
    return (async () =>
      new Response(
        JSON.stringify({
          deployments: states.map((state, index) => ({
            uid: `dpl_${index}`,
            name: 'mirrorbuddy',
            url: 'mirrorbuddy.vercel.app',
            state,
            createdAt: 0,
          })),
        }),
        { status: 200 },
      )) as unknown as typeof fetch;
  }

  const config = { token: 't', projectId: 'p', since: 0 };

  it('reports a deployment that errored', async () => {
    const alerts = await fetchVercelAlerts(deploymentFeed(['ERROR']), config);

    expect(alerts).toHaveLength(1);
  });

  it('ignores a canceled deployment — a superseded build is not a fault', async () => {
    const alerts = await fetchVercelAlerts(deploymentFeed(['CANCELED', 'CANCELED']), config);

    expect(alerts).toEqual([]);
  });

  it('ignores a healthy deployment', async () => {
    const alerts = await fetchVercelAlerts(deploymentFeed(['READY']), config);

    expect(alerts).toEqual([]);
  });
});
