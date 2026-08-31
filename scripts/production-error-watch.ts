#!/usr/bin/env tsx
/**
 * Production watch: asks Sentry and Vercel what went wrong in the last 24
 * hours and keeps one GitHub issue per distinct failure, opening, updating and
 * closing them so the board always mirrors what production is doing.
 *
 * Run: npm run script scripts/production-error-watch.ts -- --dry-run
 */

import { execFileSync } from 'node:child_process';

import { issueBody, issueTitle, planIssues, type ExistingIssue } from './production-watch/plan';
import {
  fetchSentryAlerts,
  fetchVercelAlerts,
  type ProductionAlert,
} from './production-watch/sources';

const DRY_RUN = process.argv.includes('--dry-run');
const LABEL = 'production-watch';

function gh(args: string[], stdin?: string): string {
  return execFileSync('gh', args, {
    encoding: 'utf-8',
    input: stdin,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function readOpenIssues(): ExistingIssue[] {
  const raw = gh([
    'issue',
    'list',
    '--label',
    LABEL,
    '--state',
    'all',
    '--limit',
    '200',
    '--json',
    'number,body,state,closedAt',
  ]);
  return (
    JSON.parse(raw) as { number: number; body: string; state: string; closedAt?: string | null }[]
  ).map((issue) => ({
    number: issue.number,
    body: issue.body ?? '',
    state: issue.state === 'OPEN' ? 'OPEN' : 'CLOSED',
    closedAt: issue.closedAt ?? null,
  }));
}

async function collectAlerts(): Promise<{
  alerts: ProductionAlert[];
  answered: ProductionAlert['source'][];
  failures: string[];
}> {
  const alerts: ProductionAlert[] = [];
  const answered: ProductionAlert['source'][] = [];
  const failures: string[] = [];
  const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, VERCEL_TOKEN, VERCEL_PROJECT_ID } =
    process.env;

  if (SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT) {
    try {
      alerts.push(
        ...(await fetchSentryAlerts(fetch, {
          org: SENTRY_ORG,
          project: SENTRY_PROJECT,
          token: SENTRY_AUTH_TOKEN,
        })),
      );
      answered.push('sentry');
    } catch (error) {
      failures.push(`Sentry feed unavailable: ${(error as Error).message}`);
    }
  } else {
    failures.push('Sentry credentials missing — skipping the error feed.');
  }

  if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
    try {
      alerts.push(
        ...(await fetchVercelAlerts(fetch, {
          token: VERCEL_TOKEN,
          projectId: VERCEL_PROJECT_ID,
          since: Date.now() - 24 * 60 * 60 * 1000,
        })),
      );
      answered.push('vercel');
    } catch (error) {
      failures.push(`Vercel feed unavailable: ${(error as Error).message}`);
    }
  } else {
    failures.push('Vercel credentials missing — skipping the deployment feed.');
  }

  return { alerts, answered, failures };
}

async function main(): Promise<void> {
  const observedAt = new Date().toISOString();
  const { alerts, answered, failures } = await collectAlerts();

  for (const failure of failures) console.error(`::warning::${failure}`);

  if (answered.length === 0) {
    throw new Error('No production feed answered — refusing to touch the board.');
  }

  const plan = planIssues(alerts, readOpenIssues(), { answered });

  console.log(
    `Production watch: ${alerts.length} live alert(s) from ${answered.join(', ')} — ` +
      `${plan.create.length} to open, ${plan.update.length} to update, ${plan.close.length} to close.`,
  );

  if (DRY_RUN) {
    for (const alert of plan.create) console.log(`would open: ${issueTitle(alert)}`);
  } else {
    for (const alert of plan.create) {
      gh(
        ['issue', 'create', '--title', issueTitle(alert), '--label', LABEL, '--body-file', '-'],
        issueBody(alert, observedAt),
      );
    }

    for (const { number, alert } of plan.update) {
      gh(
        ['issue', 'comment', String(number), '--body-file', '-'],
        `Still happening: ${alert.occurrences} time(s) in the last 24 hours (${observedAt}).`,
      );
    }

    for (const number of plan.close) {
      gh([
        'issue',
        'close',
        String(number),
        '--comment',
        'Production has not reported this in the last 24 hours. Closing automatically.',
      ]);
    }
  }

  // The healthy feeds were still processed above; fail loudly so a silently
  // broken feed cannot look like a quiet night.
  if (failures.length > 0) {
    throw new Error(failures.join(' | '));
  }
}

main().catch((error: unknown) => {
  console.error('Production watch failed:', error);
  process.exit(1);
});
