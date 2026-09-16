// @vitest-environment node
import { randomInt } from 'node:crypto';
import { realpath, readFile, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runStudentSmokeCommand } from '../lib/student-smoke-command';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  disconnect: vi.fn(),
  end: vi.fn(),
}));
vi.mock('../../apps/web/src/lib/db', () => ({
  prisma: { user: { findMany: mocks.findMany }, $disconnect: mocks.disconnect },
  dbPool: { end: mocks.end },
}));
let directory = '';
const fetcher = vi.fn<typeof fetch>();
beforeEach(async () => {
  vi.clearAllMocks();
  const root = await realpath(tmpdir());
  const runId = String(randomInt(1_000_000, 2_000_000_000));
  directory = join(root, `readonly-smoke-student-${runId}-1`);
  const env = {
    NODE_ENV: 'production',
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: 'FightTheStroke/MirrorBuddy',
    GITHUB_WORKFLOW_REF: 'FightTheStroke/MirrorBuddy/.github/workflows/ci.yml@refs/heads/main',
    GITHUB_JOB: 'sync-admin-credentials',
    GITHUB_RUN_ID: runId,
    GITHUB_RUN_ATTEMPT: '1',
    RUNNER_TEMP: root,
    E2E_TESTS: '',
    PRODUCTION_DB_ID: 'fixture',
    DATABASE_URL: 'postgresql://postgres:synthetic@db.fixture.supabase.co:5432/postgres',
    DIRECT_URL: 'postgresql://postgres:synthetic@db.fixture.supabase.co:5432/postgres',
    PROD_TEST_USER_ID: 'student',
    PROD_TEST_USER_EMAIL: 'student@example.test',
    PROD_TEST_USER_USERNAME: 'student',
    PROD_TEST_USER_PASSWORD: 'fixture-password',
  };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.stubGlobal('fetch', fetcher);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});
describe('student command trust and preflight ordering', () => {
  it('rejects wrong identity before HTTP and leaves a provable no-request cleanup receipt', async () => {
    mocks.findMany.mockResolvedValue([]);
    await expect(runStudentSmokeCommand(['issue', '--directory', directory])).rejects.toThrow(
      'STUDENT_SMOKE_FAILED',
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(await readFile(join(directory, 'state'), 'utf8')).toBe('prepared');
    await runStudentSmokeCommand(['revoke', '--directory', directory]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readFile(join(directory, 'state'), 'utf8')).toBe('revoked');
  });
  it('rejects an ordinary untrusted invocation before private files, DB or HTTP', async () => {
    vi.stubEnv('GITHUB_REF', 'refs/heads/feature');
    await expect(runStudentSmokeCommand(['issue', '--directory', directory])).rejects.toThrow();
    await expect(lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not read another run or attempt directory', async () => {
    await expect(
      runStudentSmokeCommand(['revoke', '--directory', `${directory}-other`]),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it('fails when there is no durable cleanup receipt rather than claiming logout', async () => {
    await expect(runStudentSmokeCommand(['revoke', '--directory', directory])).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
