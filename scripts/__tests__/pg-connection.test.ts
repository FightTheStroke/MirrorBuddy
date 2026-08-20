/**
 * Connection helper tests
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { isLocalConnection } from '../lib/pg-connection';

describe('isLocalConnection', () => {
  it.each(['postgresql://user@localhost:5432/db', 'postgres://user:pw@127.0.0.1:5432/db'])(
    'treats %s as local so the scripts can run without SSL',
    (url) => {
      expect(isLocalConnection(url)).toBe(true);
    },
  );

  it('treats a Supabase pooler host as remote', () => {
    expect(
      isLocalConnection('postgres://u:p@aws-1-eu-west-1.pooler.supabase.com:6543/postgres'),
    ).toBe(false);
  });

  it('treats an unparseable value as remote rather than silently dropping TLS', () => {
    expect(isLocalConnection('not a url')).toBe(false);
  });
});
