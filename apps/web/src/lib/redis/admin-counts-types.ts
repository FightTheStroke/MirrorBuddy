// ============================================================================
// ADMIN COUNTS TYPES
// Type definitions and constants for admin counts pub/sub system
// ============================================================================

/**
 * Admin KPI metrics sent via pub/sub to SSE clients
 */
export type { AdminCounts } from '@/lib/admin/admin-counts-service';

/**
 * Redis pub/sub channel for admin counts updates
 */
export const CHANNEL = 'admin:counts:update';

/**
 * Redis storage key for latest admin counts (for initial SSE data)
 */
export const STORAGE_KEY = 'admin:counts:latest';
