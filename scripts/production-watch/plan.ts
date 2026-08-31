// Decides which GitHub issues to open, update or close for production alerts.

import type { ProductionAlert } from './sources';

/** Hidden marker that lets a later run recognise its own issue. */
export const MARKER_PREFIX = 'production-watch-key:';

export interface ExistingIssue {
  number: number;
  body: string;
  state: 'OPEN' | 'CLOSED';
  /** ISO timestamp of when it was closed, when it is closed. */
  closedAt?: string | null;
}

export interface IssuePlan {
  create: ProductionAlert[];
  update: { number: number; alert: ProductionAlert }[];
  close: number[];
}

/** Sources whose feed answered this run, so silence from them means "fixed". */
export interface PlanOptions {
  answered?: ProductionAlert['source'][];
}

export function markerFor(alert: ProductionAlert): string {
  return `<!-- ${MARKER_PREFIX} ${alert.key} -->`;
}

export function keyOf(issue: ExistingIssue): string | null {
  const match = issue.body.match(new RegExp(`<!--\\s*${MARKER_PREFIX}\\s*([^\\s>]+)\\s*-->`));
  return match ? match[1] : null;
}

export function issueTitle(alert: ProductionAlert): string {
  const prefix = alert.source === 'sentry' ? 'Production error' : 'Deployment failure';
  return `[${prefix}] ${alert.title}`.slice(0, 240);
}

export function issueBody(alert: ProductionAlert, observedAt: string): string {
  return [
    markerFor(alert),
    '',
    `**Seen in production** — ${alert.occurrences} time(s) in the last 24 hours.`,
    '',
    ...alert.details.map((line) => `- ${line}`),
    '',
    `Source: ${alert.source} — ${alert.url}`,
    '',
    `Reported automatically by the production watch on ${observedAt}.`,
  ].join('\n');
}

/**
 * Open an issue for anything new, add a comment to anything still happening,
 * and close what production has stopped complaining about.
 *
 * Silence only means "fixed" if the source that reported it actually answered.
 * When a feed is down we must not read its missing alerts as good news, or one
 * broken API call would close every issue that source ever opened.
 */
export function planIssues(
  alerts: ProductionAlert[],
  existing: ExistingIssue[],
  options: PlanOptions = {},
): IssuePlan {
  const answered = new Set(options.answered ?? (['sentry', 'vercel'] as const));
  const openIssues = existing.filter((issue) => issue.state === 'OPEN');
  const byKey = new Map<string, ExistingIssue>();
  for (const issue of openIssues) {
    const key = keyOf(issue);
    if (key) byKey.set(key, issue);
  }

  // Sentry keeps reporting a failure for 24h after its last occurrence, so a
  // failure we already investigated and closed would come straight back as a
  // duplicate. Only re-file it if it actually happened again after we closed.
  const settled = new Map<string, string>();
  for (const issue of existing) {
    const key = issue.state === 'CLOSED' && issue.closedAt ? keyOf(issue) : null;
    if (!key) continue;
    const previous = settled.get(key);
    if (!previous || Date.parse(issue.closedAt!) > Date.parse(previous)) {
      settled.set(key, issue.closedAt!);
    }
  }

  const isStale = (alert: ProductionAlert): boolean => {
    const closedAt = settled.get(alert.key);
    if (!closedAt || !alert.lastSeen) return false;
    return Date.parse(alert.lastSeen) <= Date.parse(closedAt);
  };

  const liveKeys = new Set(alerts.map((alert) => alert.key));

  return {
    create: alerts.filter((alert) => !byKey.has(alert.key) && !isStale(alert)),
    update: alerts
      .filter((alert) => byKey.has(alert.key))
      .map((alert) => ({ number: byKey.get(alert.key)!.number, alert })),
    close: openIssues
      .filter((issue) => {
        const key = keyOf(issue);
        if (key === null || liveKeys.has(key)) return false;
        const source = key.split(':')[0] as ProductionAlert['source'];
        return answered.has(source);
      })
      .map((issue) => issue.number),
  };
}
