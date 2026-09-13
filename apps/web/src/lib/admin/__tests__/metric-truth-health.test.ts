import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aggregateHealth, invalidateHealthCache } from '../health-aggregator';
import * as checks from '../health-checks';

vi.mock('../health-checks', () => ({
  checkDatabase: vi.fn(),
  checkRedis: vi.fn(),
  checkAzureOpenAI: vi.fn(),
  checkResend: vi.fn(),
  checkSentry: vi.fn(),
  checkVercel: vi.fn(),
}));

describe('health metric truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateHealthCache();
    for (const [name, check] of Object.entries(checks)) {
      vi.mocked(check).mockResolvedValue({
        name,
        status: 'unknown',
        configured: false,
        lastChecked: new Date(),
      });
    }
    vi.mocked(checks.checkDatabase).mockResolvedValue({
      name: 'Database',
      status: 'healthy',
      configured: true,
      lastChecked: new Date(),
    });
  });

  it('does not count optional unconfigured integrations as unhealthy', async () => {
    const result = await aggregateHealth();
    expect(result.overallStatus).toBe('healthy');
    expect(result.services.find((service) => service.name === 'checkSentry')?.readiness).toBe(
      'notConfigured',
    );
  });

  it('does not filter a required rejected check out of overall health', async () => {
    vi.mocked(checks.checkDatabase).mockRejectedValue(new Error('synthetic failure'));
    const result = await aggregateHealth();
    expect(result.overallStatus).toBe('down');
    expect(result.services[0]).toMatchObject({
      required: true,
      status: 'down',
      configured: false,
      readiness: 'unknown',
    });
  });

  it('keeps unknown required health distinct from degraded and healthy', async () => {
    vi.mocked(checks.checkDatabase).mockResolvedValue({
      name: 'Database',
      status: 'unknown',
      configured: false,
      lastChecked: new Date(),
    });
    expect((await aggregateHealth()).overallStatus).toBe('unknown');
  });

  it('does not turn a missing check result into an observed outage', async () => {
    vi.mocked(checks.checkDatabase).mockResolvedValue(undefined as never);
    const result = await aggregateHealth();
    expect(result.overallStatus).toBe('unknown');
    expect(result.services[0].status).toBe('unknown');
    expect(result.services[0].readiness).toBe('unknown');
  });

  it.each([
    ['healthy', 'ready'],
    ['down', 'notReady'],
    ['degraded', 'notReady'],
    ['unknown', 'unknown'],
  ] as const)('a fulfilled configured %s result has readiness %s', async (status, readiness) => {
    vi.mocked(checks.checkDatabase).mockResolvedValue({
      name: 'Database',
      status,
      configured: true,
      lastChecked: new Date(),
    });
    const result = await aggregateHealth();
    expect(result.services[0]).toMatchObject({
      status,
      configured: true,
      required: true,
      readiness,
    });
    expect(result.overallStatus).toBe(status);
  });
});
