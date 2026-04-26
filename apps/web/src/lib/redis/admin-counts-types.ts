// ============================================================================
// ADMIN COUNTS TYPES
// Type definitions and constants for admin counts pub/sub system
// ============================================================================

/**
 * Admin KPI metrics sent via pub/sub to SSE clients
 */
export interface AdminCounts {
  pendingInvites: number;
  totalUsers: number;
  activeUsers24h: number;
  systemAlerts: number;
  timestamp: string;
}

/**
 * Redis pub/sub channel for admin counts updates
 */
export const CHANNEL = "admin:counts:update";

/**
 * Redis storage key for latest admin counts (for initial SSE data)
 */
export const STORAGE_KEY = "admin:counts:latest";
