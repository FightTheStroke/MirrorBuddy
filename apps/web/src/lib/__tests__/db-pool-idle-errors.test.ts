import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type PoolErrorListener = (error: Error) => void;

const { attachDatabasePool, pools, loggerWarn, loggerError } = vi.hoisted(() => ({
  attachDatabasePool: vi.fn(),
  pools: [] as Array<{ listeners: Map<string, PoolErrorListener[]> }>,
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@vercel/functions', () => ({ attachDatabasePool }));
vi.mock('pg', () => ({
  Pool: class {
    listeners = new Map<string, PoolErrorListener[]>();

    constructor(readonly options: object) {
      pools.push(this);
    }

    on(event: string, listener: PoolErrorListener) {
      const existing = this.listeners.get(event) ?? [];
      this.listeners.set(event, [...existing, listener]);
      return this;
    }

    emit(event: string, error: Error) {
      const listeners = this.listeners.get(event) ?? [];
      for (const listener of listeners) {
        listener(error);
      }
      return listeners.length > 0;
    }
  },
}));
vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(readonly pool: object) {}
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
  logger: { info: vi.fn(), warn: loggerWarn, error: loggerError },
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
  isTransientDatabaseError: (error: unknown) =>
    error instanceof Error && /connection terminated/i.test(error.message),
}));

async function loadPool() {
  await import('../../../../../packages/db/src/client');
  return pools[0];
}

describe('Database pool idle errors', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    pools.length = 0;
    vi.stubGlobal('mirrorbuddyDatabase', undefined);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('E2E_TESTS', '0');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('DATABASE_URL', '******localhost:5432/test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('listens for pool errors so an idle disconnection cannot crash the process', async () => {
    const pool = await loadPool();

    expect(pool.listeners.get('error') ?? []).toHaveLength(1);
  });

  it('logs a warning when an idle connection drops, without rethrowing', async () => {
    const pool = await loadPool();

    expect(() =>
      (pool as unknown as { emit: (event: string, error: Error) => boolean }).emit(
        'error',
        new Error('Connection terminated unexpectedly'),
      ),
    ).not.toThrow();

    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('idle'),
      expect.objectContaining({ error: 'Connection terminated unexpectedly' }),
    );
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('keeps reporting unexpected pool failures as errors', async () => {
    const pool = await loadPool();

    (pool as unknown as { emit: (event: string, error: Error) => boolean }).emit(
      'error',
      new Error('password authentication failed for user "postgres"'),
    );

    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('pool'),
      expect.objectContaining({
        error: 'password authentication failed for user "postgres"',
      }),
    );
  });
});
