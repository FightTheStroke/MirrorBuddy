type Environment = Readonly<Record<string, string | undefined>>;

const invalid = () =>
  new Error(
    'Policy DB opt-in requires matching local mirrorbuddy_test connection settings in all three URLs',
  );

function connection(input: unknown, env: Environment): string {
  if (typeof input !== 'string' || !input || /\s/.test(input) || input.includes('\0')) {
    throw invalid();
  }
  let url: URL;
  let username: string;
  let password: string;
  let database: string;
  try {
    url = new URL(input);
    username = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname);
  } catch {
    throw invalid();
  }
  const host = url.hostname.toLowerCase();
  const portValue = url.port || env.PGPORT || '5432';
  if (!/^\d+$/.test(portValue)) throw invalid();
  const port = Number(portValue);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(host) ||
    database !== '/mirrorbuddy_test' ||
    url.hash ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    throw invalid();

  const allowed = new Set([
    'sslmode',
    'schema',
    'application_name',
    'connection_limit',
    'connect_timeout',
    'pool_timeout',
  ]);
  const seen = new Set<string>();
  for (const [key, value] of url.searchParams) {
    if (!allowed.has(key) || seen.has(key) || !value) throw invalid();
    seen.add(key);
    if (
      key === 'sslmode' &&
      !['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full', 'no-verify'].includes(
        value,
      )
    )
      throw invalid();
    if (
      ['connection_limit', 'connect_timeout', 'pool_timeout'].includes(key) &&
      !/^\d+$/.test(value)
    ) {
      throw invalid();
    }
  }
  url.searchParams.sort();
  return JSON.stringify([
    host,
    port,
    database,
    username || env.PGUSER || null,
    password || env.PGPASSWORD || null,
    url.searchParams.toString(),
  ]);
}

export function policyTestDatabaseEnabled(env: Environment | null = process.env): boolean {
  if (!env?.TEST_DATABASE_URL) return false;
  const target = connection(env.TEST_DATABASE_URL, env);
  if (
    connection(env.DATABASE_URL, env) !== target ||
    connection(env.DEV_DATABASE_URL, env) !== target
  )
    throw invalid();
  return true;
}
