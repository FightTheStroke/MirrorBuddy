// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  getAzureOpenAILimits,
  isAzureOpenAIStressed,
  getAzureOpenAIStressReport,
} from '../../apps/web/src/lib/observability/azure-openai-limits';

const { limits, stressed, report } = vi.hoisted(() => ({
  limits: vi.fn<typeof getAzureOpenAILimits>(),
  stressed: vi.fn<typeof isAzureOpenAIStressed>(),
  report: vi.fn<typeof getAzureOpenAIStressReport>(),
}));
vi.mock('dotenv', () => ({ config: vi.fn() }));
vi.mock('../../apps/web/src/lib/observability/azure-openai-limits', () => ({
  getAzureOpenAILimits: limits,
  isAzureOpenAIStressed: stressed,
  getAzureOpenAIStressReport: report,
}));
import { main } from '../test-azure-openai-limits.js';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  report.mockResolvedValue('Synthetic monitoring report');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});
const output = () => vi.mocked(console.log).mock.calls.flat().join('\n');

describe('Azure limits diagnostic CLI nullable monitoring contract', () => {
  it.each(['not_configured', 'error'])(
    'reports %s as unavailable instead of normal even with an empty error message',
    async (status) => {
      if (status !== 'not_configured' && status !== 'error') throw new Error('Invalid fixture');
      limits.mockResolvedValue({ status, error: '', tpm: null, rpm: null, timestamp: 'fixture' });
      stressed.mockResolvedValue(null);
      await main();
      expect(output()).toContain(`${status}:`);
      expect(output()).toContain('Monitoring unavailable');
      expect(output()).not.toMatch(/Normal|TPM:|RPM:|Failed:/);
      expect(stressed).toHaveBeenCalledExactlyOnceWith(80);
      expect(report).toHaveBeenCalledOnce();
    },
  );

  it.each([false, true])('preserves metrics and known stressed=%s output', async (isStressed) => {
    limits.mockResolvedValue({
      status: 'ok',
      tpm: {
        used: isStressed ? 8500 : 5000,
        limit: 10000,
        unit: 'tokens/min',
        usagePercent: isStressed ? 85 : 50,
        status: isStressed ? 'critical' : 'ok',
      },
      rpm: { used: 20, limit: 1000, unit: 'requests/min', usagePercent: 2, status: 'ok' },
      timestamp: '2026-09-16T05:00:00Z',
    });
    stressed.mockResolvedValue(isStressed);
    await main();
    expect(output()).toContain(
      isStressed ? 'TPM: 8500/10000 tokens/min (85%)' : 'TPM: 5000/10000 tokens/min (50%)',
    );
    expect(output()).toContain('RPM: 20/1000 requests/min (2%)');
    expect(output()).toContain('Timestamp: 2026-09-16T05:00:00Z');
    expect(output()).toContain(isStressed ? 'Stressed' : 'Normal');
    expect(output()).not.toContain('Monitoring unavailable');
  });
});
