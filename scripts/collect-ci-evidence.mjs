#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fail = () => {
  throw new Error('CI evidence collection failed: invalid or unavailable execution metadata');
};
const statuses = new Set(['queued', 'in_progress', 'completed', 'waiting', 'pending', 'requested']);
const conclusions = new Set([
  'success',
  'failure',
  'neutral',
  'cancelled',
  'skipped',
  'timed_out',
  'action_required',
  'stale',
  'startup_failure',
]);
const integer = (value) => Number.isSafeInteger(value) && value > 0;
const cell = (value) =>
  String(value)
    .replace(/[|\r\n]/g, ' ')
    .replace(/</g, '&lt;');

function execute(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
    maxBuffer: 20 * 1024 * 1024,
  });
}

function command(run, executable, args) {
  try {
    const output = run(executable, args);
    if (typeof output !== 'string') fail();
    return output.trim();
  } catch {
    fail();
  }
}

function json(run, args) {
  try {
    return JSON.parse(command(run, 'gh', args));
  } catch {
    fail();
  }
}

function checkoutRepository(remote) {
  const match =
    /^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(
      remote,
    );
  if (!match) fail();
  return match[1];
}

function validVersion(value) {
  if (typeof value !== 'string' || value.length > 128) return false;
  const [core, ...suffix] = value.split('-');
  return (
    /^\d+\.\d+\.\d+$/.test(core) &&
    (suffix.length === 0 || /^[A-Za-z0-9.-]+$/.test(suffix.join('-')))
  );
}

/** Collect execution metadata only; never run or substitute for native release checks. */
export function collectCiEvidence({ env, version, execute: run = execute } = {}) {
  const repo = env?.GITHUB_REPOSITORY;
  const sha = env?.GITHUB_SHA;
  const runId = env?.GITHUB_RUN_ID;
  const attempt = env?.GITHUB_RUN_ATTEMPT;
  if (
    typeof repo !== 'string' ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
    typeof sha !== 'string' ||
    !/^[a-f0-9]{40}$/.test(sha) ||
    typeof runId !== 'string' ||
    !/^[1-9]\d*$/.test(runId) ||
    !integer(Number(runId)) ||
    typeof attempt !== 'string' ||
    !/^[1-9]\d*$/.test(attempt) ||
    !integer(Number(attempt)) ||
    !validVersion(version)
  )
    fail();

  if (command(run, 'git', ['rev-parse', 'HEAD']) !== sha) fail();
  if (checkoutRepository(command(run, 'git', ['remote', 'get-url', 'origin'])) !== repo) fail();
  const endpoint = `repos/${repo}/actions/runs/${runId}/attempts/${attempt}`;
  const metadata = json(run, ['api', endpoint]);
  if (
    metadata?.id !== Number(runId) ||
    metadata?.run_attempt !== Number(attempt) ||
    metadata?.head_sha !== sha ||
    metadata?.repository?.full_name !== repo
  )
    fail();

  const pages = json(run, ['api', `${endpoint}/jobs?per_page=100`, '--paginate', '--slurp']);
  if (!Array.isArray(pages) || pages.length === 0) fail();
  const total = pages[0]?.total_count;
  if (!integer(total)) fail();
  const jobs = [];
  const ids = new Set();
  for (const page of pages) {
    if (page?.total_count !== total || !Array.isArray(page.jobs) || page.jobs.length === 0) fail();
    for (const job of page.jobs) {
      if (
        !integer(job?.id) ||
        ids.has(job.id) ||
        job.run_id !== Number(runId) ||
        job.run_attempt !== Number(attempt) ||
        job.head_sha !== sha ||
        typeof job.name !== 'string' ||
        !job.name.trim() ||
        !statuses.has(job.status) ||
        (job.status === 'completed' ? !conclusions.has(job.conclusion) : job.conclusion !== null)
      )
        fail();
      ids.add(job.id);
      jobs.push(job);
    }
  }
  if (jobs.length !== total) fail();
  const gates = jobs.filter((job) => job.name === '✅ Deployment Gate');
  if (gates.length !== 1 || gates[0].status !== 'completed' || gates[0].conclusion !== 'success')
    fail();

  const markdown = [
    '# CI execution summary',
    '',
    '**NOT a native local release certificate.**',
    'This summary does not authorize local unit or browser reuse.',
    '',
    `Repository: ${repo}`,
    `Checkout SHA: ${sha}`,
    `Version: ${version}`,
    `Run: ${runId}; attempt: ${attempt}`,
    `Source: https://github.com/${repo}/actions/runs/${runId}/attempts/${attempt}`,
    'Required ✅ Deployment Gate: completed / success in this exact attempt.',
    '',
    'Snapshot of actual job execution outcomes; pending jobs may change after collection.',
    '',
    '| Job ID | Job | Status | Conclusion |',
    '| --- | --- | --- | --- |',
    ...jobs.map(
      (job) =>
        `| ${job.id} | ${cell(job.name)} | ${job.status} | ${job.conclusion ?? 'not concluded'} |`,
    ),
    '',
    '## Evidence not collected',
    '',
    '- Detailed native unit/browser counts and reports: not collected.',
    '- Native local release certificate: not collected.',
    '- SBOM: not collected.',
    '- Vulnerability audit: not collected; no vulnerability count is asserted.',
    '- No tests, builds, installs, code generation, or audits were run by this collector.',
    '',
  ].join('\n');
  return { path: `reports/evidence-pack-${version}-${sha.slice(0, 8)}.md`, markdown };
}

/** Constrain generated reports and GitHub's runner-provided output command file. */
export function validateEvidencePaths(reportPath, outputPath, runnerTemp) {
  if (
    typeof reportPath !== 'string' ||
    !/^reports\/evidence-pack-[A-Za-z0-9.-]+-[a-f0-9]{8}\.md$/.test(reportPath) ||
    dirname(resolve(reportPath)) !== resolve('reports')
  )
    fail();
  if (
    outputPath !== undefined &&
    (typeof outputPath !== 'string' ||
      !isAbsolute(outputPath) ||
      typeof runnerTemp !== 'string' ||
      !isAbsolute(runnerTemp) ||
      dirname(resolve(outputPath)) !== join(resolve(runnerTemp), '_runner_file_commands') ||
      !/^set_output_[A-Za-z0-9-]+$/.test(basename(outputPath)))
  )
    fail();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const version = readFileSync('VERSION', 'utf8').trim();
    const result = collectCiEvidence({ env: process.env, version });
    const outputPath = process.env.GITHUB_OUTPUT;
    validateEvidencePaths(result.path, outputPath, process.env.RUNNER_TEMP);
    mkdirSync('reports', { recursive: true });
    if (realpathSync('reports') !== resolve('reports')) fail();
    if (outputPath) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Validated runner command-file path; reject symlinks and non-files before append.
      if (realpathSync(outputPath) !== resolve(outputPath) || !lstatSync(outputPath).isFile())
        fail();
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Validated filename confined to non-symlink reports directory; exclusive creation rejects existing files/symlinks.
    writeFileSync(result.path, result.markdown, { flag: 'wx' });
    if (outputPath) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Validated existing regular GitHub output file under RUNNER_TEMP/_runner_file_commands.
      appendFileSync(outputPath, `report_path=${result.path}\n`);
    }
    console.log(`CI execution summary written: ${result.path}`);
  } catch {
    console.error('CI evidence collection failed; no release certificate was issued.');
    process.exitCode = 1;
  }
}
