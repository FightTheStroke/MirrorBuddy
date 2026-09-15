// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const report = () => ({
  success: true,
  numFailedTests: 0,
  numFailedTestSuites: 0,
  testResults: [
    {
      name: '/workspace/apps/web/src/lib/api/middlewares/__tests__/middlewares.test.ts',
      status: 'passed',
      assertionResults: [
        {
          fullName: 'Middleware F-05: withRateLimit should call next() if rate limit not exceeded',
          status: 'passed',
        },
        {
          fullName: 'Middleware F-05: withRateLimit should return 429 if rate limit exceeded',
          status: 'passed',
        },
      ],
    },
  ],
});
function validate(data: unknown, exit = '0') {
  return spawnSync(process.execPath, [join(root, 'scripts/check-rate-limit-evidence.mjs'), exit], {
    encoding: 'utf8',
    input: JSON.stringify(data),
  });
}
describe('rate-limit proof from the existing unit execution', () => {
  it('accepts both actual passing middleware outcomes', () => {
    expect(validate(report()).status).toBe(0);
  });
  it('rejects nonzero runner exits even when assertions passed', () => {
    expect(validate(report(), '1').status).toBe(1);
  });
  it('rejects mixed pass and failed native reports', () => {
    expect(validate({ ...report(), numFailedTests: 1 }).status).toBe(1);
  });
  it('rejects skipped or missing rate-limit assertions', () => {
    const data = report();
    data.testResults[0].assertionResults[1].status = 'pending';
    expect(validate(data).status).toBe(1);
    data.testResults[0].assertionResults.pop();
    expect(validate(data).status).toBe(1);
  });
  it('rejects missing or malformed evidence', () => {
    expect(validate(null).status).toBe(1);
    expect(validate({ success: true }).status).toBe(1);
  });
});
