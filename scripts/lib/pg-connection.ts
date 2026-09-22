/**
 * Connection settings for the operational scripts that talk to Postgres.
 *
 * Supabase presents a certificate chain Node does not trust by default, so the
 * scripts pinned `ssl: { rejectUnauthorized: false }` unconditionally. That
 * makes them unable to run against a local database, which does not speak SSL
 * at all — and a check nobody can run locally is a check nobody exercises
 * before it matters.
 */

import { Client } from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

export function isLocalConnection(url: string): boolean {
  try {
    // URL.hostname keeps the brackets around an IPv6 literal, so `[::1]` would
    // never match the bare form and a local IPv6 database would be treated as
    // remote — failing on SSL a local server does not speak.
    return LOCAL_HOSTS.has(new URL(url).hostname.replace(/^\[|\]$/g, ''));
  } catch {
    return false;
  }
}

export function createPgClient(url: string): Client {
  return new Client({
    connectionString: url.replace(/[?&]sslmode=[^&]*/, ''),
    ssl: isLocalConnection(url) ? false : { rejectUnauthorized: false },
  });
}

/**
 * Failures that say "the database was not reachable just now", as opposed to
 * "this will fail every time you ask". Supavisor reports the first kind in
 * Elixir terms (`{:error, :nxdomain}`), node-postgres in socket terms.
 */
const TRANSIENT_PATTERNS = [
  /:nxdomain/i,
  /:db_connection/i,
  /connection terminated/i,
  /timeout expired/i,
  /etimedout/i,
  /econnreset/i,
  /econnrefused/i,
  /ehostunreach/i,
  /enetunreach/i,
  /eai_again/i,
];

export function isTransientConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(error.message));
}

interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connects, retrying only the failures a retry can fix. A credential or schema
 * error fails on the first attempt: repeating it would delay the real message.
 */
export async function connectWithRetry(
  makeClient: () => Client,
  { attempts = 3, delayMs = 2000, sleep = defaultSleep }: RetryOptions = {},
): Promise<Client> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = makeClient();
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end?.().catch(() => undefined);
      if (!isTransientConnectionError(error) || attempt === attempts) break;
      console.warn(
        `Database not reachable (attempt ${attempt}/${attempts}): ${(error as Error).message}`,
      );
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}
