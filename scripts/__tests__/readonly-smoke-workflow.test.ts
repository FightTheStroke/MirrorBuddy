// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readRootScripts, readSmokeWorkflow, smokeStep } from './readonly-smoke-workflow-fixtures';

describe('approved readonly production smoke workflow', () => {
  it('retains the existing trusted promotion context and dependent smoke status', () => {
    const { execution, status } = readSmokeWorkflow();
    expect(execution.needs).toEqual(['auto-promote-production']);
    expect(status.needs).toContain('sync-admin-credentials');
    for (const job of [execution, status]) {
      expect(job.if).toContain("github.event_name == 'push'");
      expect(job.if).toContain("github.ref == 'refs/heads/main'");
      expect(job.if).toContain("needs.auto-promote-production.result == 'success'");
    }
    expect(status.if).toContain('always()');
    expect(status.steps[0].run).toContain('needs.sync-admin-credentials.result');
    expect(status.steps[0].run).toContain('= "success"');
  });

  it('orders reconciliation, issuance, browser, revocation and protected diagnostics', () => {
    const ids = readSmokeWorkflow().execution.steps.flatMap((step) => (step.id ? [step.id] : []));
    expect(ids).toEqual(['reconcile', 'issue', 'smoke', 'revoke', 'diagnostic', 'upload']);
    expect(smokeStep('issue').run).toContain('readonly-smoke-session.ts issue --target production');
    expect(smokeStep('revoke').run).toContain(
      'readonly-smoke-session.ts revoke --target production',
    );
  });

  it('does not manufacture readonly eligibility during owner reconciliation', () => {
    expect(smokeStep('reconcile').env?.NODE_ENV).toBe('production');
    expect(smokeStep('reconcile').env?.ADMIN_READONLY_EMAIL).toBe('');
    expect(smokeStep('reconcile').run).toBe('npm run seed:admin');
    const scripts = readRootScripts();
    expect(scripts['seed:admin']).toBe('npm run script -- scripts/seed-admin.ts');
    expect(scripts.script).toContain('--conditions=react-server');
  });

  it.each(['issue', 'revoke'])('limits %s to step-local existing authority', (id) => {
    const env = smokeStep(id).env;
    expect(env).toEqual({
      NODE_ENV: 'production',
      DATABASE_URL: '${{ secrets.DATABASE_URL }}',
      DIRECT_URL: '${{ secrets.DIRECT_URL }}',
      SESSION_SECRET: '${{ secrets.SESSION_SECRET }}',
      ADMIN_READONLY_EMAIL: '${{ secrets.ADMIN_READONLY_EMAIL }}',
    });
    expect(smokeStep(id).run).toContain(
      '$RUNNER_TEMP/readonly-smoke-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}',
    );
    expect(readSmokeWorkflow().execution.env).toBeUndefined();
    expect(readSmokeWorkflow().execution.outputs).toBeUndefined();
  });

  it('passes only existing student inputs to the browser before private readonly injection', () => {
    const step = smokeStep('smoke');
    expect(Object.keys(step.env ?? {}).sort()).toEqual([
      'ADMIN_READONLY_EMAIL',
      'PROD_TEST_USER_COOKIE_VALUE',
      'PROD_TEST_USER_EMAIL',
      'PROD_TEST_USER_ID',
    ]);
    expect(step.run).toContain('set +x');
    expect(step.run).toContain('/token');
    expect(step.run).toContain('export ADMIN_READONLY_COOKIE_VALUE');
    expect(step.run).toContain('exec npm run test:smoke:prod');
    expect(step.run).not.toMatch(
      /GITHUB_ENV|GITHUB_OUTPUT|add-mask|echo.*ADMIN_READONLY_COOKIE_VALUE/,
    );
  });

  it('attempts scoped cleanup after successful, failed or cancelled issuance', () => {
    const condition = smokeStep('revoke').if;
    expect(condition).toContain('always()');
    for (const outcome of ['success', 'failure', 'cancelled']) {
      expect(condition).toContain(`steps.issue.outcome == '${outcome}'`);
    }
    expect(condition).not.toContain('steps.smoke.outcome');
  });

  it('keeps cleanup time outside the bounded browser execution', () => {
    expect(smokeStep('smoke')['timeout-minutes']).toBe(30);
    expect(smokeStep('revoke')['timeout-minutes']).toBe(5);
    expect(readSmokeWorkflow().execution['timeout-minutes']).toBeGreaterThanOrEqual(80);
  });

  it('uploads only sanitized outcomes after confirmed revocation', () => {
    for (const id of ['diagnostic', 'upload']) {
      expect(smokeStep(id).if).toContain('always()');
      expect(smokeStep(id).if).toContain("steps.revoke.outcome == 'success'");
      expect(smokeStep(id).if).toContain("steps.smoke.outcome == 'failure'");
    }
    const diagnostic = smokeStep('diagnostic').run;
    expect(diagnostic).toContain('umask 077');
    expect(diagnostic).toContain('noclobber');
    expect(diagnostic).toContain('"revocation":"success"');
    const upload = smokeStep('upload');
    expect(upload.if).toContain("steps.diagnostic.outcome == 'success'");
    expect(upload.with?.path).toBe(
      '${{ runner.temp }}/readonly-smoke-outcome-${{ github.run_id }}-${{ github.run_attempt }}.json',
    );
    expect(upload.with?.['if-no-files-found']).toBe('error');
    expect(JSON.stringify(upload)).not.toMatch(/test-results|playwright-report|\/token|\/receipt/);
  });
});
