/**
 * Health Aggregator Types
 * Type definitions for service health monitoring and aggregation
 */

export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  configured: boolean;
  responseTimeMs?: number;
  lastChecked: Date;
  details?: string;
}

export interface HealthAggregatorResponse {
  services: ServiceHealth[];
  overallStatus: ServiceStatus;
  checkedAt: Date;
  configuredCount: number;
  unconfiguredCount: number;
}
