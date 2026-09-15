import { readFileSync } from 'node:fs';

try {
  const [runnerExit, ...extra] = process.argv.slice(2);
  if (runnerExit !== '0' || extra.length) {
    throw new Error('A successful unit execution and native JSON report are required');
  }
  const report = JSON.parse(readFileSync(0, 'utf8'));
  if (
    report?.success !== true ||
    report.numFailedTests !== 0 ||
    report.numFailedTestSuites !== 0 ||
    !Array.isArray(report.testResults)
  ) {
    throw new Error('Unit report is incomplete or contains failures');
  }
  const suites = report.testResults.filter(
    (suite) =>
      typeof suite?.name === 'string' &&
      suite.name.endsWith('/apps/web/src/lib/api/middlewares/__tests__/middlewares.test.ts'),
  );
  if (
    suites.length !== 1 ||
    suites[0].status !== 'passed' ||
    !Array.isArray(suites[0].assertionResults)
  )
    throw new Error('Middleware suite did not pass');
  for (const outcome of [
    'should call next() if rate limit not exceeded',
    'should return 429 if rate limit exceeded',
  ]) {
    const matches = suites[0].assertionResults.filter(
      (test) =>
        typeof test?.fullName === 'string' &&
        test.fullName.includes('F-05: withRateLimit') &&
        test.fullName.endsWith(outcome),
    );
    if (matches.length !== 1 || matches[0].status !== 'passed') {
      throw new Error('Both allowed and blocked rate-limit outcomes must pass');
    }
  }
  console.log('Rate-limit middleware outcomes verified in this unit execution');
} catch {
  console.error('Rate-limit evidence failed: missing, invalid, skipped, or failed unit results');
  process.exitCode = 1;
}
