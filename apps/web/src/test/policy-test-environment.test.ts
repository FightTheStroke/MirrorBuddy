import * as vitest from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { policyTestDatabaseEnabled } from './policy-test-environment';

const local = 'postgresql://collaborator:fixture-password@localhost:5432/mirrorbuddy_test';
const config = (url = local) => ({
  TEST_DATABASE_URL: url,
  DATABASE_URL: url,
  DEV_DATABASE_URL: url,
});
const message =
  'Policy DB opt-in requires matching local mirrorbuddy_test connection settings in all three URLs';
const applications = [
  '@/lib/db',
  '@/lib/logger',
  '@/lib/feature-flags',
  '@/lib/feature-flags/policy-write-persistence',
  '@/lib/feature-flags/policy-writer',
  '@/lib/feature-flags/feature-flags-policy',
  '@/lib/admin/control-panel-feature-flags',
  '@/lib/admin/policy-write-actions',
];
const cases: Array<{
  label: string;
  env: Record<string, string | undefined> | null;
  enabled: boolean | 'reject';
}> = [
  { label: 'null environment', env: null, enabled: false },
  { label: 'unconfigured CI', env: {}, enabled: false },
  { label: 'empty opt-in', env: { ...config(), TEST_DATABASE_URL: '' }, enabled: false },
  {
    label: 'generic URL alone is not opt-in',
    env: { DATABASE_URL: 'postgresql://example.invalid/mirrorbuddy' },
    enabled: false,
  },
  {
    label: 'generic garbage is ignored without opt-in',
    env: { DATABASE_URL: 'invalid', DEV_DATABASE_URL: 'invalid' },
    enabled: false,
  },
  { label: 'different username and password', env: config(), enabled: true },
  { label: 'IPv4 loopback', env: config(local.replace('localhost', '127.0.0.1')), enabled: true },
  { label: 'IPv6 loopback', env: config(local.replace('localhost', '[::1]')), enabled: true },
  { label: 'alternate local port', env: config(local.replace('5432', '5433')), enabled: true },
  {
    label: 'matching encoded credentials',
    env: config(local.replace('collaborator:fixture-password', 'another%40user:fixture%3Apass')),
    enabled: true,
  },
  {
    label: 'protocol alias and default port',
    env: {
      ...config(),
      DATABASE_URL: local.replace('postgresql:', 'postgres:').replace(':5432', ''),
    },
    enabled: true,
  },
  {
    label: 'equivalent query ordering',
    env: {
      ...config(`${local}?sslmode=disable&application_name=policy`),
      DATABASE_URL: `${local}?application_name=policy&sslmode=disable`,
    },
    enabled: true,
  },
  { label: 'opt-in only', env: { TEST_DATABASE_URL: local }, enabled: 'reject' },
  {
    label: 'missing DATABASE_URL',
    env: { ...config(), DATABASE_URL: undefined },
    enabled: 'reject',
  },
  {
    label: 'missing DEV_DATABASE_URL',
    env: { ...config(), DEV_DATABASE_URL: undefined },
    enabled: 'reject',
  },
  { label: 'invalid URL', env: config('not-a-url'), enabled: 'reject' },
  { label: 'whitespace opt-in', env: config('  '), enabled: 'reject' },
  {
    label: 'wrong protocol',
    env: config(local.replace('postgresql:', 'https:')),
    enabled: 'reject',
  },
  {
    label: 'cloud host',
    env: config(local.replace('localhost', 'example.invalid')),
    enabled: 'reject',
  },
  {
    label: 'lookalike loopback',
    env: config(local.replace('localhost', 'localhost.example.invalid')),
    enabled: 'reject',
  },
  {
    label: 'default database',
    env: config(local.replace('mirrorbuddy_test', 'mirrorbuddy')),
    enabled: 'reject',
  },
  { label: 'zero port', env: config(local.replace('5432', '0')), enabled: 'reject' },
  {
    label: 'malformed credential encoding',
    env: config(local.replace('collaborator', '%ZZ')),
    enabled: 'reject',
  },
  { label: 'fragment', env: config(`${local}#ignored`), enabled: 'reject' },
  { label: 'query host override', env: config(`${local}?host=example.invalid`), enabled: 'reject' },
  {
    label: 'query database override',
    env: config(`${local}?dbname=mirrorbuddy`),
    enabled: 'reject',
  },
  {
    label: 'query credential override',
    env: config(`${local}?password=fixture`),
    enabled: 'reject',
  },
  {
    label: 'duplicate setting',
    env: config(`${local}?sslmode=disable&sslmode=require`),
    enabled: 'reject',
  },
  { label: 'invalid sslmode', env: config(`${local}?sslmode=invalid`), enabled: 'reject' },
  {
    label: 'host mismatch',
    env: { ...config(), DATABASE_URL: local.replace('localhost', '127.0.0.1') },
    enabled: 'reject',
  },
  {
    label: 'port mismatch',
    env: { ...config(), DATABASE_URL: local.replace('5432', '5433') },
    enabled: 'reject',
  },
  {
    label: 'username mismatch',
    env: { ...config(), DEV_DATABASE_URL: local.replace('collaborator', 'someone-else') },
    enabled: 'reject',
  },
  {
    label: 'password mismatch',
    env: { ...config(), DEV_DATABASE_URL: local.replace('fixture-password', 'different-fixture') },
    enabled: 'reject',
  },
  {
    label: 'SSL mismatch',
    env: { ...config(), DATABASE_URL: `${local}?sslmode=require` },
    enabled: 'reject',
  },
  {
    label: 'schema mismatch',
    env: { ...config(), DATABASE_URL: `${local}?schema=other` },
    enabled: 'reject',
  },
  {
    label: 'environment default port mismatch',
    env: { ...config(), DATABASE_URL: local.replace(':5432', ''), PGPORT: '5433' },
    enabled: 'reject',
  },
  {
    label: 'non-decimal environment port cannot mimic an explicit port',
    env: {
      ...config(local.replace('5432', '1000')),
      DATABASE_URL: local.replace(':5432', ''),
      PGPORT: '1e3',
    },
    enabled: 'reject',
  },
];

