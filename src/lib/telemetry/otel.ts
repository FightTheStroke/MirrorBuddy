// ============================================================================
// OPENTELEMETRY SDK CONFIGURATION
// Exports traces and spans to Azure Application Insights
// Server-side only - uses Node.js specific modules
// ============================================================================

import 'server-only';

import { logger } from '@/lib/logger';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

/**
 * Initialize OpenTelemetry SDK with Azure Monitor exporter.
 * Call this once at application startup (in instrumentation.ts).
 *
 * Environment variables:
 * - APPLICATIONINSIGHTS_CONNECTION_STRING: Azure App Insights connection string
 *
 * @returns NodeSDK instance (or undefined if not configured)
 */
export function initializeOpenTelemetry(): NodeSDK | undefined {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  // Skip initialization if connection string not provided
  if (!connectionString) {
    logger.warn('APPLICATIONINSIGHTS_CONNECTION_STRING not set. Telemetry disabled.');
    return undefined;
  }

  // Read service version from package.json or VERSION file
  const serviceVersion = process.env.npm_package_version || '2.0.0';

  try {
    // Configure Azure Monitor exporter
    const traceExporter = new AzureMonitorTraceExporter({
      connectionString,
    });

    // Create SDK with auto-instrumentations
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: 'mirrorbuddy',
        [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
      }),
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Auto-instrument HTTP, Express, Next.js, Prisma, etc.
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-fs': { enabled: false }, // Reduce noise
        }),
      ],
    });

    logger.info('OpenTelemetry SDK initialized with Azure Monitor exporter');
    return sdk;
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry SDK', { error });
    return undefined;
  }
}

/**
 * Start the OpenTelemetry SDK.
 * This must be called before any application code runs.
 */
export function startOpenTelemetry(sdk: NodeSDK): void {
  try {
    sdk.start();
    logger.info('OpenTelemetry SDK started successfully');

    // Graceful shutdown on process termination
    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
        .catch((error) => logger.error('Error shutting down OpenTelemetry SDK', { error }))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    logger.error('Failed to start OpenTelemetry SDK', { error });
  }
}
