// Fetches what production is actually failing on, from Sentry and Vercel.

export interface ProductionAlert {
  /** Stable identifier used to recognise an alert we already filed. */
  key: string;
  title: string;
  /** Human-readable lines describing the failure. */
  details: string[];
  url: string;
  /** How many times it happened in the observed window. */
  occurrences: number;
  source: 'sentry' | 'vercel';
}

export interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit?: string;
  count: string | number;
  userCount?: number;
  permalink: string;
  firstSeen: string;
  lastSeen: string;
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  createdAt: number;
  meta?: { githubCommitSha?: string; githubCommitMessage?: string };
}

export function sentryIssueToAlert(issue: SentryIssue): ProductionAlert {
  return {
    key: `sentry:${issue.shortId}`,
    title: issue.title,
    details: [
      `Where: ${issue.culprit || 'unknown'}`,
      `First seen: ${issue.firstSeen}`,
      `Last seen: ${issue.lastSeen}`,
      `Users affected: ${issue.userCount ?? 'unknown'}`,
    ],
    url: issue.permalink,
    occurrences: Number(issue.count) || 0,
    source: 'sentry',
  };
}

export function vercelDeploymentToAlert(deployment: VercelDeployment): ProductionAlert {
  const commit = deployment.meta?.githubCommitSha?.slice(0, 8) ?? 'unknown commit';
  return {
    key: `vercel:${deployment.uid}`,
    title: `Production deployment failed (${deployment.state})`,
    details: [
      `Commit: ${commit}`,
      `Message: ${deployment.meta?.githubCommitMessage?.split('\n')[0] ?? 'unknown'}`,
      `Created: ${new Date(deployment.createdAt).toISOString()}`,
    ],
    url: `https://${deployment.url}`,
    occurrences: 1,
    source: 'vercel',
  };
}

export async function fetchSentryAlerts(
  fetchImpl: typeof fetch,
  config: { org: string; project: string; token: string },
): Promise<ProductionAlert[]> {
  const url =
    `https://sentry.io/api/0/projects/${config.org}/${config.project}` +
    `/issues/?statsPeriod=24h&query=${encodeURIComponent('is:unresolved')}`;

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!response.ok) {
    throw new Error(`Sentry replied ${response.status}: ${await response.text()}`);
  }

  const issues = (await response.json()) as SentryIssue[];
  return issues.map(sentryIssueToAlert);
}

export async function fetchVercelAlerts(
  fetchImpl: typeof fetch,
  config: { token: string; projectId: string; since: number },
): Promise<ProductionAlert[]> {
  const url =
    `https://api.vercel.com/v6/deployments?projectId=${config.projectId}` +
    `&target=production&since=${config.since}&limit=20`;

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!response.ok) {
    throw new Error(`Vercel replied ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as { deployments?: VercelDeployment[] };
  return (
    (body.deployments ?? [])
      // CANCELED is routine, not a failure: every push supersedes the deployment
      // before it, so Vercel cancels the previous one. Counting those as outages
      // buried the board in issues nobody could act on.
      .filter((deployment) => deployment.state === 'ERROR')
      .map(vercelDeploymentToAlert)
  );
}
