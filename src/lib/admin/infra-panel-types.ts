/**
 * Infrastructure Panel Types
 * Type definitions for Vercel, Supabase, and Redis metrics
 */

export type ServiceStatus = "healthy" | "degraded" | "down";

/**
 * Vercel Metrics
 */
export interface VercelDeployment {
  id: string;
  state: string;
  createdAt: number;
  url: string;
}

export interface VercelMetrics {
  deployments: VercelDeployment[];
  bandwidthUsed: number; // bytes
  bandwidthLimit: number; // bytes
  buildsUsed: number;
  buildsLimit: number;
  functionsUsed: number;
  functionsLimit: number;
  status: ServiceStatus;
}

/**
 * Supabase Metrics
 */
export interface SupabaseMetrics {
  databaseSize: number; // bytes
  connections: number;
  storageUsed: number; // bytes
  rowCount: number;
  status: ServiceStatus;
}

/**
 * Redis Metrics
 */
export interface RedisMetrics {
  memoryUsed: number; // bytes
  memoryMax: number; // bytes
  keysCount: number;
  hitRate: number; // percentage
  commands: number;
  status: ServiceStatus;
}

/**
 * Combined Infrastructure Metrics
 */
export interface InfraMetrics {
  vercel: VercelMetrics | null;
  supabase: SupabaseMetrics | null;
  redis: RedisMetrics | null;
  timestamp: number;
}
