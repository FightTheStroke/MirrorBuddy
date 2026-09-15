/** @vitest-environment node */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectCiEvidence, validateEvidencePaths } from '../collect-ci-evidence.mjs';

const sha = 'a'.repeat(40);
const env = {
  GITHUB_REPOSITORY: 'FightTheStroke/MirrorBuddy',
  GITHUB_SHA: sha,
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '2',
};
interface Job {
  id: number;
  name: string;
  status: string;
  conclusion?: string | null;
  run_id: number;
  run_attempt: number;
  head_sha: string;
}
const job = (
  id: number,
  name = 'Unit tests',
  status = 'completed',
  conclusion: string | null = 'success',
): Job => ({ id, name, status, conclusion, run_id: 123, run_attempt: 2, head_sha: sha });

function fixture() {
  const calls: [string, string[]][] = [];
  const state = {
    run: {
      id: 123,
      run_attempt: 2,
      head_sha: sha,
      repository: { full_name: env.GITHUB_REPOSITORY },
    },
    pages: [
      {
        total_count: 3,
        jobs: [
          job(1, '✅ Deployment Gate'),
          job(2, 'Browser', 'queued', null),
          job(3, 'Optional', 'completed', 'skipped'),
        ],
      },
    ],
    head: sha,
    remote: 'https://github.com/FightTheStroke/MirrorBuddy.git',
    calls,
  };
  const execute = (command: string, args: string[]): string => {
    state.calls.push([command, args]);
    if (command === 'git' && args.join(' ') === 'rev-parse HEAD') return state.head;
    if (command === 'git' && args.join(' ') === 'remote get-url origin') return state.remote;
    assert.equal(command, 'gh', 'must not spawn tests, installs, codegen, or audits');
    assert.equal(args[0], 'api');
    if (args[1].includes('/jobs?')) {
      assert.match(args[1], /attempts\/2\/jobs\?per_page=100$/);
      assert.deepEqual(args.slice(2), ['--paginate', '--slurp']);
      return JSON.stringify(state.pages);
    }
    assert.equal(args[1], 'repos/FightTheStroke/MirrorBuddy/actions/runs/123/attempts/2');
    return JSON.stringify(state.run);
  };
  return Object.assign(state, { execute });
}

type Fixture = ReturnType<typeof fixture>;
const collect = (
  f: Fixture,
  overrides: Partial<Record<keyof typeof env, string | undefined>> = {},
) => collectCiEvidence({ env: { ...env, ...overrides }, execute: f.execute, version: '0.39.5' });

test('records real outcomes, declares evidence limits and runs read-only commands only', () => {
  const f = fixture();
  const result = collect(f);
  assert.equal(result.path, `reports/evidence-pack-0.39.5-${sha.slice(0, 8)}.md`);
  assert.match(result.markdown, /CI execution summary/);
  assert.match(result.markdown, /NOT a native local release certificate/);
  assert.match(result.markdown, /does not authorize local unit or browser reuse/);
  assert.match(result.markdown, /Browser \| queued \| not concluded/);
  assert.match(result.markdown, /Optional \| completed \| skipped/);
  assert.match(result.markdown, /SBOM: not collected/);
  assert.match(result.markdown, /Vulnerability audit: not collected/);
  assert.equal(f.calls.length, 4);
});

test('collects paginated jobs including a gate on the second page', () => {
  const f = fixture();
  f.pages = [
    { total_count: 101, jobs: Array.from({ length: 100 }, (_, i) => job(i + 1)) },
    { total_count: 101, jobs: [job(101, '✅ Deployment Gate')] },
  ];
  assert.match(collect(f).markdown, /101 \| ✅ Deployment Gate/);
});

