/**
 * useAdminCountsSSE Hook
 *
 * React hook for consuming Server-Sent Events (SSE) from admin counts endpoint.
 * Implements automatic reconnection with exponential backoff (max 3 retries).
 *
 * F-xx Requirements:
 * - F-07: After 3 retry attempts → UI shows "Connection failed. Refresh page."
 * - F-22: UI shows "Reconnecting..." during disconnect
 * - F-25: SSE cleanup on unmount component React
 */

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Admin dashboard counts structure
 */
export interface AdminCounts {
  pendingInvites: number;
  totalUsers: number;
  activeUsers24h: number;
  systemAlerts: number;
  timestamp: string;
}

/**
 * Connection status states
 */
export type ConnectionStatus =
  | "idle" // Initial state, not yet connected
  | "connecting" // First connection attempt
  | "connected" // Successfully connected and receiving data
  | "reconnecting" // Attempting to reconnect after disconnect
  | "error"; // Permanent failure after max retries

/**
 * Hook return value
 */
export interface UseAdminCountsSSEResult {
  counts: AdminCounts;
  status: ConnectionStatus;
  error: string | null;
}

const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000; // 1 second

/**
 * Hook for consuming admin counts via Server-Sent Events (SSE).
 * Automatically handles connection, reconnection, and cleanup.
 *
 * @returns {UseAdminCountsSSEResult} Current counts, connection status, and error state
 *
 * @example
 * ```typescript
 * function AdminDashboard() {
 *   const { counts, status, error } = useAdminCountsSSE();
 *
 *   if (status === 'error') {
 *     return <div>Connection failed. Refresh page.</div>;
 *   }
 *
 *   if (status === 'reconnecting') {
 *     return <div>Reconnecting...</div>;
 *   }
 *
 *   return <div>Pending Invites: {counts.pendingInvites}</div>;
 * }
 * ```
 */
export function useAdminCountsSSE(): UseAdminCountsSSEResult {
  const [counts, setCounts] = useState<AdminCounts>({
    pendingInvites: 0,
    totalUsers: 0,
    activeUsers24h: 0,
    systemAlerts: 0,
    timestamp: new Date().toISOString(),
  });
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryCount = 0;
    let retryTimeout: NodeJS.Timeout | null = null;

    /**
     * Establish SSE connection with retry logic
     */
    const connect = () => {
      // Set appropriate status based on retry count
      if (retryCount === 0) {
        setStatus("connecting");
        setError(null);
      } else {
        setStatus("reconnecting"); // F-22: Show "Reconnecting..." during disconnect
      }

      eventSource = new EventSource("/api/admin/counts/stream");

      /**
       * Handle incoming SSE messages
       */
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AdminCounts;
          setCounts(data);
          setStatus("connected");
          retryCount = 0; // Reset retry counter on successful message
          setError(null);
        } catch (err) {
          logger.error(
            "[useAdminCountsSSE] Failed to parse SSE data",
            { component: "useAdminCountsSSE" },
            err,
          );
          // Continue listening - parsing error doesn't close connection
        }
      };

      /**
       * Handle connection errors and implement retry logic
       */
      eventSource.onerror = () => {
        eventSource?.close();

        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const backoff = BACKOFF_BASE * Math.pow(2, retryCount - 1);

          logger.info(
            `[useAdminCountsSSE] Connection error. Retry ${retryCount}/${MAX_RETRIES} in ${backoff}ms`,
          );

          retryTimeout = setTimeout(connect, backoff);
        } else {
          // F-07: After 3 retries → permanent error state
          logger.error(
            "[useAdminCountsSSE] Max retries reached. Connection failed.",
          );
          setStatus("error");
          setError("Connection failed. Refresh page.");
        }
      };
    };

    // Initial connection
    connect();

    // F-25: Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []); // Empty dependency array - connect once on mount

  return { counts, status, error };
}
