import 'server-only';
import { runReadonlySmokeCommand } from './lib/readonly-smoke-command';
import { SmokeCommandError } from './lib/readonly-smoke-options';

const controller = new AbortController();
const cancel = () => controller.abort();
process.once('SIGINT', cancel);
process.once('SIGTERM', cancel);

runReadonlySmokeCommand(process.argv.slice(2), controller.signal)
  .catch((error: unknown) => {
    const code = error instanceof SmokeCommandError ? error.code : 'COMMAND_FAILED';
    const reason = error instanceof SmokeCommandError && error.reason ? `: ${error.reason}` : '';
    process.stderr.write(
      `Readonly smoke failed (${code}${reason}); diagnostic upload must remain blocked.\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
    if (controller.signal.aborted) process.exitCode = 1;
  });