const invalidCases: [string, (f: Fixture) => unknown][] = [
  ['checkout SHA', (f) => Object.assign(f, { head: 'b'.repeat(40) })],
  ['run SHA', (f) => Object.assign(f.run, { head_sha: 'b'.repeat(40) })],
  ['repository', (f) => Object.assign(f.run.repository, { full_name: 'other/repo' })],
  ['checkout repository', (f) => Object.assign(f, { remote: 'https://github.com/other/repo.git' })],
  ['run identity', (f) => Object.assign(f.run, { id: 999 })],
  ['attempt', (f) => Object.assign(f.run, { run_attempt: 1 })],
  ['job attempt', (f) => Object.assign(f.pages[0].jobs[0], { run_attempt: 1 })],
  ['job SHA', (f) => Object.assign(f.pages[0].jobs[0], { head_sha: 'b'.repeat(40) })],
  ['job run', (f) => Object.assign(f.pages[0].jobs[0], { run_id: 999 })],
  ['missing gate', (f) => Object.assign(f.pages[0].jobs[0], { name: 'Not the gate' })],
  ['failed gate', (f) => Object.assign(f.pages[0].jobs[0], { conclusion: 'failure' })],
  [
    'pending gate',
    (f) => Object.assign(f.pages[0].jobs[0], { status: 'in_progress', conclusion: null }),
  ],
  ['duplicate gate', (f) => Object.assign(f.pages[0].jobs[2], { name: '✅ Deployment Gate' })],
  ['skipped gate', (f) => Object.assign(f.pages[0].jobs[0], { conclusion: 'skipped' })],
  ['missing run metadata', (f) => Object.assign(f, { run: null })],
  [
    'missing job conclusion',
    (f) => {
      delete f.pages[0].jobs[0].conclusion;
    },
  ],
  ['malformed pagination', (f) => Object.assign(f, { pages: null })],
  ['malformed jobs', (f) => Object.assign(f.pages[0], { jobs: null })],
  ['incomplete pagination', (f) => Object.assign(f.pages[0], { total_count: 100 })],
  ['duplicate jobs', (f) => Object.assign(f.pages[0].jobs[1], { id: 1 })],
  ['invalid outcome', (f) => Object.assign(f.pages[0].jobs[1], { status: 'pretend-success' })],
];
for (const [label, mutate] of invalidCases) {
  test(`fails closed for ${label}`, () => {
    const f = fixture();
    mutate(f);
    assert.throws(() => collect(f));
  });
}

test('rejects missing identity and invalid version without spawning commands', () => {
  const f = fixture();
  assert.throws(() => collect(f, { GITHUB_RUN_ATTEMPT: undefined }));
  assert.throws(() => collectCiEvidence({ env, execute: f.execute, version: '../escape' }));
  assert.equal(f.calls.length, 0);
});

test('never exposes CLI failure payload or malformed JSON', () => {
  for (const execute of [
    () => {
      throw new Error('SECRET_CANARY raw stderr');
    },
    (command: string, args: string[]) =>
      command === 'gh' ? 'SECRET_CANARY' : fixture().execute(command, args),
  ]) {
    assert.throws(
      () => collectCiEvidence({ env, execute, version: '0.39.5' }),
      (error: unknown) =>
        error instanceof Error &&
        !error.message.includes('SECRET_CANARY') &&
        /CI evidence/.test(error.message),
    );
  }
});

test('tagged workflow only collects metadata with read permissions and strict artifact upload', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const evidence = workflow.split('\n  release-evidence-pack:')[1];
  assert.ok(evidence);
  assert.match(evidence, /needs: \[deployment-gate\]/);
  assert.match(evidence, /if: startsWith\(github.ref, 'refs\/tags\/v'\)/);
  assert.match(evidence, /contents: read\n\s+actions: read/);
  assert.match(evidence, /GH_TOKEN: \$\{\{ secrets.GITHUB_TOKEN \}\}/);
  assert.match(evidence, /run: node scripts\/collect-ci-evidence.mjs/);
  assert.match(evidence, /path: \$\{\{ steps.evidence.outputs.report_path \}\}/);
  assert.match(evidence, /if-no-files-found: error/);
  assert.match(evidence, /retention-days: 365/);
  assert.doesNotMatch(
    evidence,
    /pnpm|prisma|node_modules|release-evidence-pack\.sh|continue-on-error/,
  );
});

test('filesystem boundary accepts only confined reports and runner output files', () => {
  const report = 'reports/evidence-pack-0.39.5-aaaaaaaa.md';
  const temp = '/tmp/ci-evidence-runner';
  assert.doesNotThrow(() => validateEvidencePaths(report, undefined, undefined));
  assert.doesNotThrow(() =>
    validateEvidencePaths(report, `${temp}/_runner_file_commands/set_output_123`, temp),
  );
  for (const path of ['../outside.md', '/tmp/report.md', 'reports/../outside.md']) {
    assert.throws(() => validateEvidencePaths(path, undefined, undefined));
  }
  for (const path of ['/tmp/outside', `${temp}/_runner_file_commands/other`, 'relative']) {
    assert.throws(() => validateEvidencePaths(report, path, temp));
  }
  assert.throws(() =>
    validateEvidencePaths(report, `${temp}/_runner_file_commands/set_output_123`, undefined),
  );
});
