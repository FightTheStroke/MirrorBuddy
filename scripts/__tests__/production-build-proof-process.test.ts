// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { proofFile, nextBuildIdFile } from '../lib/production-build-proof.mjs';
import { buildFixture, productionValues, sourceCommit } from './production-build-fixture';

// Real subprocess budgets: each spawnSync call below carries an explicit
// timeout (see production-build-fixture.ts and this file's consume()).
// Vitest's own default testTimeout (5_000ms) is otherwise shorter than
// those subprocess budgets, so each test declares a per-test timeout that
// is bounded just above the spawnSync budget(s) it actually exercises.
const SINGLE_SPAWN_TIMEOUT_MS = 20_000; // one 15_000ms spawnSync + margin
const DOUBLE_SPAWN_TIMEOUT_MS = 35_000; // two sequential 15_000ms spawnSync calls + margin

let producer: ReturnType<typeof buildFixture>;
let consumer: ReturnType<typeof buildFixture>;
beforeEach(() => {
  producer = buildFixture();
  consumer = buildFixture();
});
afterEach(() => {
  producer.clean();
  consumer.clean();
});
const receiptExists = () => existsSync(join(producer.directory, proofFile));
const seedOldOutput = () => {
  for (const [file, data] of [
    [proofFile, '{"deploymentId":"dpl_old"}'],
    [nextBuildIdFile, 'old'],
  ]) {
    mkdirSync(dirname(join(producer.directory, file)), { recursive: true });
    writeFileSync(join(producer.directory, file), data);
  }
};