afterEach(() => {
  vi.doUnmock('vitest');
  for (const path of applications) vi.doUnmock(path);
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('policy database opt-in without application or Prisma initialization', () => {
  it.each(cases)('$label', async ({ env, enabled }) => {
    if (enabled === 'reject') {
      expect(() => policyTestDatabaseEnabled(env)).toThrow(new Error(message));
    } else {
      expect(policyTestDatabaseEnabled(env)).toBe(enabled);
    }
    vi.resetModules();
    for (const key of [
      'TEST_DATABASE_URL',
      'DATABASE_URL',
      'DEV_DATABASE_URL',
      'PGPORT',
      'PGUSER',
      'PGPASSWORD',
    ])
      vi.stubEnv(key, env?.[key]);
    const imported = vi.fn(() => {
      throw new Error('Unexpected application runtime import');
    });
    for (const path of applications) vi.doMock(path, imported);
    const registered: boolean[] = [];
    vi.doMock('vitest', () => ({
      ...vitest,
      describe: {
        runIf: (run: boolean) => (_name: string, register: () => void) => {
          registered.push(run);
          register();
        },
      },
      beforeAll: vi.fn(),
      beforeEach: vi.fn(),
      afterEach: vi.fn(),
      it: Object.assign(vi.fn(), { each: () => vi.fn() }),
    }));
    const suites = [
      () => import('../lib/feature-flags/__tests__/policy-write-persistence.test'),
      () => import('../lib/admin/policy-write-local-db.test'),
    ];
    for (const load of suites) {
      if (enabled === 'reject') await expect(load()).rejects.toThrow(new Error(message));
      else await load();
    }
    expect(imported).not.toHaveBeenCalled();
    expect(registered).toEqual(enabled === 'reject' ? [] : [enabled, enabled]);
  });
});
