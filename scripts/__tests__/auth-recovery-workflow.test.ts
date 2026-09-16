// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { smokeStep } from './readonly-smoke-workflow-fixtures';

describe('manual existing-only auth recovery workflow', () => {
  const text = readFileSync(
    resolve(__dirname, '../../.github/workflows/readonly-recovery.yml'),
    'utf8',
  );
  const workflow = parse(text);
  it('defaults to report and has no automatic event or target/account input', () => {
    expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
    const inputs = workflow.on.workflow_dispatch.inputs;
    expect(Object.keys(inputs)).toEqual(['action', 'confirm']);
    expect(inputs.action.default).toBe('report');
    expect(inputs.action.options).toEqual(['report', 'convert']);
    expect(inputs.confirm.default).toBe('');
  });
  it('retains existing approval authority, main ref and read-only repository permission', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(workflow.jobs.recover.environment).toBe('database-repair');
    expect(workflow.jobs.recover.if).toContain("github.ref == 'refs/heads/main'");
    expect(workflow.concurrency['cancel-in-progress']).toBe(false);
    expect(text).toContain('"$CONFIRM" = CONVERT_READONLY');
    expect(text).not.toContain('npm run seed:admin');
    expect(text).not.toMatch(/SESSION_SECRET|PROD_TEST_USER|sessionActivatedAt|gh secret/);
  });
  it('captures process output rather than publishing seed/database diagnostics', () => {
    expect(text).toContain('2>&1)');
    expect(text).toContain("grep -xE 'READONLY_RECOVERY_");
    expect(text).not.toMatch(/echo\s+["']?\$output|cat.*log|upload-artifact/);
  });
});

describe('run-scoped student smoke authority', () => {
  it('provides existing dedicated credentials only to the normal login preflight', () => {
    expect(smokeStep('student_issue').env).toEqual({
      NODE_ENV: 'production',
      DATABASE_URL: '${{ secrets.DATABASE_URL }}',
      DIRECT_URL: '${{ secrets.DIRECT_URL }}',
      PRODUCTION_DB_ID: '${{ secrets.PRODUCTION_DB_ID }}',
      PROD_TEST_USER_ID: '${{ secrets.PROD_TEST_USER_ID }}',
      PROD_TEST_USER_EMAIL: '${{ secrets.PROD_TEST_USER_EMAIL }}',
      PROD_TEST_USER_USERNAME: '${{ secrets.PROD_TEST_USER_USERNAME }}',
      PROD_TEST_USER_PASSWORD: '${{ secrets.PROD_TEST_USER_PASSWORD }}',
    });
    expect(smokeStep('student_issue').run).toContain('student-smoke-session.ts issue');
    expect(smokeStep('student_issue').run).toContain('>/dev/null 2>&1');
  });
  it('runs cleanup even after failed/cancelled issuance without password or DB authority', () => {
    const step = smokeStep('student_revoke');
    expect(step.env).toEqual({ NODE_ENV: 'production' });
    expect(step.if).toContain('always()');
    for (const outcome of ['success', 'failure', 'cancelled'])
      expect(step.if).toContain(`steps.student_issue.outcome == '${outcome}'`);
    expect(step.run).toContain('student-smoke-session.ts revoke');
    expect(step['timeout-minutes']).toBe(5);
  });
  it('fixes the browser origin and never passes the legacy static cookie or login password', () => {
    const step = smokeStep('smoke');
    expect(step.run).toContain('export PROD_URL=https://mirrorbuddy.vercel.app');
    expect(step.env?.PROD_TEST_USER_PASSWORD).toBeUndefined();
    expect(step.env?.PROD_TEST_USER_COOKIE_VALUE).toBeUndefined();
  });
});
