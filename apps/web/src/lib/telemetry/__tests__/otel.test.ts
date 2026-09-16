import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';

const mocks = vi.hoisted(() => {
  const sdk = { start: vi.fn(), shutdown: vi.fn().mockResolvedValue(undefined) };
  return {
    sdk,
    NodeSDK: vi.fn(function () {
      return sdk;
    }),
    AzureMonitorTraceExporter: vi.fn(function () {}),
    sentryLoaded: vi.fn(),
    grafanaStart: vi.fn(),
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('@opentelemetry/sdk-node', () => ({ NodeSDK: mocks.NodeSDK }));
vi.mock('@azure/monitor-opentelemetry-exporter', () => ({
  AzureMonitorTraceExporter: mocks.AzureMonitorTraceExporter,
}));
vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn(() => []),
}));
vi.mock('@/lib/env', () => ({ validateEnv: vi.fn() }));
vi.mock('@/lib/observability', () => ({
  prometheusPushService: { start: mocks.grafanaStart },
}));
vi.mock('../../../../sentry.server.config', () => {
  mocks.sentryLoaded();
  return {};
});

describe('optional Azure Monitor exporter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('APPLICATIONINSIGHTS_CONNECTION_STRING', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(['production', 'development'])(
    'reports NOT_CONFIGURED without claiming all telemetry is disabled in %s',
    async (environment) => {
      vi.stubEnv('NODE_ENV', environment);
      const otel = await import('../otel');

      expect(otel.initializeOpenTelemetry()).toBeUndefined();

      expect(otel.getAzureMonitorExporterStatus()).toBe('NOT_CONFIGURED');
      expect(logger.info).toHaveBeenCalledWith('Azure Monitor exporter not configured', {
        status: 'NOT_CONFIGURED',
      });
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(mocks.NodeSDK).not.toHaveBeenCalled();
      expect(mocks.AzureMonitorTraceExporter).not.toHaveBeenCalled();
      expect(typeof otel.tokenUsageCounter.add).toBe('function');
      expect(typeof otel.fsrsReviewCounter.add).toBe('function');
      expect(typeof otel.chatRequestCounter.add).toBe('function');
    },
  );

  it('does not mistake whitespace configuration for an enabled exporter', async () => {
    vi.stubEnv('APPLICATIONINSIGHTS_CONNECTION_STRING', '   ');
    const otel = await import('../otel');
    expect(otel.initializeOpenTelemetry()).toBeUndefined();
    expect(otel.getAzureMonitorExporterStatus()).toBe('NOT_CONFIGURED');
    expect(mocks.AzureMonitorTraceExporter).not.toHaveBeenCalled();
  });

  it('keeps Sentry startup and Grafana metrics running without AppInsights', async () => {
    const { register } = await import('../../../../instrumentation');
    await register();
    expect(mocks.sentryLoaded).toHaveBeenCalledTimes(1);
    expect(mocks.grafanaStart).toHaveBeenCalledTimes(1);
    expect(mocks.NodeSDK).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('constructs and starts a configured exporter without claiming remote delivery', async () => {
    vi.stubEnv('APPLICATIONINSIGHTS_CONNECTION_STRING', 'InstrumentationKey=test-only');
    const otel = await import('../otel');
    const on = vi.spyOn(process, 'on').mockReturnValue(process);

    const sdk = otel.initializeOpenTelemetry();
    expect(sdk).toBe(mocks.sdk);
    expect(otel.getAzureMonitorExporterStatus()).toBe('INITIALIZED');
    expect(mocks.AzureMonitorTraceExporter).toHaveBeenCalledWith({
      connectionString: 'InstrumentationKey=test-only',
    });
    otel.startOpenTelemetry(sdk!);
    expect(mocks.sdk.start).toHaveBeenCalledTimes(1);
    expect(otel.getAzureMonitorExporterStatus()).toBe('STARTED');
    expect(on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });

  it('retains real configured initialization errors', async () => {
    vi.stubEnv('APPLICATIONINSIGHTS_CONNECTION_STRING', 'invalid');
    const error = new Error('Invalid connection string');
    mocks.AzureMonitorTraceExporter.mockImplementationOnce(function () {
      throw error;
    });
    const otel = await import('../otel');

    expect(otel.initializeOpenTelemetry()).toBeUndefined();

    expect(otel.getAzureMonitorExporterStatus()).toBe('ERROR');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to initialize OpenTelemetry SDK',
      undefined,
      error,
    );
  });

  it('reports SDK startup failures as errors, not NOT_CONFIGURED or STARTED', async () => {
    vi.stubEnv('APPLICATIONINSIGHTS_CONNECTION_STRING', 'InstrumentationKey=test-only');
    const error = new Error('SDK start failed');
    mocks.sdk.start.mockImplementationOnce(() => {
      throw error;
    });
    const otel = await import('../otel');
    const sdk = otel.initializeOpenTelemetry();

    otel.startOpenTelemetry(sdk!);

    expect(otel.getAzureMonitorExporterStatus()).toBe('ERROR');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to start OpenTelemetry SDK',
      undefined,
      error,
    );
  });
});
