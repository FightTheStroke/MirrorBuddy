/**
 * Grafana embed service for Mission Control dashboard
 */

import { logger } from "@/lib/logger";
import type { GrafanaConfig, GrafanaPanel } from "./grafana-embed-types";

/**
 * Get Grafana configuration from environment
 */
export async function getGrafanaConfig(): Promise<GrafanaConfig> {
  const prometheusUrl = process.env.GRAFANA_CLOUD_PROMETHEUS_URL || "";

  if (!prometheusUrl) {
    logger.debug(
      "Grafana not configured - GRAFANA_CLOUD_PROMETHEUS_URL not set",
    );
    return {
      configured: false,
      dashboardUrl: null,
      orgSlug: null,
    };
  }

  const orgSlug = extractOrgSlug(prometheusUrl);
  const dashboardUrl = buildDashboardUrl(orgSlug);

  return {
    configured: true,
    dashboardUrl,
    orgSlug,
  };
}

/**
 * Extract organization slug from Prometheus URL
 */
function extractOrgSlug(url: string): string {
  const match = url.match(/https:\/\/([^.]+)-/);
  return match ? match[1] : "mirrorbuddy";
}

/**
 * Build full Grafana dashboard URL
 */
function buildDashboardUrl(orgSlug: string): string {
  return `https://${orgSlug}.grafana.net/d/dashboard/mirrorbuddy-dashboard`;
}

/**
 * Get list of Grafana panels to display
 * Each panel has a predefined ID and configuration
 */
export async function getGrafanaPanels(): Promise<GrafanaPanel[]> {
  return [
    {
      id: "1",
      title: "HTTP Request Metrics",
      embedUrl: "/grafana/panel/1?kiosk=tv",
      height: 400,
    },
    {
      id: "2",
      title: "Business KPIs",
      embedUrl: "/grafana/panel/2?kiosk=tv",
      height: 400,
    },
    {
      id: "3",
      title: "Error Rates",
      embedUrl: "/grafana/panel/3?kiosk=tv",
      height: 400,
    },
    {
      id: "4",
      title: "Latency Percentiles",
      embedUrl: "/grafana/panel/4?kiosk=tv",
      height: 400,
    },
  ];
}
