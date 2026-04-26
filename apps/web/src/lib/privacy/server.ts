/**
 * Privacy Module - SERVER-ONLY
 * Part of Ethical Design Hardening
 *
 * This module re-exports all client-safe symbols from index.ts
 * and adds server-only exports that depend on:
 * - @/lib/db (database access for data retention)
 */

// Re-export all client-safe symbols
export * from "./index";

// Server-only exports - data retention service (uses @/lib/db)
export {
  markExpiredDataForDeletion,
  executeScheduledDeletions,
  applyDefaultRetentionSystemWide,
} from "./data-retention-service";
