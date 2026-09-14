// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
const root = resolve(import.meta.dirname, '../..');
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
const deployment = () => ({
  id: 'dpl_synthetic',
  url: 'https://synthetic.vercel.app',
  target: 'production',
  readyState: 'READY',
});
const listing = () => ({
  deployments: [
    {
      ...deployment(),
      url: 'synthetic.vercel.app',
      state: 'READY',
      meta: { verifiedSourceCommit: sha, productionBuildRun: '123-2' },
    },
  ],
});
let build: unknown;
let list: unknown;
let alias: unknown;
let failCommand: string | undefined;
let dirty: string;
let head: string;
const commands = () =>
  exec.mock.calls.filter(([command]) => command === 'vercel').map(([, args]) => args as string[]);
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.clearAllMocks();
  build = deployment();
  list = listing();
  alias = deployment();
  failCommand = undefined;
  dirty = '';
  head = sha;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
  exec.mockImplementation((command, args) => {
    const parts = args as string[];
    if (command === 'git') return parts[0] === 'rev-parse' ? head : dirty;
    if (parts[0] === failCommand) throw new Error('synthetic-private-marker');
    if (parts[0] === '--version') return '56.3.2';
    if (parts[0] === 'deploy') return JSON.stringify(build);
    if (parts[0] === 'list') return JSON.stringify(list);
    if (parts[0] === 'inspect') return JSON.stringify(alias);
    if (parts[0] === 'curl')
      return `${JSON.stringify({
        schema: 1,
        target: 'production',
        valuesValidated: true,
        buildCompleted: true,
        sourceCommit: sha,
        deploymentId: 'dpl_synthetic',
        projectId: env.VERCEL_PROJECT_ID,
        ...buildSourceIdentity(root),
        nextBuildId: 'synthetic-next-build',
      })}\n200`;
    if (parts[0] === 'promote') return '';
    throw new Error('Unexpected external command');
  });
});

