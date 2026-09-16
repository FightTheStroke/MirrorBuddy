import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { attachDatabasePool, pools, adapters } = vi.hoisted(() => ({
  attachDatabasePool: vi.fn(),
  pools: [] as object[],
  adapters: [] as object[],
}));

vi.mock('@vercel/functions', () => ({ attachDatabasePool }));
vi.mock('pg', () => ({
  Pool: class {
    constructor(readonly options: object) {
      pools.push(this);
    }
  },
}));
vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(pool: object) {
      adapters.push(pool);
    }
  },
}));
vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $extends() {
      return this;
    }
  },
}));
vi.mock('@mirrorbuddy/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@mirrorbuddy/utils', () => ({
  isSupabaseUrl: () => false,
  isStagingMode: false,
}));
vi.mock('../../../../../packages/db/src/ssl-config', () => ({
  loadSupabaseCertificate: () => undefined,
  buildSslConfig: () => undefined,
  cleanConnectionString: (url: string) => url,
}));
vi.mock('../../../../../packages/db/src/pii-middleware', () => ({
  createPIIMiddleware: () => ({}),
}));
vi.mock('../../../../../packages/db/src/slow-query-monitor', () => ({
  createSlowQueryMonitor: () => ({}),
}));

describe('Fluid compute database pool lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    pools.length = 0;
    adapters.length = 0;
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('E2E_TESTS', '0');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('attaches the same shared pool used by Prisma and monitoring before suspension', async () => {
    vi.stubEnv('VERCEL', '1');

    const { dbPool } = await import('../../../../../packages/db/src/client');

    expect(pools).toHaveLength(1);
    expect(adapters).toEqual([dbPool]);
    expect(attachDatabasePool).toHaveBeenCalledExactlyOnceWith(dbPool);
    expect(dbPool.options).toMatchObject({
      max: 5,
      min: 0,
      connectionTimeoutMillis: 10000,
    });
  });

  it('does not attach the Vercel lifecycle in a non-Vercel runtime', async () => {
    vi.stubEnv('VERCEL', '');

    await import('../../../../../packages/db/src/client');

    expect(pools).toHaveLength(1);
    expect(attachDatabasePool).not.toHaveBeenCalled();
  });
});
