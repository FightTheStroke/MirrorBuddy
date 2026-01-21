/**
 * Azure Monitor Metrics API Client
 *
 * Low-level client for querying Azure Monitor metrics.
 * Used by azure-openai-limits.ts to fetch real-time TPM/RPM usage.
 */

import { logger } from "@/lib/logger";
import { getAzureToken } from "@/app/api/azure/costs/helpers";

/**
 * Parse Azure OpenAI resource ID from endpoint URL
 *
 * Example: https://mirrorbuddy.openai.azure.com
 * Returns: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/mirrorbuddy
 */
export function parseAzureResourceId(endpoint: string): string | null {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    logger.warn("[azure-monitor-client] AZURE_SUBSCRIPTION_ID not configured");
    return null;
  }

  // Extract resource name from endpoint (e.g., "mirrorbuddy" from "mirrorbuddy.openai.azure.com")
  const match = endpoint.match(/https:\/\/([^.]+)\.openai\.azure\.com/);
  if (!match) {
    logger.warn("[azure-monitor-client] Invalid AZURE_OPENAI_ENDPOINT format", { endpoint });
    return null;
  }

  const resourceName = match[1];

  // We need the resource group name, which is not in the endpoint URL
  // It must be provided via environment variable or detected
  const resourceGroup = process.env.AZURE_OPENAI_RESOURCE_GROUP || "mirrorbuddy-rg";

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
  const token = await getAzureToken();
  if (!token) {
    logger.warn("[azure-monitor-client] Failed to get Azure token");
    return 0;
  }

  const timespan = "PT1M"; // Last 1 minute
  const aggregation = "Total";

  const url = `https://management.azure.com${resourceId}/providers/Microsoft.Insights/metrics?api-version=2018-01-01&metricnames=${metricNames.join(",")}&timespan=${timespan}&aggregation=${aggregation}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[azure-monitor-client] Metrics API error", { status: response.status, errorText });
      return 0;
    }

    const data = await response.json();

    // Azure Monitor returns metrics in this structure:
    // { value: [ { name: { value: "TokenTransaction" }, timeseries: [ { data: [ { total: 1234 } ] } ] } ] }
    let totalUsage = 0;

    for (const metric of data.value || []) {
      for (const timeseries of metric.timeseries || []) {
        for (const datapoint of timeseries.data || []) {
          totalUsage += datapoint.total || 0;
        }
      }
    }

    return Math.round(totalUsage);
  } catch (error) {
    logger.error("[azure-monitor-client] Failed to query metrics", undefined, error);
    return 0;
  }
}
