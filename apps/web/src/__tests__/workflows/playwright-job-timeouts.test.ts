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

const PLAYWRIGHT_DEPS_STEP = 'Install Playwright deps (if cached)';

interface WorkflowStep {
  name?: string;
  run?: string;
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
    (job.steps ?? []).some((step) => step.name === PLAYWRIGHT_DEPS_STEP),
  );
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
      (job.steps ?? [])
        .filter((step) => step.name === PLAYWRIGHT_DEPS_STEP)
        .filter(
          (step) =>
            typeof step['timeout-minutes'] !== 'number' || step['continue-on-error'] !== true,
        )
        .map(() => name),
    );

    expect(offenders).toEqual([]);
  });
});
