// @vitest-environment node
import { totalmem } from 'node:os';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getHealth } from '../route';
import { GET as getDetailedHealth } from '../detailed/route';

vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:os')>()),
  totalmem: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]) },
}));
vi.mock('@/lib/version', () => ({ getAppVersion: () => '0.0.0-test' }));
vi.mock('@/lib/tracing', () => ({
  getRequestLogger: () => ({ warn: vi.fn() }),
  getRequestId: () => 'memory-test',
}));
vi.mock('@/lib/observability', () => ({
  prometheusPushService: { isConfigured: () => false, isActive: () => false },
}));
vi.mock('@/lib/metrics/pool-metrics', () => ({
  getPoolMetrics: () => ({ total: 1, active: 0, idle: 1, waiting: 0 }),
  getPoolUtilization: () => 0,
}));
vi.mock('@/lib/api/middlewares', () => ({
  pipe: () => (handler: (ctx: { req: NextRequest }) => Promise<Response>) => (req: NextRequest) =>
    handler({ req }),
  withSentry: vi.fn(),
}));

interface HealthBody {
  status: string;
  checks: {
    memory: {
      status: string;
      message?: string;
      usagePercent?: number;
      rssUsedMB?: number;
      heapUsedMB?: number;
      heapTotalMB?: number;
      memoryLimitMB?: number;
      limitSource?: string;
    };
  };
}

const MB = 1024 * 1024;

function setMemory(rssMB: number, heapUsedMB = 50, heapTotalMB = 57) {
  vi.spyOn(process, 'memoryUsage').mockReturnValue({
    rss: rssMB * MB,
    heapUsed: heapUsedMB * MB,
    heapTotal: heapTotalMB * MB,
    external: 0,
    arrayBuffers: 0,
  });
}

async function readHealth() {
  const request = new NextRequest('http://localhost/api/health', {
    headers: { 'x-forwarded-for': '127.0.0.1' },
  });
  const basicResponse = await getHealth(request);
  const detailedResponse = await getDetailedHealth(request);
  const basic: HealthBody = await basicResponse.json();
  const detailed: HealthBody = await detailedResponse.json();
  return { basic, detailed, basicResponse, detailedResponse };
}

describe('health endpoints - RSS memory pressure', () => {
  beforeEach(() => {
    vi.stubEnv('AWS_LAMBDA_FUNCTION_MEMORY_SIZE', '1024');
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://azure.example.com');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
    vi.mocked(totalmem).mockReturnValue(2048 * MB);
    setMemory(50);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('reports production 50/57MB heap as 5% RSS of the known 1024MB function limit', async () => {
    const { basic, detailed, basicResponse, detailedResponse } = await readHealth();

    expect(basic.checks.memory).toEqual({
      status: 'pass',
      message: 'RSS 50MB / 1024MB function limit (5%); heap 50MB / 57MB',
    });
    expect(detailed.checks.memory).toMatchObject({
      status: 'pass',
      usagePercent: 5,
      rssUsedMB: 50,
      heapUsedMB: 50,
      heapTotalMB: 57,
      memoryLimitMB: 1024,
      limitSource: 'function',
    });
    expect(basic.status).toBe('healthy');
    expect(detailed.status).toBe('healthy');
    expect(basicResponse.status).toBe(200);
    expect(detailedResponse.status).toBe(200);
    expect(totalmem).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    '',
    ' ',
    'garbage',
    '1024MB',
    '0',
    '-1',
    'NaN',
    'Infinity',
    '1e309',
    '1e308',
  ])('falls back to OS total memory for absent/invalid function limit %s', async (value) => {
    vi.stubEnv('AWS_LAMBDA_FUNCTION_MEMORY_SIZE', value);
    setMemory(1024);

    const { basic, detailed } = await readHealth();

    expect(basic.checks.memory).toEqual({
      status: 'pass',
      message: 'RSS 1024MB / 2048MB system memory (50%); heap 50MB / 57MB',
    });
    expect(detailed.checks.memory).toMatchObject({
      status: 'pass',
      usagePercent: 50,
      memoryLimitMB: 2048,
      limitSource: 'system',
    });
    expect(totalmem).toHaveBeenCalled();
  });

  it.each([
    [69.9, 'pass', 'healthy', 200],
    [70, 'warn', 'degraded', 200],
    [70.1, 'warn', 'degraded', 200],
    [90, 'warn', 'degraded', 200],
    [90.1, 'fail', 'unhealthy', 503],
    [95, 'fail', 'unhealthy', 503],
  ])(
    'classifies %s%% RSS as %s in both endpoints before rounding',
    async (percent, status, overall, httpStatus) => {
      vi.stubEnv('AWS_LAMBDA_FUNCTION_MEMORY_SIZE', '1000');
      setMemory(percent * 10, 10, 100);

      const { basic, detailed, basicResponse, detailedResponse } = await readHealth();

      expect(basic.checks.memory.status).toBe(status);
      expect(detailed.checks.memory.status).toBe(status);
      expect(detailed.checks.memory.usagePercent).toBe(Math.round(percent));
      expect(basic.status).toBe(overall);
      expect(detailed.status).toBe(overall);
      expect(basicResponse.status).toBe(httpStatus);
      expect(detailedResponse.status).toBe(httpStatus);
    },
  );

  it('never bases pressure on heap occupancy, even with a large 99%-full heap', async () => {
    setMemory(200, 198, 200);
    const first = await readHealth();
    setMemory(200, 198, 800);
    const second = await readHealth();

    for (const { basic, detailed } of [first, second]) {
      expect(basic.checks.memory.status).toBe('pass');
      expect(detailed.checks.memory.status).toBe('pass');
      expect(detailed.checks.memory.usagePercent).toBe(20);
      expect(basic.checks.memory.message).toContain('RSS 200MB / 1024MB function limit (20%)');
    }
  });
});
