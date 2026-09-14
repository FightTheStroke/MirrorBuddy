// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  'timeout-minutes'?: number;
  with?: Record<string, unknown>;
}

interface Job {
  needs?: string[];
  steps: Step[];
}

const workflow = YAML.parse(
  readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf8'),
) as { jobs: Record<string, Job> };

describe('CI efficiency preserves independent quality signals', () => {
  it('runs the complete safety selector union in one process', () => {
    const commands = workflow.jobs['llm-safety-tests'].steps
      .map((step) => step.run ?? '')
      .filter((command) => command.includes('npm run test:unit'));
    expect(commands).toEqual([
      'npm run test:unit -- jailbreak-detector content-filter safety.test --reporter=verbose',
    ]);
    expect(
      workflow.jobs['llm-safety-tests'].steps.some(
        (step) => step.name === 'Verify critical pattern coverage',
      ),
    ).toBe(true);
  });

  it('reuses Python downloads but installs the current robot package every time', () => {
    const steps = workflow.jobs['robot-tests'].steps;
    const setup = steps.find((step) => step.uses?.startsWith('actions/setup-python@'));
    expect(setup?.with).toMatchObject({
      'python-version': '3.11',
      cache: 'pip',
      'cache-dependency-path': 'robot/pyproject.toml',
    });
    const install = steps.find((step) => step.name === 'Install robot package with test extras');
    expect(install?.run).toBe('python -m pip install -e ".[test]"');
    expect(install?.if).toBeUndefined();
    expect(steps.find((step) => step.name === 'Run robot tests')?.run).toBe(
      'python -m pytest tests/ -q',
    );
  });

  it('requires structural and reachability results in both PR decisions', () => {
    const gate = workflow.jobs['pr-gate'];
    expect(gate.needs).toEqual(
      expect.arrayContaining(['structural-safeguards', 'reachability-check']),
    );
    const reject = gate.steps.find((step) => step.name === 'Check all PR jobs passed')?.if;
    const approve = gate.steps.find((step) => step.name === 'PR approved')?.if;
    expect(reject).toContain("needs.structural-safeguards.result != 'success'");
    expect(approve).toContain("needs.structural-safeguards.result == 'success'");
    expect(reject).toContain("needs.reachability-check.result != 'success'");
    expect(approve).toContain("needs.reachability-check.result == 'success'");
    // A skipped reachability check is acceptable only when its path condition is false.
    expect(reject).toContain("needs.detect-changes.outputs.src == 'true'");
    expect(reject).toContain("needs.detect-changes.outputs.config == 'true'");
    expect(approve).toContain("needs.detect-changes.outputs.src != 'true'");
    expect(approve).toContain("needs.detect-changes.outputs.config != 'true'");
  });

  it.each(['success', 'failure', 'cancelled', 'skipped'])(
    'evaluates the real PR expressions for structural result %s',
    (status) => {
      expect(decisions({ 'structural-safeguards': status })).toEqual({
        reject: status !== 'success',
        approve: status === 'success',
      });
    },
  );

  it.each([
    ['success', false, true],
    ['failure', false, false],
    ['cancelled', false, false],
    ['skipped', false, true],
    ['success', true, true],
    ['failure', true, false],
    ['cancelled', true, false],
    ['skipped', true, false],
  ] as const)('evaluates reachability=%s, relevant changes=%s', (status, changed, accepted) => {
    for (const area of ['src', 'config']) {
      expect(decisions({ 'reachability-check': status }, { [area]: String(changed) })).toEqual({
        reject: !accepted,
        approve: accepted,
      });
    }
  });

  it('keeps E2E retries bounded and delegates selection to the tested runner', () => {
    const step = workflow.jobs['e2e-tests'].steps.find(
      (candidate) => candidate.name === 'Run E2E tests (with retries)',
    );
    expect(step?.run).toBe('node scripts/ci-e2e-retry.mjs');
    expect(step?.uses).toBeUndefined();
    expect(step?.['timeout-minutes']).toBe(40);
  });

  it('runs Python checks when their workflow changes and includes them in both gates', () => {
    const filter = workflow.jobs['detect-changes'].steps.find(
      (step) => typeof step.with?.filters === 'string',
    );
    const areas = YAML.parse(String(filter?.with?.filters)) as { robot: string[] };
    expect(areas.robot).toContain('.github/workflows/ci.yml');
    expect(workflow.jobs['pr-gate'].needs).toContain('robot-tests');
    expect(workflow.jobs['deployment-gate'].needs).toContain('robot-tests');
  });

  it.each(['success', 'failure', 'cancelled', 'skipped'])(
    'evaluates the real robot result %s without allowing failed safety tests',
    (status) => {
      for (const changed of [false, true]) {
        const accepted = status === 'success' || (status === 'skipped' && !changed);
        expect(decisions({ 'robot-tests': status }, { robot: String(changed) })).toEqual({
          approve: accepted,
          reject: !accepted,
        });
      }
      expect(decisions({ 'robot-tests': status }, {}, 'deployment-gate')).toEqual({
        approve: status === 'success',
        reject: status !== 'success',
      });
    },
  );
});

function decisions(
  results: Record<string, string>,
  outputs: Record<string, string> = {},
  job = 'pr-gate',
) {
  const gate = workflow.jobs[job];
  const needs = Object.fromEntries(
    (gate.needs ?? []).map((name) => [
      name,
      {
        result: results[name] ?? 'success',
        outputs: { src: 'false', config: 'false', ...outputs },
      },
    ]),
  );
  const evaluate = (name: string): boolean => {
    const condition = gate.steps.find((step) => step.name === name)?.if;
    if (!condition) throw new Error(`Missing PR condition: ${name}`);
    // GitHub permits hyphenated job identifiers; JavaScript requires bracket notation.
    return (
      runInNewContext(
        condition.replace(/needs\.([\w-]+)/g, 'needs["$1"]'),
        { needs },
        {
          timeout: 100,
          contextCodeGeneration: { strings: false, wasm: false },
        },
      ) === true
    );
  };
  return {
    reject: evaluate(job === 'pr-gate' ? 'Check all PR jobs passed' : 'Check all jobs passed'),
    approve: evaluate(job === 'pr-gate' ? 'PR approved' : 'Deployment approved'),
  };
}
