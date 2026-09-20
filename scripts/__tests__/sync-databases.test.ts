// @vitest-environment node
// Safety regressions for scripts/sync-databases.sh. The unmodified script bytes
// run in a disposable fixture; only the external npx/Prisma boundary is faked,
// so no migration, database or network operation can occur. Every connection
// string is assembled at run time from named synthetic components.
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const script = join(repository, 'scripts/sync-databases.sh');
const prismaConfig = join(repository, 'prisma.config.ts');
// The fake boundary must never restate Prisma's precedence rule. It loads the
// real prisma.config.ts instead, so the recorded target is the one Prisma would
// actually use for that invocation.
const toolchain = [join(repository, 'node_modules'), join(repository, 'apps/web/node_modules')];
const nodeModules = toolchain.find(existsSync);
const tsx = toolchain.map((directory) => join(directory, '.bin/tsx')).find(existsSync);
const roots: string[] = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop() as string, { recursive: true, force: true });
});

// Named components, never a complete credential-shaped literal.
const LOOPBACK_HOST = '127.0.0.1';
const REMOTE_HOST = 'db.example.com';
const PORT = '5432';
const connection = (user: string, host: string, database: string, query = '') =>
  `postgresql://${user}@${host}:${PORT}/${database}${query}`;

const AMBIENT_URL = connection('svc_ambient', REMOTE_HOST, 'ambient');
const AMBIENT_DIRECT = connection('svc_ambient', REMOTE_HOST, 'ambient_direct');
const LOCAL_URL = connection('svc_local', LOOPBACK_HOST, 'mirrorbuddy_test');
const DOTENV_DEV = connection('svc_dotenv', REMOTE_HOST, 'from_dotenv');

interface Invocation {
  argv: string;
  databaseUrl: string;
  directUrl: string;
  resolverStatus: string;
  effectiveUrl: string;
}

interface Run {
  status: number | null;
  stderr: string;
  calls: Invocation[];
}

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'mb-sync-databases-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'bin'), { recursive: true });
  copyFileSync(script, join(root, 'scripts/sync-databases.sh'));
  copyFileSync(prismaConfig, join(root, 'prisma.config.ts'));
  symlinkSync(nodeModules as string, join(root, 'node_modules'), 'dir');
  // dotenv never overwrites a key already present in the environment, so this
  // remote value has to stay inert whenever the override is set, even to ''.
  writeFileSync(join(root, '.env'), `DEV_DATABASE_URL=${DOTENV_DEV}\n`);
  writeFileSync(
    join(root, 'bin/resolve-datasource.mjs'),
    "import { pathToFileURL } from 'node:url';\n" +
      'const mod = await import(pathToFileURL(process.argv[2]).href);\n' +
      "process.stdout.write(String(mod.default?.datasource?.url ?? ''));\n",
  );
  return root;
}

