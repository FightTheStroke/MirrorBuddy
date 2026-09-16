import { runReadonlyRecovery } from './lib/readonly-recovery-command';
import { recoveryFailure } from './lib/readonly-recovery-diagnostics';

async function main() {
  const status = await runReadonlyRecovery(process.argv.slice(2), process.env);
  console.log(`READONLY_RECOVERY_${status}`);
}

main().catch((error: unknown) => {
  console.error(`READONLY_RECOVERY_${recoveryFailure(error)}`);
  process.exitCode = 1;
});
