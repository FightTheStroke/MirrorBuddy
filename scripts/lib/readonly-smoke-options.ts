import { tmpdir } from 'node:os';
import { basename, isAbsolute } from 'node:path';
import { z } from 'zod';
import { assertAuthScriptTarget } from './auth-script-target';

export type SmokeFailure =
  | 'INVALID_ARGUMENTS'
  | 'INVALID_TARGET'
  | 'PRIVATE_FILES'
  | 'ISSUANCE_FAILED'
  | 'REVOCATION_FAILED'
  | 'CANCELLED'
  | 'DISCONNECT_FAILED';

export class SmokeCommandError extends Error {
  constructor(public readonly code: SmokeFailure) {
    super(code);
    this.name = 'SmokeCommandError';
  }
}

export interface SmokeOptions {
  action: 'issue' | 'revoke';
  target: 'synthetic' | 'production';
  directory: string;
  temporaryRoot: string;
}

export function readonlySmokeOptions(
  args: unknown,
  env: NodeJS.ProcessEnv,
  nodeVersion: string,
): SmokeOptions {
  const parsed = z
    .tuple([
      z.enum(['issue', 'revoke']),
      z.literal('--target'),
      z.enum(['synthetic', 'production']),
      z.literal('--directory'),
      z.string().min(1),
    ])
    .safeParse(args);
  if (!parsed.success || !env || typeof env !== 'object')
    throw new SmokeCommandError('INVALID_ARGUMENTS');
  const [action, , target, , directory] = parsed.data;
  if (!isAbsolute(directory) || !/^readonly-smoke-[A-Za-z0-9_-]+$/.test(basename(directory)))
    throw new SmokeCommandError('INVALID_ARGUMENTS');
  if (
    typeof nodeVersion !== 'string' ||
    !/^24\.\d+\.\d+$/.test(nodeVersion) ||
    !z.string().trim().email().safeParse(env.ADMIN_READONLY_EMAIL).success ||
    !z.string().min(32).safeParse(env.SESSION_SECRET).success ||
    env.E2E_TESTS === '1'
  )
    throw new SmokeCommandError('INVALID_TARGET');
  assertAuthScriptTarget(env);
  const database = databaseUrl(env.DATABASE_URL);
  const direct = databaseUrl(env.DIRECT_URL);
  if (target === 'synthetic') {
    if (
      env.NODE_ENV !== 'test' ||
      env.VERCEL === '1' ||
      database.href !== direct.href ||
      database.hostname !== '127.0.0.1' ||
      database.port !== '5432' ||
      database.pathname !== '/mirrorbuddy_remediation_47ba2c29' ||
      database.search !== ''
    )
      throw new SmokeCommandError('INVALID_TARGET');
    return { action, target, directory, temporaryRoot: tmpdir() };
  }
  const trusted = {
    NODE_ENV: 'production',
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: 'FightTheStroke/MirrorBuddy',
    GITHUB_WORKFLOW_REF: 'FightTheStroke/MirrorBuddy/.github/workflows/ci.yml@refs/heads/main',
    GITHUB_JOB: 'sync-admin-credentials',
  };
  if (
    Object.entries(trusted).some(([key, value]) => env[key] !== value) ||
    !env.RUNNER_TEMP ||
    !isAbsolute(env.RUNNER_TEMP) ||
    productionProject(database) !== productionProject(direct)
  )
    throw new SmokeCommandError('INVALID_TARGET');
  return { action, target, directory, temporaryRoot: env.RUNNER_TEMP };
}

function databaseUrl(value: unknown): URL {
  if (typeof value !== 'string' || value.length === 0)
    throw new SmokeCommandError('INVALID_TARGET');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SmokeCommandError('INVALID_TARGET');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.username ||
    !url.port ||
    url.hash ||
    !url.pathname ||
    [...url.searchParams].some(([key, value]) => {
      if (url.searchParams.getAll(key).length !== 1) return true;
      if (key === 'sslmode') return !['require', 'verify-ca', 'verify-full'].includes(value);
      return key !== 'pgbouncer' || value !== 'true';
    })
  )
    throw new SmokeCommandError('INVALID_TARGET');
  return url;
}

function productionProject(url: URL): string {
  if (url.pathname !== '/postgres' || !url.password || !['5432', '6543'].includes(url.port))
    throw new SmokeCommandError('INVALID_TARGET');
  const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname);
  if (direct && url.username === 'postgres') return direct[1];
  const user = /^postgres\.([a-z0-9]+)$/.exec(url.username);
  if (/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(url.hostname) && user) return user[1];
  throw new SmokeCommandError('INVALID_TARGET');
}
