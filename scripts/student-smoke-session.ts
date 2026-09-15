import { runStudentSmokeCommand } from './lib/student-smoke-command';

const controller = new AbortController();
const cancel = () => controller.abort();
process.once('SIGINT', cancel);
process.once('SIGTERM', cancel);

runStudentSmokeCommand(process.argv.slice(2), controller.signal)
  .then(() => console.log('STUDENT_SMOKE_SUCCESS'))
  .catch(() => {
    console.error('STUDENT_SMOKE_FAILED');
    process.exitCode = 1;
  })
  .finally(() => {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
    if (controller.signal.aborted) process.exitCode = 1;
  });
