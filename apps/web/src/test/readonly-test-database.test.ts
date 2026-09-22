// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readOnlyTestDatabaseConfig } from './readonly-test-database';

const url = 'postgresql://fixture:disposable@127.0.0.1:55437/mirrorbuddy_test';
const configured = (value = url) => ({
  TEST_DATABASE_URL: value,
  DATABASE_URL: value,
  DEV_DATABASE_URL: value,
});

describe('owned read-only test connection configuration', () => {
  it('derives read-only sessions without changing the writable base URLs or port', () => {
    const env = configured();
    expect(readOnlyTestDatabaseConfig(env)).toEqual({
      connectionString: url,
      options: '-c default_transaction_read_only=on',
      max: 2,
    });
    expect(env).toEqual(configured());
  });

  it.each([
    null,
    {},
    { ...configured(), TEST_DATABASE_URL: '' },
    configured('invalid'),
    configured(url.replace('127.0.0.1', 'example.invalid')),
    configured(url.replace('mirrorbuddy_test', 'mirrorbuddy')),
    configured(`${url}?options=-c%20default_transaction_read_only=off`),
    configured(`${url}?host=example.invalid`),
    { ...configured(), DATABASE_URL: url.replace('55437', '55438') },
    { ...configured(), DEV_DATABASE_URL: url.replace('fixture:', 'different:') },
    { ...configured(), DEV_DATABASE_URL: undefined },
  ])('fails closed before connecting for invalid or absent opt-in: %j', (env) => {
    expect(() => readOnlyTestDatabaseConfig(env)).toThrow();
  });
});
