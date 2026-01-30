/**
 * Types for Grafana embed functionality
 * ADR 0047: Grafana Cloud observability integration
 */

export interface GrafanaConfig {
  configured: boolean;
  dashboardUrl: string | null;
  orgSlug: string | null;
}

export interface GrafanaPanel {
  id: string;
  title: string;
  embedUrl: string;
  height: number;
}
