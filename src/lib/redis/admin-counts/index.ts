// ============================================================================
// ADMIN COUNTS - Barrel Export
// Convenience exports for admin counts pub/sub system
// ============================================================================

export type { AdminCounts } from "../admin-counts-types";
export { CHANNEL, STORAGE_KEY } from "../admin-counts-types";

export {
  publishAdminCounts,
  getLatestAdminCounts,
} from "../admin-counts-storage";

export {
  subscribeToAdminCounts,
  broadcastAdminCounts,
  getSubscriberCount,
} from "../admin-counts-subscriber";
