import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { attachDatabasePool, pools, adapters, clients, extensions } = vi.hoisted(() => ({
  attachDatabasePool: vi.fn(),
  pools: [] as object[],
  adapters: [] as object[],
  clients: [] as object[],
  extensions: vi.fn(),
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
    constructor() {
      clients.push(this);
    }
    $extends(extension: object) {
      extensions(extension);
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
vi.mock('../../../../../packages/db/src/transient-retry', () => ({
  createTransientRetry: () => ({}),
}));

describe('Fluid compute database pool lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    pools.length = 0;
    adapters.length = 0;
    clients.length = 0;
    vi.stubGlobal('mirrorbuddyDatabase', undefined);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('E2E_TESTS', '0');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    ['production', '1'],
    ['production', ''],
    ['development', ''],
  ])(
    'reuses the client and its pool across module evaluations in %s (VERCEL=%s)',
    async (environment, vercel) => {
      vi.stubEnv('NODE_ENV', environment);
      vi.stubEnv('VERCEL', vercel);

      const first = await import('../../../../../packages/db/src/client');
      const warm = await import('../../../../../packages/db/src/client');
      expect(warm.prisma).toBe(first.prisma);
      expect(pools).toHaveLength(1);

      vi.resetModules();
      const reloaded = await import('../../../../../packages/db/src/client');

      expect(pools).toHaveLength(1);
      expect(reloaded.prisma).toBe(first.prisma);
      expect(reloaded.dbPool).toBe(first.dbPool);
      expect(adapters).toEqual([first.dbPool]);
      expect(clients).toHaveLength(1);
      expect(extensions).toHaveBeenCalledTimes(4);
      if (vercel === '1') {
        expect(attachDatabasePool).toHaveBeenCalledExactlyOnceWith(first.dbPool);
      } else {
        expect(attachDatabasePool).not.toHaveBeenCalled();
      }
    },
  );

  it('attaches the same shared pool used by Prisma and monitoring before suspension', async () => {
    vi.stubEnv('VERCEL', '1');

    const { dbPool } = await import('../../../../../packages/db/src/client');

    expect(pools).toHaveLength(1);
    expect(adapters).toEqual([dbPool]);
    expect(attachDatabasePool).toHaveBeenCalledExactlyOnceWith(dbPool);
    expect(dbPool.options).toMatchObject({
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
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
