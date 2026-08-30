// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { fetchVercelAlerts, type VercelDeployment } from '../production-watch/sources';

function deployment(uid: string, state: string): VercelDeployment {
  return {
    uid,
    name: 'mirrorbuddy',
    url: `${uid}.vercel.app`,
    state,
    createdAt: 1_756_000_000_000,
    meta: { githubCommitSha: 'abcdef1234567890', githubCommitMessage: 'chore: something' },
  };
}

function stubFetch(deployments: VercelDeployment[]): typeof fetch {
  return (async () =>
    new Response(JSON.stringify({ deployments }), { status: 200 })) as unknown as typeof fetch;
}

const config = { token: 'token', projectId: 'project', since: 0 };

describe('fetchVercelAlerts', () => {
  it('reports deployments that genuinely errored', async () => {
    const alerts = await fetchVercelAlerts(stubFetch([deployment('dpl_err', 'ERROR')]), config);

    expect(alerts.map((alert) => alert.key)).toEqual(['vercel:dpl_err']);
  });

  it('ignores canceled deployments: every push supersedes the one before it', async () => {
    const alerts = await fetchVercelAlerts(
      stubFetch([deployment('dpl_cancelled', 'CANCELED'), deployment('dpl_ok', 'READY')]),
      config,
    );

    expect(alerts).toEqual([]);
  });
});
