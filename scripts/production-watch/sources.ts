// Fetches what production is actually failing on, from Sentry and Vercel.

import { z } from 'zod';

export interface ProductionAlert {
  /** Stable identifier used to recognise an alert we already filed. */
  key: string;
  title: string;
  /** Human-readable lines describing the failure. */
  details: string[];
  url: string;
  /** Sentry: lifetime count. Vercel: count in the requested window. */
  occurrences: number;
  /** ISO timestamp of the most recent occurrence. */
  lastSeen: string;
  source: 'sentry' | 'vercel';
  monitoring?: boolean;
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
  level?: string;
}

const sentryIssueSchema = z.object({
  id: z.string().min(1),
  shortId: z.string().min(1),
  title: z.string().min(1),
  culprit: z.string().optional(),
  count: z
    .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
    .refine((value) => Number.isSafeInteger(Number(value)), 'Invalid lifetime count'),
  userCount: z.number().int().nonnegative().optional(),
  permalink: z.string().url(),
  firstSeen: z.string().datetime({ offset: true }),
  lastSeen: z.string().datetime({ offset: true }),
  level: z.string().optional(),
});

const sentryEventSchema = z.object({
  level: z.string().optional(),
  tags: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
});

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  createdAt: number;
  meta?: { githubCommitSha?: string; githubCommitMessage?: string };
}

export function sentryIssueToAlert(input: SentryIssue): ProductionAlert {
  const issue = sentryIssueSchema.parse(input);
  return {
    key: `sentry:${issue.shortId}`,
    title: issue.title,
    details: [
      `Where: ${issue.culprit || 'unknown'}`,
      `First seen: ${issue.firstSeen}`,
      `Last seen: ${issue.lastSeen}`,
      `Users counted (lifetime): ${issue.userCount ?? 'unknown'}`,
    ],
    url: issue.permalink,
    occurrences: Number(issue.count),
    lastSeen: issue.lastSeen,
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
    lastSeen: new Date(deployment.createdAt).toISOString(),
    source: 'vercel',
  };
}

export async function fetchSentryAlerts(
  fetchImpl: typeof fetch,
  config: { org: string; project: string; token: string },
  now = Date.now(),
): Promise<ProductionAlert[]> {
  if (!Number.isFinite(now)) throw new Error('Invalid Sentry observation time');
  const url =
    `https://sentry.io/api/0/projects/${config.org}/${config.project}` +
    `/issues/?statsPeriod=24h&query=${encodeURIComponent('is:unresolved')}`;

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!response.ok) {
    throw new Error(`Sentry replied ${response.status}: ${await response.text()}`);
  }

  const issues = z.array(sentryIssueSchema).parse(await response.json());
  if (issues.some((issue) => Date.parse(issue.lastSeen) > now)) {
    throw new Error('Sentry feed contains a future lastSeen timestamp');
  }
  const alerts: ProductionAlert[] = [];
  for (const issue of issues.filter(
    (issue) => Date.parse(issue.lastSeen) >= now - 24 * 60 * 60 * 1000,
  )) {
    const alert = sentryIssueToAlert(issue);
    let environment = 'unknown';
    try {
      const eventResponse = await fetchImpl(
        `https://sentry.io/api/0/issues/${encodeURIComponent(issue.id)}/events/latest/`,
        { headers: { Authorization: `Bearer ${config.token}` } },
      );
      if (!eventResponse.ok) throw new Error(`Sentry event replied ${eventResponse.status}`);
      const event = sentryEventSchema.parse(await eventResponse.json());
      // Keep monitoring outages actionable without mislabelling them as application errors.
      if (
        issue.level === 'warning' &&
        event.level === 'warning' &&
        event.tags?.some((tag) => tag.key === 'component' && tag.value === 'metrics-collector')
      ) {
        alert.monitoring = true;
        alert.details.push('Monitoring degraded; this warning does not establish user impact.');
      }
      environment = event.tags?.find((tag) => tag.key === 'environment')?.value || 'unknown';
    } catch (error) {
      // Classification failure must not discard the known, active issue.
      alert.details.push(
        `Environment lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    alert.details.push(
      `Latest event environment tag: ${environment}`,
      'Environment tags describe the build, not the current deployment target; promoted preview builds can serve production.',
    );
    alerts.push(alert);
  }
  return alerts;
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
  // CANCELED is not a fault: Vercel cancels superseded builds routinely, and
  // filing an issue for each one buries the deployments that really broke.
  return (body.deployments ?? [])
    .filter((deployment) => deployment.state === 'ERROR')
    .map(vercelDeploymentToAlert);
}
