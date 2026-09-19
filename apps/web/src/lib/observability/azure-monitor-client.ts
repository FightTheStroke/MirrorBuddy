/**
 * Azure Monitor Metrics API Client
 *
 * Low-level client for querying Azure Monitor metrics.
 * Used by azure-openai-limits.ts to fetch real-time TPM/RPM usage.
 */

import { z } from 'zod';
import { getAzureToken } from '@/app/api/azure/costs/helpers';
import { AzureProviderError } from './azure-provider-error';

const metricsResponse = z.object({
  value: z.array(
    z.object({
      timeseries: z.array(
        z.object({
          data: z.array(z.object({ total: z.number().finite().nullish() })),
        }),
      ),
    }),
  ),
});

/**
 * Parse Azure OpenAI resource ID from endpoint URL
 *
 * Example: https://mirrorbuddy.openai.azure.com
 * Returns: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/mirrorbuddy
 */
export function parseAzureResourceId(endpoint: string | null | undefined): string | null {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    return null;
  }

  // Extract resource name from endpoint (e.g., "mirrorbuddy" from "mirrorbuddy.openai.azure.com")
  const match = endpoint?.match(/https:\/\/([^.]+)\.openai\.azure\.com/);
  if (!match) {
    return null;
  }

  const resourceName = match[1];

  // We need the resource group name, which is not in the endpoint URL
  // It must be provided via environment variable or detected
  const resourceGroup = process.env.AZURE_OPENAI_RESOURCE_GROUP || 'mirrorbuddy-rg';

  return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.CognitiveServices/accounts/${resourceName}`;
}

/**
 * Query Azure Monitor Metrics API for a specific metric
 *
 * @param resourceId - Azure resource ID
 * @param metricNames - Metric names to query (e.g., ["TokenTransaction", "Requests"])
 * @returns Total value across all timeseries and datapoints
 */
export async function queryAzureMetrics(
  resourceId: string,
  metricNames: string[],
): Promise<number> {
  if (
    !resourceId ||
    !Array.isArray(metricNames) ||
    metricNames.length === 0 ||
    metricNames.some((name) => typeof name !== 'string' || !name)
  ) {
    throw new AzureProviderError('configuration');
  }
  const token = await getAzureToken();
  if (!token) {
    throw new AzureProviderError('token', { message: 'Azure authentication not configured' });
  }

  const timespan = 'PT1M'; // Last 1 minute
  const aggregation = 'Total';

  const url = `https://management.azure.com${resourceId}/providers/Microsoft.Insights/metrics?api-version=2018-01-01&metricnames=${metricNames.join(',')}&timespan=${timespan}&aggregation=${aggregation}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new AzureProviderError('metrics', { status: response.status });
    }

    const parsed = metricsResponse.safeParse(await response.json());
    if (!parsed.success) {
      throw new AzureProviderError('metrics', { message: 'Invalid Azure metrics response' });
    }

    // Azure Monitor returns metrics in this structure:
    // { value: [ { name: { value: "TokenTransaction" }, timeseries: [ { data: [ { total: 1234 } ] } ] } ] }
    let totalUsage = 0;

    for (const metric of parsed.data.value) {
      for (const timeseries of metric.timeseries) {
        for (const datapoint of timeseries.data) {
          totalUsage += datapoint.total ?? 0;
        }
      }
    }

    return Math.round(totalUsage);
  } catch (error) {
    if (error instanceof AzureProviderError) throw error;
    throw new AzureProviderError('metrics', { cause: error });
  }
}
