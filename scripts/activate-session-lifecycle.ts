import { prisma, dbPool } from '../apps/web/src/lib/db';
import {
  getSessionActivationReadiness,
  activateSessionLifecycle,
} from '../apps/web/src/lib/auth/activation-readiness';
import { assertAuthScriptTarget } from './lib/auth-script-target';

async function main() {
  assertAuthScriptTarget();
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--activate'))
    throw new Error('Usage: activate-session-lifecycle.ts [--activate]');
  const readiness = await getSessionActivationReadiness();
  console.log(JSON.stringify(readiness, null, 2));
  if (args[0] === '--activate') {
    console.log(JSON.stringify(await activateSessionLifecycle(), null, 2));
  } else if (readiness.status === 'NOT_ACTIVATED' && !readiness.canActivate) {
    process.exitCode = 2;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Activation operation failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await dbPool.end();
  });