function consume() {
  consumer.executable(
    'git',
    `console.log(process.argv[2] === 'rev-parse' ? '${sourceCommit}' : '');`,
  );
  consumer.executable(
    'vercel',
    `
const fs = require('node:fs');
const cmd = process.argv[2];
fs.appendFileSync('external-commands.jsonl', JSON.stringify(cmd) + '\\n');
const deployment = {id:'dpl_synthetic',url:'synthetic.vercel.app',target:'production',readyState:'READY'};
try {
  switch(cmd) {
    case '--version': console.log('56.3.2'); break;
    case 'deploy': case 'inspect': console.log(JSON.stringify(deployment)); break;
    case 'list': console.log(JSON.stringify({deployments:[{...deployment,state:'READY',
      meta:{verifiedSourceCommit:'${sourceCommit}',productionBuildRun:'123-2'}}]})); break;
    case 'curl': console.log(fs.readFileSync(${JSON.stringify(join(producer.directory, proofFile))},'utf8')+'\\n200'); break;
    case 'promote': break;
    default: process.exit(99);
  }
} catch { process.exit(1); }
`,
  );
  writeFileSync(
    join(consumer.directory, 'network-boundary.mjs'),
    `
globalThis.fetch = async (url) => {
  if (url !== 'https://www.mirrorbuddy.org/api/health') throw new Error('Unexpected network');
  return {status:200};
};
`,
  );
  const result = spawnSync(
    process.execPath,
    ['--import', './network-boundary.mjs', 'scripts/deploy-validated-production.mjs'],
    {
      cwd: consumer.directory,
      encoding: 'utf8',
      timeout: 15_000,
      env: {
        ...consumer.env,
        GITHUB_SHA: sourceCommit,
        GITHUB_RUN_ID: '123',
        GITHUB_RUN_ATTEMPT: '2',
        VERCEL_PROJECT_ID: 'prj_synthetic',
        VERCEL_ORG_ID: 'team_synthetic',
        VERCEL_TOKEN: 'synthetic-token',
        VERCEL_CLI_VERSION: '56.3.2',
      },
    },
  );
  const log = join(consumer.directory, 'external-commands.jsonl');
  const commands = existsSync(log)
    ? readFileSync(log, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
    : [];
  return { ...result, commands };
}

describe('real producer and consumer processes with synthetic external build/deployment boundaries', () => {
  it(
    'only promotes after consuming the artifact actually produced after validation and build',
    () => {
      const build = producer.build(productionValues());
      expect(build.status, build.stderr).toBe(0);
      const receipt = producer.receipt();
      expect(receipt).toMatchObject({
        sourceCommit,
        deploymentId: 'dpl_synthetic',
        target: 'production',
        valuesValidated: true,
        buildCompleted: true,
        nextBuildId: 'synthetic-next-build',
      });
      expect(JSON.stringify(receipt)).not.toMatch(/synthetic-value|SESSION_SECRET|DATABASE_URL/);
      const result = consume();
      expect(result.status, result.stderr).toBe(0);
      expect(result.commands).toEqual([
        '--version',
        'deploy',
        'list',
        'curl',
        'promote',
        'inspect',
        'inspect',
      ]);
    },
    DOUBLE_SPAWN_TIMEOUT_MS,
  );

  it(
    'rejects a success-shaped READY response when build execution was skipped entirely',
    () => {
      const result = consume();
      expect(result.status).toBe(1);
      expect(result.commands).not.toContain('promote');
    },
    SINGLE_SPAWN_TIMEOUT_MS,
  );

  it.each([proofFile, '.vercel/output', 'apps/web/.next'])(
    'rejects prior local build output %s before uploading source',
    (path) => {
      mkdirSync(join(consumer.directory, path), { recursive: true });
      const result = consume();
      expect(result.status).toBe(1);
      expect(result.commands).toEqual([]);
    },
    SINGLE_SPAWN_TIMEOUT_MS,
  );

  it.each(['preview', 'development'])(
    'does not produce production proof in %s',
    (target) => {
      seedOldOutput();
      const result = producer.build({ VERCEL_ENV: target, DATABASE_URL: 'synthetic-db' });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('BUILD_REQUESTED');
      expect(receiptExists()).toBe(false);
      expect(consume().commands).not.toContain('promote');
    },
    DOUBLE_SPAWN_TIMEOUT_MS,
  );

  it.each(['VERCEL', 'VERCEL_GIT_COMMIT_SHA', 'VERCEL_DEPLOYMENT_ID', 'VERCEL_PROJECT_ID'])(
    'refuses production build without runtime identity %s',
    (key) => {
      const result = producer.build({ ...productionValues(), [key]: undefined });
      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain('BUILD_REQUESTED');
      expect(receiptExists()).toBe(false);
    },
    SINGLE_SPAWN_TIMEOUT_MS,
  );

  it.each(['', 'synthetic-private-marker\\n', 'synthetic-private-marker\n'])(
    'invalidates old output before rejecting bad resident values (%j)',
    (value) => {
      seedOldOutput();
      const result = producer.build({ ...productionValues(), SESSION_SECRET: value });
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).not.toMatch(/BUILD_REQUESTED|synthetic-private-marker/);
      expect(receiptExists()).toBe(false);
      expect(existsSync(join(producer.directory, nextBuildIdFile))).toBe(false);
      expect(consume().commands).not.toContain('promote');
    },
    DOUBLE_SPAWN_TIMEOUT_MS,
  );

  it(
    'preserves a failed build exit and never emits proof',
    () => {
      seedOldOutput();
      const result = producer.build(productionValues(), 23);
      expect(result.status).toBe(23);
      expect(result.stdout).toContain('BUILD_REQUESTED');
      expect(receiptExists()).toBe(false);
      expect(consume().commands).not.toContain('promote');
    },
    DOUBLE_SPAWN_TIMEOUT_MS,
  );

  it(
    'requires a freshly generated Next BUILD_ID even after build command exit zero',
    () => {
      seedOldOutput();
      const result = producer.build(productionValues(), 0, false);
      expect(result.status).toBe(1);
      expect(receiptExists()).toBe(false);
      expect(consume().commands).not.toContain('promote');
    },
    DOUBLE_SPAWN_TIMEOUT_MS,
  );

  it(
    'propagates receipt generation filesystem failure',
    () => {
      mkdirSync(join(producer.directory, 'apps/web/public'));
      writeFileSync(join(producer.directory, proofFile), 'old');
      producer.executable(
        'npm',
        `
const fs = require('node:fs');
fs.mkdirSync('apps/web/.next', {recursive:true});
fs.writeFileSync('apps/web/.next/BUILD_ID','synthetic-build');
fs.mkdirSync(${JSON.stringify(proofFile)});
`,
      );
      const result = producer.invoke(productionValues());
      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain('receipt created');
      expect(consume().commands).not.toContain('promote');
    },
    DOUBLE_SPAWN_TIMEOUT_MS,
  );

  it(
    'propagates external build termination rather than producing proof',
    () => {
      producer.executable('npm', `process.kill(process.pid, 'SIGTERM');`);
      expect(producer.invoke(productionValues()).status).toBe(1);
      expect(receiptExists()).toBe(false);
    },
    SINGLE_SPAWN_TIMEOUT_MS,
  );

  it(
    'blocks validator mutation during the external build',
    () => {
      producer.executable(
        'npm',
        `
const fs = require('node:fs');
fs.mkdirSync('apps/web/.next', {recursive:true});
fs.writeFileSync('apps/web/.next/BUILD_ID','synthetic-build');
fs.appendFileSync('scripts/lib/production-env-policy.ts','\\n');
`,
      );
      expect(producer.invoke(productionValues()).status).toBe(1);
      expect(receiptExists()).toBe(false);
    },
    SINGLE_SPAWN_TIMEOUT_MS,
  );

  it.each([
    { deploymentId: 'dpl_old' },
    { sourceCommit: 'b'.repeat(40) },
    { target: 'preview' },
    { configHash: 'b'.repeat(64) },
    { validatorHash: 'b'.repeat(64) },
    { valuesValidated: false },
    { buildCompleted: false },
    { projectId: 'prj_other' },
    { nextBuildId: '' },
    { extra: 'unqualified' },
  ])(
    'rejects altered or replayed actual receipt %j',
    (delta) => {
      expect(producer.build(productionValues()).status).toBe(0);
      writeFileSync(
        join(producer.directory, proofFile),
        JSON.stringify({ ...producer.receipt(), ...delta }),
      );
      const result = consume();
      expect(result.status).toBe(1);
      expect(result.commands).not.toContain('promote');
    },
    DOUBLE_SPAWN_TIMEOUT_MS,
  );
});