function run(options: { devUrl?: string; failFirst?: boolean } = {}): Run {
  const root = createFixture();

  const log = join(root, 'npx-calls.log');
  writeFileSync(
    join(root, 'bin/npx'),
    `#!/bin/sh
resolved=$("${tsx}" "${root}/bin/resolve-datasource.mjs" "${root}/prisma.config.ts" 2>/dev/null)
status=$?
printf '%s|%s|%s|%s|%s\\n' "$*" "\${DATABASE_URL-}" "\${DIRECT_URL-}" "$status" "$resolved" >> "${log}"
if [ -n "\${FAKE_NPX_FAIL_FIRST-}" ] && [ "$(wc -l < "${log}" | tr -d ' ')" = "1" ]; then exit 1; fi
exit 0\n`,
    { mode: 0o755 },
  );

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${join(root, 'bin')}:${dirname(process.execPath)}:${process.env.PATH}`,
    DATABASE_URL: AMBIENT_URL,
    DIRECT_URL: AMBIENT_DIRECT,
    DOTENV_CONFIG_PATH: join(root, '.env'),
  };
  delete env.DEV_DATABASE_URL;
  if (options.devUrl !== undefined) env.DEV_DATABASE_URL = options.devUrl;
  if (options.failFirst) env.FAKE_NPX_FAIL_FIRST = '1';

  const result = spawnSync('bash', [join(root, 'scripts/sync-databases.sh')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    env,
  });
  expect(result.error, 'the script must launch').toBeUndefined();
  expect(result.signal, 'the script must not be signalled').toBeNull();

  const calls = existsSync(log)
    ? readFileSync(log, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [argv, databaseUrl, directUrl, resolverStatus, effectiveUrl] = line.split('|');
          return { argv, databaseUrl, directUrl, resolverStatus, effectiveUrl } as Invocation;
        })
    : [];
  return { status: result.status, stderr: result.stderr ?? '', calls };
}

// Loads the real configuration directly, so a loader failure shows up as such
// instead of masquerading as a wrongly resolved target.
function resolveTarget(overrides: NodeJS.ProcessEnv): { status: number | null; url: string } {
  const root = createFixture();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: AMBIENT_URL,
    DIRECT_URL: AMBIENT_DIRECT,
    DOTENV_CONFIG_PATH: join(root, '.env'),
  };
  delete env.DEV_DATABASE_URL;
  Object.assign(env, overrides);
  const args = [join(root, 'bin/resolve-datasource.mjs'), join(root, 'prisma.config.ts')];
  const result = spawnSync(tsx as string, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    env,
  });
  expect(result.error, 'the resolver must launch').toBeUndefined();
  return { status: result.status, url: result.stdout ?? '' };
}

describe('sync-databases refuses to migrate without an explicit local target', () => {
  it('fails before either migration when DEV_DATABASE_URL is absent', () => {
    const outcome = run();

    expect(outcome.status).not.toBe(0);
    expect(outcome.calls).toHaveLength(0);
  });

  it.each([
    ['a remote host', connection('svc_local', REMOTE_HOST, 'mirrorbuddy_test')],
    ['a query host override', connection('svc_local', 'localhost', 'x', `?host=${REMOTE_HOST}`)],
    // A literal `host=` match would miss this spelling; a URL parser decodes it.
    [
      'a percent-encoded query host override',
      connection('svc_local', 'localhost', 'x', `?%68ost=${REMOTE_HOST}`),
    ],
    ['a hostaddr override', connection('svc_local', 'localhost', 'x', '?hostaddr=203.0.113.9')],
    ['a service override', connection('svc_local', 'localhost', 'x', '?service=remote')],
    ['a non-postgres scheme', `mysql://svc_local@${LOOPBACK_HOST}:${PORT}/db`],
    ['a malformed URL', 'not a url'],
    ['an empty value', ''],
  ])('fails before either migration for %s', (_label, devUrl) => {
    const outcome = run({ devUrl });

    expect(outcome.status).not.toBe(0);
    expect(outcome.calls).toHaveLength(0);
  });
});

describe('sync-databases preserves its two migration phases', () => {
  it('leaves the first phase on the ambient target and maps only the second', () => {
    const outcome = run({ devUrl: LOCAL_URL });

    expect(outcome.status).toBe(0);
    expect(outcome.calls).toHaveLength(2);
    expect(outcome.calls[0].argv).toBe('prisma migrate deploy');
    expect(outcome.calls[1].argv).toBe('prisma migrate deploy');
    expect(outcome.calls[0].databaseUrl).toBe(AMBIENT_URL);
    expect(outcome.calls[0].directUrl).toBe(AMBIENT_DIRECT);
    expect(outcome.calls[1].databaseUrl).toBe(LOCAL_URL);
    expect(outcome.calls[1].directUrl).toBe(LOCAL_URL);
    expect(outcome.calls[0].resolverStatus, 'the resolver must have run').toBe('0');
    expect(outcome.calls[1].resolverStatus, 'the resolver must have run').toBe('0');
    expect(outcome.calls[0].effectiveUrl).toBe(AMBIENT_DIRECT);
    expect(outcome.calls[1].effectiveUrl).toBe(LOCAL_URL);
  });

  it('keeps a harmless query such as a schema selector usable', () => {
    const devUrl = connection('svc_local', LOOPBACK_HOST, 'mirrorbuddy_test', '?schema=public');

    const outcome = run({ devUrl });

    expect(outcome.status).toBe(0);
    expect(outcome.calls).toHaveLength(2);
    expect(outcome.calls[1].databaseUrl).toBe(devUrl);
  });

  it('does not start the second phase when the first one fails', () => {
    const outcome = run({ devUrl: LOCAL_URL, failFirst: true });

    expect(outcome.status).not.toBe(0);
    expect(outcome.calls).toHaveLength(1);
  });
});

describe('the recorded target comes from the real Prisma configuration', () => {
  it('has the toolchain the fixture needs', () => {
    expect(nodeModules, 'install dependencies before running this file').toBeDefined();
    expect(tsx, 'tsx is required to load prisma.config.ts').toBeDefined();
  });

  // Paired dotenv contract: absent means the .env value is loaded, empty means
  // the key is present and stays inert, so only masking to '' is safe.
  it('reloads the .env override when the environment defines none', () => {
    const outcome = resolveTarget({});

    expect(outcome.status).toBe(0);
    expect(outcome.url).toBe(DOTENV_DEV);
  });

  it('cannot be restored from .env once the override is set to an empty value', () => {
    const outcome = resolveTarget({ DEV_DATABASE_URL: '' });

    expect(outcome.status).toBe(0);
    expect(outcome.url).toBe(AMBIENT_DIRECT);
  });
});
