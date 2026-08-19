import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { describe, expect, it } from 'vitest';

/**
 * G-9: `npx playwright install-deps` shells out to apt-get and can hang on a
 * dpkg lock. On 2026-08-19 it hung on every Playwright job of a `main` run:
 * the accessibility jobs burned their 15-minute budget and were reported as
 * `cancelled` with the tests themselves `skipped`, while the smoke job had no
 * timeout at all and hung for 45 minutes, blocking the v0.24.0 production
 * deploy until the run was cancelled by hand.
 *
 * Two invariants keep that from happening again: the hang must be bounded at
 * the step, and no Playwright job may run without a job-level ceiling.
 */

/**
 * Jobs are recognised by what they run, not by what a step is called. Keying
 * off the display name meant a new job could run Playwright under a renamed
 * step, escape the filter entirely, and still leave the count assertion
 * satisfied by the seven jobs that already comply — the guard would stay green
 * while reintroducing the exact unbounded-job hang it exists to prevent.
 */
const RUNS_PLAYWRIGHT = /playwright\s+(install|test)|test:e2e|test:smoke/;
const INSTALLS_OS_DEPS = /playwright\s+install-deps/;
const INSTALLS_BROWSERS = /playwright\s+install(?!-deps)/;
const WITH_DEPS = /--with-deps/;

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
  'timeout-minutes'?: number;
  'continue-on-error'?: boolean;
}

interface WorkflowJob {
  'timeout-minutes'?: number;
  steps?: WorkflowStep[];
}

interface Workflow {
  jobs: Record<string, WorkflowJob>;
}

function readCiWorkflow(): Workflow {
  return YAML.parse(
    readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf-8'),
  ) as Workflow;
}

function jobsRunningPlaywright(workflow: Workflow): [string, WorkflowJob][] {
  return Object.entries(workflow.jobs).filter(([, job]) =>
    (job.steps ?? []).some((step) => RUNS_PLAYWRIGHT.test(step.run ?? '')),
  );
}

function stepsMatching(job: WorkflowJob, pattern: RegExp): WorkflowStep[] {
  return (job.steps ?? []).filter((step) => pattern.test(step.run ?? ''));
}

describe('Playwright CI jobs cannot hang', () => {
  it('finds the Playwright jobs it is meant to guard', () => {
    expect(jobsRunningPlaywright(readCiWorkflow()).length).toBeGreaterThanOrEqual(7);
  });

  it('bounds every job that installs Playwright deps', () => {
    const unbounded = jobsRunningPlaywright(readCiWorkflow())
      .filter(([, job]) => typeof job['timeout-minutes'] !== 'number')
      .map(([name]) => name);

    expect(unbounded).toEqual([]);
  });

  it('bounds the install-deps step itself and never lets it fail the job', () => {
    const offenders = jobsRunningPlaywright(readCiWorkflow()).flatMap(([name, job]) =>
      stepsMatching(job, INSTALLS_OS_DEPS)
        .filter(
          (step) =>
            typeof step['timeout-minutes'] !== 'number' || step['continue-on-error'] !== true,
        )
        .map(() => name),
    );

    expect(offenders).toEqual([]);
  });

  it('bounds the browser install too', () => {
    const offenders = jobsRunningPlaywright(readCiWorkflow()).flatMap(([name, job]) =>
      stepsMatching(job, INSTALLS_BROWSERS)
        .filter((step) => typeof step['timeout-minutes'] !== 'number')
        .map(() => name),
    );

    expect(offenders).toEqual([]);
  });

  it('keeps apt out of the required browser install', () => {
    const withDeps = jobsRunningPlaywright(readCiWorkflow()).flatMap(([name, job]) =>
      stepsMatching(job, WITH_DEPS).map(() => name),
    );

    expect(withDeps).toEqual([]);
  });
});
