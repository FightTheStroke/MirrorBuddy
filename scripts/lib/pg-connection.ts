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
