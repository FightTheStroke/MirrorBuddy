#!/usr/bin/env tsx
/**
 * Voice costs from the command line.
 *
 *   npm run script -- scripts/voice-costs.ts                 # today, every user
 *   npm run script -- scripts/voice-costs.ts --period month  # this month
 *   npm run script -- scripts/voice-costs.ts --user <id>     # one user
 *   npm run script -- scripts/voice-costs.ts --json          # for piping
 *
 * Reads the same functions the admin console reads, on purpose: a dashboard
 * and a script that disagree about the bill are worse than either alone.
 */

// Deliberately not the service module: that one imports the Next app's db
// shim, which imports `server-only` and throws the moment a plain Node script
// touches it. Same queries, same numbers, no Next.
import { prisma } from '@mirrorbuddy/db';
import {
  queryUserVoiceSpend,
  queryVoiceSpendByUser,
  queryVoiceSpendSummary,
} from '../apps/web/src/lib/metrics/voice-usage-queries';
import type { Period } from '../apps/web/src/lib/metrics/voice-usage-types';

const PERIODS: Period[] = ['day', 'week', 'month'];

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const euro = (value: number): string => `€${value.toFixed(4)}`;

async function main(): Promise<void> {
  const requested = arg('period') ?? 'day';
  if (!PERIODS.includes(requested as Period)) {
    console.error(`Unknown period "${requested}". Use one of: ${PERIODS.join(', ')}`);
    process.exit(2);
  }
  const period = requested as Period;
  const asJson = process.argv.includes('--json');
  const userId = arg('user');

  if (userId) {
    const spend = await queryUserVoiceSpend(prisma, userId, period);
    if (asJson) {
      console.log(JSON.stringify(spend, null, 2));
      return;
    }
    console.log(`\nVoice spend for ${spend.name || spend.email || userId} — ${period}\n`);
    console.log(`  sessions       ${spend.sessions}`);
    console.log(`  spoken minutes ${spend.spokenMinutes.toFixed(1)}`);
    console.log(`  cost           ${euro(spend.costEur)}\n`);
    return;
  }

  const [summary, users] = await Promise.all([
    queryVoiceSpendSummary(prisma, period),
    queryVoiceSpendByUser(prisma, period),
  ]);

  if (asJson) {
    console.log(JSON.stringify({ period, summary, users }, null, 2));
    return;
  }

  console.log(`\nVoice costs — ${period}\n`);
  console.log(`  total          ${euro(summary.totalCostEur)}`);
  console.log(`  active users   ${summary.activeUsers}`);
  console.log(`  per user       ${euro(summary.costPerUserEur)}\n`);

  if (users.length === 0) {
    console.log('  No voice usage recorded in this period.\n');
    return;
  }

  const name = (user: (typeof users)[number]): string =>
    (user.name || user.email || user.userId).slice(0, 28).padEnd(28);
  console.log(
    `  ${'user'.padEnd(28)} ${'sess'.padStart(5)} ${'min'.padStart(7)} ${'cost'.padStart(10)}`,
  );
  for (const user of users) {
    console.log(
      `  ${name(user)} ${String(user.sessions).padStart(5)} ` +
        `${user.spokenMinutes.toFixed(1).padStart(7)} ${euro(user.costEur).padStart(10)}`,
    );
  }
  console.log('');
}

main()
  .catch((error: unknown) => {
    console.error('voice-costs failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
