/**
 * Azure OpenAI Limits Monitoring
 *
 * Queries Azure Monitor Metrics API for real-time OpenAI usage.
 * Used for real-time stress metrics (F-05) and automatic limit queries (F-22).
 *
 * ADR 0142: Service Principal monitoring is intentionally not configured.
 * Cost reporting uses local scripts/azure-costs.sh; do not provision credentials.
 */

import { logger } from '@/lib/logger';
import {
  getAzureToken,
  getCached,
  setCache,
  hasServicePrincipalCredentials,
} from '@/app/api/azure/costs/helpers';
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
export type AzureOpenAILimits =
  | {
      tpm: ResourceMetric;
      rpm: ResourceMetric;
      timestamp: string;
      status: 'ok';
      error?: never;
    }
  | {
      tpm: null;
      rpm: null;
      timestamp: string;
      status: 'not_configured' | 'error';
      error: string;
    };

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
 * if (limits.status === 'ok' && limits.tpm.usagePercent > 80) {
 *   console.warn('TPM usage critical:', limits.tpm.usagePercent);
 * }
 * ```
 */
export async function getAzureOpenAILimits(): Promise<AzureOpenAILimits> {
  if (!hasServicePrincipalCredentials()) {
    return createEmptyLimits(
      'NOT_CONFIGURED: Azure Monitor disabled by ADR 0142; use local scripts/azure-costs.sh',
      'not_configured',
    );
  }

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
    const error = 'Azure authentication failed';
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
      status: 'ok',
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
function createEmptyLimits(
  error: string,
  status: 'error' | 'not_configured' = 'error',
): AzureOpenAILimits {
  return {
    tpm: null,
    rpm: null,
    status,
    timestamp: new Date().toISOString(),
    error,
  };
}

/**
 * Check if OpenAI usage is above threshold (F-05 stress detection)
 *
 * @param threshold - Percentage threshold (default: 80)
 * @returns True if stressed; null when monitoring is unavailable.
 */
export async function isAzureOpenAIStressed(threshold: number = 80): Promise<boolean | null> {
  try {
    const limits = await getAzureOpenAILimits();
    if (limits.error || !limits.tpm || !limits.rpm) return null;

    return limits.tpm.usagePercent >= threshold || limits.rpm.usagePercent >= threshold;
  } catch (error) {
    logger.error('[azure-openai-limits] Failed to check stress', undefined, error);
    return null;
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
    if (limits.status === 'not_configured') return limits.error;
    if (limits.status !== 'ok') {
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
