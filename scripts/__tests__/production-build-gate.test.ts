// @vitest-environment node
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deployValidatedProduction } from '../deploy-validated-production.mjs';
import { buildSourceIdentity } from '../lib/production-build-proof.mjs';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));
vi.mock('node:fs', async (original) => ({
  ...(await original<typeof import('node:fs')>()),
  existsSync: vi.fn(() => false),
}));
const exec = vi.mocked(execFileSync);
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const sha = 'a'.repeat(40);
const env = {
  GITHUB_SHA: sha,
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '2',
  VERCEL_TOKEN: 'synthetic-token',
  VERCEL_PROJECT_ID: 'prj_synthetic',
  VERCEL_ORG_ID: 'team_synthetic',
  VERCEL_CLI_VERSION: '56.3.2',
};
const deployment = {
  id: 'dpl_synthetic',
  url: 'synthetic.vercel.app',
  target: 'production',
  readyState: 'READY',
};
let proof: unknown;
let status: number;
let failed: boolean;
const promoted = () => exec.mock.calls.some(([, args]) => args?.[0] === 'promote');
const validProof = () => ({
  schema: 1,
  target: 'production',
  valuesValidated: true,
  buildCompleted: true,
  sourceCommit: sha,
  deploymentId: 'dpl_synthetic',
  projectId: env.VERCEL_PROJECT_ID,
  ...buildSourceIdentity(process.cwd()),
  nextBuildId: 'synthetic-next-build',
});

beforeEach(() => {
  vi.clearAllMocks();
  status = 200;
  failed = false;
  proof = validProof();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
  exec.mockImplementation((command, args) => {
    const parts = args as string[];
    if (command === 'git') return parts[0] === 'rev-parse' ? sha : '';
    if (parts[0] === '--version') return '56.3.2';
    if (parts[0] === 'deploy' || parts[0] === 'inspect') return JSON.stringify(deployment);
    if (parts[0] === 'list')
      return JSON.stringify({
        deployments: [
          {
            ...deployment,
            state: 'READY',
            meta: { verifiedSourceCommit: sha, productionBuildRun: '123-2' },
          },
        ],
      });
    if (parts[0] === 'curl') {
      if (failed) throw new Error('synthetic-private-marker');
      return `${typeof proof === 'string' ? proof : JSON.stringify(proof)}\n${status}`;
    }
    if (parts[0] === 'promote') return '';
    throw new Error('Unexpected external command');
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('positive production build gate', () => {
  it('disables Git automatic deployments without canceling source builds', () => {
    expect(config.ignoreCommand).toBeNull();
    expect(config.git).toEqual({ deploymentEnabled: false });
  });

  it.each(['exit 0', 'exit 1', '', undefined])(
    'rejects unqualified local ignore override %j before deployment',
    async (ignoreCommand) => {
      const original = fs.readFileSync;
      vi.spyOn(fs, 'readFileSync').mockImplementation((file, options) => {
        if (String(file).endsWith('vercel.json'))
          return JSON.stringify({ ...config, ignoreCommand });
        return original(file, options);
      });
      await expect(deployValidatedProduction(env)).rejects.toThrow();
      expect(exec.mock.calls.some(([, args]) => args?.[0] === 'deploy')).toBe(false);
    },
  );

  it.each([
    { git: { deploymentEnabled: true } },
    { git: {} },
    { buildCommand: 'exit 0' },
    { builds: [] },
    { framework: null },
    { outputDirectory: 'public' },
  ])('rejects alternate or unqualified build configuration %j', async (delta) => {
    const original = fs.readFileSync;
    vi.spyOn(fs, 'readFileSync').mockImplementation((file, options) => {
      if (String(file).endsWith('vercel.json')) return JSON.stringify({ ...config, ...delta });
      return original(file, options);
    });
    await expect(deployValidatedProduction(env)).rejects.toThrow();
    expect(exec.mock.calls.some(([, args]) => args?.[0] === 'deploy')).toBe(false);
  });

  it.each([
    ['absent', null],
    ['empty', {}],
    ['login HTML', '<html>Protection</html>'],
    ['skipped build', { target: 'production', valuesValidated: true }],
    ['old deployment replay', { deploymentId: 'dpl_old', target: 'production' }],
    ['preview', { deploymentId: 'dpl_synthetic', target: 'preview' }],
    ['nonproduction', { deploymentId: 'dpl_synthetic', target: 'development' }],
    ['wrong source', { sourceCommit: 'b'.repeat(40) }],
    ['wrong config', { configHash: 'b'.repeat(64) }],
    ['wrong validator', { validatorHash: 'b'.repeat(64) }],
    ['validation skipped', { valuesValidated: false }],
    ['build skipped', { buildCompleted: false }],
  ])('rejects READY with %s proof before alias promotion', async (_name, value) => {
    proof = value && typeof value === 'object' ? { ...validProof(), ...value } : value;
    if (_name === 'empty') proof = {};
    if (_name === 'skipped build') proof = { ...validProof(), nextBuildId: undefined };
    await expect(deployValidatedProduction(env)).rejects.toThrow();
    expect(promoted()).toBe(false);
  });

  it.each([301, 401, 403, 404, 500])('rejects proof HTTP %i', async (code) => {
    status = code;
    await expect(deployValidatedProduction(env)).rejects.toThrow();
    expect(promoted()).toBe(false);
  });

  it('propagates proof transport failure without disclosing captured output', async () => {
    failed = true;
    await expect(deployValidatedProduction(env)).rejects.not.toThrow('synthetic-private-marker');
    expect(promoted()).toBe(false);
  });

  it('requires authenticated exact-deployment proof before promoting, without redirect following', async () => {
    await deployValidatedProduction(env);
    const calls = exec.mock.calls.map(([, args]) => args as string[]);
    const curl = calls.find((args) => args[0] === 'curl')!;
    expect(curl.slice(0, 5)).toEqual([
      'curl',
      '/production-build-proof.js',
      '--deployment',
      deployment.id,
      '--yes',
    ]);
    expect(curl.indexOf('--token')).toBeLessThan(curl.indexOf('--'));
    expect(curl).toContain('--no-location');
    expect(curl).toContain('--fail');
    expect(calls.findIndex((args) => args[0] === 'curl')).toBeLessThan(
      calls.findIndex((args) => args[0] === 'promote'),
    );
  });
});
