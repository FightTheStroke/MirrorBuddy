/**
 * Azure OpenAI Limits Monitoring
 *
 * Queries Azure Monitor Metrics API for real-time OpenAI usage.
 * Used for real-time stress metrics (F-05) and automatic limit queries (F-22).
 *
 * Environment Variables Required:
 *   - AZURE_OPENAI_ENDPOINT: OpenAI endpoint URL
 *   - AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET: Service principal
 *   - AZURE_SUBSCRIPTION_ID: Azure subscription ID
 *
 * Usage:
 *   import { getAzureOpenAILimits } from '@/lib/observability/azure-openai-limits';
 *   const limits = await getAzureOpenAILimits();
 *   console.log(limits.tpm.used, limits.rpm.used);
 */

import { logger } from '@/lib/logger';
import { getAzureToken, getCached, setCache } from '@/app/api/azure/costs/helpers';
import { parseAzureResourceId, queryAzureMetrics } from './azure-monitor-client';
import { calculateStatus, AlertStatus } from './threshold-logic';

/**
 * Resource metrics with usage and limit (F-18, F-25)
 */
export interface ResourceMetric {
  used: number;
  limit: number;
  usagePercent: number;
  unit: string;
  status: AlertStatus; // Alert status from threshold logic (F-25)
}

/**
 * Azure OpenAI limits snapshot
 */
export interface AzureOpenAILimits {
  tpm: ResourceMetric; // Tokens Per Minute
  rpm: ResourceMetric; // Requests Per Minute
  timestamp: string;
  error?: string;
}

/**
 * Azure OpenAI documented limits (from T1-05 audit)
 *
 * Standard deployment tier limits:
 * - TPM: 10,000 tokens/minute per deployment
 * - RPM: 1,000 requests/minute per deployment
 *
 * Note: Actual limits depend on your deployment configuration.
 * Check Azure Portal > Cognitive Services > Deployments for your specific limits.
 */
const AZURE_OPENAI_DEFAULT_LIMITS = {
  TPM: 10_000, // Tokens per minute
  RPM: 1_000, // Requests per minute
};

/**
 * Format resource metric with usage percentage and status (F-25)
 */
function formatMetric(used: number, limit: number, unit: string): ResourceMetric {
  const usagePercent = limit > 0 ? Math.round((used / limit) * 100) : 0;
  return {
    used,
    limit,
    usagePercent,
    unit,
    status: calculateStatus(usagePercent), // F-25: Calculate alert status
  };
}

/**
 * Get Azure OpenAI limits snapshot (F-05, F-22)
 *
 * Returns current usage for TPM and RPM by querying Azure Monitor.
 *
 * @returns {Promise<AzureOpenAILimits>} Current limits and usage
 *
 * @example
 * ```typescript
 * const limits = await getAzureOpenAILimits();
 * if (limits.tpm.usagePercent > 80) {
 *   console.warn('TPM usage critical:', limits.tpm.usagePercent);
 * }
 * ```
 */
export async function getAzureOpenAILimits(): Promise<AzureOpenAILimits> {
  // Check cache first (rate limiting for metrics API)
  const cached = getCached<AzureOpenAILimits>('azure_openai_limits');
  if (cached) {
    logger.debug('[azure-openai-limits] Returning cached limits');
    return cached;
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    const error = 'AZURE_OPENAI_ENDPOINT not configured';
    logger.warn(`[azure-openai-limits] ${error}`);
    const result = createEmptyLimits(error);
    setCache('azure_openai_limits', result);
    return result;
  }

  // Get Azure token for authentication
  const token = await getAzureToken();
  if (!token) {
    const error = 'Azure authentication failed - configure service principal credentials';
    logger.warn(`[azure-openai-limits] ${error}`);
    const result = createEmptyLimits(error);
    setCache('azure_openai_limits', result);
    return result;
  }

  // Parse resource ID from endpoint
  const resourceId = parseAzureResourceId(endpoint);
  if (!resourceId) {
    const error = 'Failed to parse Azure resource ID from endpoint';
    logger.error(`[azure-openai-limits] ${error}`);
    return createEmptyLimits(error);
  }

  try {
    // Query metrics in parallel
    const [tpmUsed, rpmUsed] = await Promise.all([
      queryAzureMetrics(resourceId, ['TokenTransaction']),
      queryAzureMetrics(resourceId, ['Requests']),
    ]);

    const limits: AzureOpenAILimits = {
      tpm: formatMetric(tpmUsed, AZURE_OPENAI_DEFAULT_LIMITS.TPM, 'tokens/min'),
      rpm: formatMetric(rpmUsed, AZURE_OPENAI_DEFAULT_LIMITS.RPM, 'requests/min'),
      timestamp: new Date().toISOString(),
    };

    // Cache for 1 minute (metrics API rate limiting)
    setCache('azure_openai_limits', limits);

    logger.info('[azure-openai-limits] Limits fetched successfully', {
      tpm: `${limits.tpm.used}/${limits.tpm.limit} (${limits.tpm.usagePercent}%)`,
      rpm: `${limits.rpm.used}/${limits.rpm.limit} (${limits.rpm.usagePercent}%)`,
    });

    return limits;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[azure-openai-limits] Failed to get limits', undefined, error as Error);
    return createEmptyLimits(errorMsg);
  }
}

/**
 * Create empty limits response on error
 */
function createEmptyLimits(error: string): AzureOpenAILimits {
  return {
    tpm: { used: 0, limit: 0, usagePercent: 0, unit: 'tokens/min', status: 'ok' },
    rpm: { used: 0, limit: 0, usagePercent: 0, unit: 'requests/min', status: 'ok' },
    timestamp: new Date().toISOString(),
    error,
  };
}

/**
 * Check if OpenAI usage is above threshold (F-05 stress detection)
 *
 * @param threshold - Percentage threshold (default: 80)
 * @returns {Promise<boolean>} True if any metric exceeds threshold
 */
export async function isAzureOpenAIStressed(threshold: number = 80): Promise<boolean> {
  try {
    const limits = await getAzureOpenAILimits();
    if (limits.error) return false;

    return limits.tpm.usagePercent >= threshold || limits.rpm.usagePercent >= threshold;
  } catch (error) {
    logger.error('[azure-openai-limits] Failed to check stress', undefined, error);
    return false; // Fail open - don't block on monitoring errors
  }
}

/**
 * Get human-readable stress report (F-05 visibility)
 *
 * @returns {Promise<string>} Formatted report of OpenAI usage
 */
export async function getAzureOpenAIStressReport(): Promise<string> {
  try {
    const limits = await getAzureOpenAILimits();
    if (limits.error) {
      return `Azure OpenAI monitoring error: ${limits.error}`;
    }

    return [
      `TPM: ${limits.tpm.used}/${limits.tpm.limit} ${limits.tpm.unit} (${limits.tpm.usagePercent}%)`,
      `RPM: ${limits.rpm.used}/${limits.rpm.limit} ${limits.rpm.unit} (${limits.rpm.usagePercent}%)`,
    ].join('\n');
  } catch (error) {
    return `Error fetching Azure OpenAI stress report: ${error}`;
  }
}