describe('production source-build promotion boundary', () => {
  it('builds exact clean source remotely with production values and domains withheld before promoting', async () => {
    await deployValidatedProduction(env);
    expect(commands().map((args) => args[0])).toEqual([
      '--version',
      'deploy',
      'list',
      'curl',
      'promote',
      'inspect',
      'inspect',
    ]);
    expect(commands()[1]).toEqual([
      'deploy',
      '--prod',
      '--skip-domain',
      '--force',
      '--yes',
      '--format=json',
      '--build-env',
      `VERCEL_GIT_COMMIT_SHA=${sha}`,
      '--meta',
      `verifiedSourceCommit=${sha}`,
      '--meta',
      'productionBuildRun=123-2',
      '--token',
      env.VERCEL_TOKEN,
      '--scope',
      env.VERCEL_ORG_ID,
    ]);
    expect(commands()[2]).toEqual([
      'list',
      env.VERCEL_PROJECT_ID,
      '--prod',
      '--format=json',
      '--meta',
      'productionBuildRun=123-2',
      '--token',
      env.VERCEL_TOKEN,
      '--scope',
      env.VERCEL_ORG_ID,
    ]);
    expect(commands()[4]).toEqual([
      'promote',
      'dpl_synthetic',
      '--timeout=0',
      '--yes',
      '--token',
      env.VERCEL_TOKEN,
      '--scope',
      env.VERCEL_ORG_ID,
    ]);
    expect(JSON.stringify(commands())).not.toMatch(/prebuilt|pull|--env|rollback|alias set/);
    expect(
      commands()
        .flat()
        .filter((arg) => arg === '--build-env'),
    ).toHaveLength(1);
    expect(
      commands()
        .filter((args) => args[0] === 'inspect')
        .map((args) => args[1]),
    ).toEqual(['mirrorbuddy.org', 'www.mirrorbuddy.org']);
  });

  it.each(['deploy', 'list', 'promote', '--version'])(
    'propagates %s failure without leaking output',
    async (cmd) => {
      failCommand = cmd;
      await expect(deployValidatedProduction(env)).rejects.not.toThrow('synthetic-private-marker');
      if (cmd !== 'promote') expect(commands().some((args) => args[0] === 'promote')).toBe(false);
    },
  );

  it.each([
    null,
    {},
    { ...deployment(), target: 'preview' },
    { ...deployment(), readyState: 'ERROR' },
    { ...deployment(), readyState: 'BUILDING' },
    { ...deployment(), error: { message: 'failed' } },
    { ...deployment(), url: 'https://attacker.invalid' },
  ])('rejects success-shaped invalid build output %j', async (value) => {
    build = value;
    await expect(deployValidatedProduction(env)).rejects.toThrow();
    expect(commands().some((args) => args[0] === 'promote')).toBe(false);
  });

  it.each([
    {},
    { deployments: [] },
    { deployments: [listing().deployments[0], listing().deployments[0]] },
    { deployments: [{ ...listing().deployments[0], id: 'dpl_old' }] },
    { deployments: [{ ...listing().deployments[0], state: 'ERROR' }] },
    { deployments: [{ ...listing().deployments[0], target: 'preview' }] },
    { deployments: [{ ...listing().deployments[0], customEnvironment: { slug: 'custom' } }] },
    { deployments: [{ ...listing().deployments[0], url: 'old.vercel.app' }] },
    {
      deployments: [
        {
          ...listing().deployments[0],
          meta: { verifiedSourceCommit: 'b'.repeat(40), productionBuildRun: '123-2' },
        },
      ],
    },
    {
      deployments: [
        {
          ...listing().deployments[0],
          meta: { verifiedSourceCommit: sha, productionBuildRun: '122-1' },
        },
      ],
    },
  ])('refuses stale, preview or unbound source listing %j', async (value) => {
    list = value;
    await expect(deployValidatedProduction(env)).rejects.toThrow();
    expect(commands().some((args) => args[0] === 'promote')).toBe(false);
  });

  it.each(['head', 'dirty'])('rejects %s mismatch before remote deployment', async (kind) => {
    if (kind === 'head') head = 'b'.repeat(40);
    else dirty = ' M vercel.json';
    await expect(deployValidatedProduction(env)).rejects.toThrow();
    expect(commands().some((args) => args[0] === 'deploy')).toBe(false);
  });

  it.each([
    undefined,
    {},
    { ...env, GITHUB_SHA: '' },
    { ...env, GITHUB_RUN_ATTEMPT: '' },
    { ...env, VERCEL_PROJECT_ID: '' },
    { ...env, VERCEL_ORG_ID: 'team_synthetic\n' },
    { ...env, VERCEL_TOKEN: '' },
    { ...env, VERCEL_CLI_VERSION: '59.11.7' },
  ])('rejects absent identity inputs %j', async (value) => {
    await expect(deployValidatedProduction(value)).rejects.toThrow();
    expect(commands()).toEqual([]);
  });

  it.each(['old', 'preview', 'unhealthy', 'inspect-failure'])(
    'does not report success for %s production alias',
    async (kind) => {
      if (kind === 'old') alias = { ...deployment(), id: 'dpl_old' };
      if (kind === 'preview') alias = { ...deployment(), target: 'preview' };
      if (kind === 'unhealthy') vi.mocked(fetch).mockResolvedValue({ status: 503 } as Response);
      if (kind === 'inspect-failure') failCommand = 'inspect';
      await expect(deployValidatedProduction(env)).rejects.toThrow();
      expect(commands().filter((args) => args[0] === 'promote')).toHaveLength(1);
    },
  );

  it('wires checked-out expected source and project metadata after the unchanged staging gate', () => {
    const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');
    const job = workflow.split('\n  auto-promote-production:')[1].split('\n  # ROBOT APP STORE')[0];
    expect(job).toContain('uses: actions/checkout@v4');
    expect(job).toContain('ref: ${{ github.sha }}');
    expect(job).toContain('needs.deploy-to-staging.outputs.project_id');
    expect(job).toContain('needs.deploy-to-staging.outputs.org_id');
    expect(job).toContain('node scripts/deploy-validated-production.mjs');
    expect(job.indexOf('Pre-promote staging health check')).toBeLessThan(
      job.indexOf('node scripts/deploy-validated-production.mjs'),
    );
    expect(job).not.toMatch(
      /vercel promote "\$STAGING_URL"|vercel pull|env pull|\bSKIP_|--prebuilt/,
    );
    expect(job).not.toContain('[0-9]+(s|m) ago');
  });
});
