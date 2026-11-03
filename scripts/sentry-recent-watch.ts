#!/usr/bin/env tsx
import { checkRecentSentry } from './production-watch/sentry-recent-check';

async function main(): Promise<void> {
  const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env;
  const result = await checkRecentSentry(
    (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
    { token: SENTRY_AUTH_TOKEN, org: SENTRY_ORG, project: SENTRY_PROJECT },
  );
  console.log(
    `Sentry check at ${new Date().toISOString()}: ${result.recent} unresolved issue(s) active in the last 20 minutes; pagination complete.`,
  );
  for (const line of result.lines) console.log(line);
  if (result.recent > 0) {
    console.error('::error::Recent Sentry activity requires investigation; no issues modified.');
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error(
    '::error::Sentry check unavailable; no issue data published. Verify credentials and feed availability.',
  );
  process.exitCode = 1;
});
