"use client";

import { useState, useEffect, useRef } from "react";
import { trackTrialStart } from "@/lib/telemetry/trial-events";

interface TrialStatus {
  isTrialMode: boolean;
  isLoading: boolean;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
  visitorId?: string;
}

/**
 * Get initial trial status synchronously.
 * Always start as loading - let the API determine trial status.
 */
function getInitialStatus(): TrialStatus {
  return {
    isTrialMode: false,
    isLoading: true,
    chatsUsed: 0,
    chatsRemaining: 10,
    maxChats: 10,
  };
}

/**
 * Hook to get trial status for the current user.
 * A user is in trial mode if they don't have login credentials (username/password).
 * Cookie-only users created via "Skip" are still trial users.
 */
export function useTrialStatus(): TrialStatus {
  const [status, setStatus] = useState<TrialStatus>(getInitialStatus);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        // Check if user has credentials (not trial)
        const userRes = await fetch("/api/user/trial-status");
        if (userRes.ok && isMounted) {
          const userData = await userRes.json();
          if (!userData.isTrialUser) {
            // User has credentials - not in trial mode
            setStatus({
              isTrialMode: false,
              isLoading: false,
              chatsUsed: 0,
              chatsRemaining: 10,
              maxChats: 10,
            });
            return;
          }
        }

        // User is trial - fetch trial session for chat counts
        const res = await fetch("/api/trial/session");
        if (res.ok && isMounted) {
          const data = await res.json();
          const visitorId = data.sessionId || "unknown";

          // Track trial start (only once per session)
          if (!hasTrackedRef.current) {
            trackTrialStart(visitorId);
            hasTrackedRef.current = true;
          }

          setStatus({
            isTrialMode: true,
            isLoading: false,
            chatsUsed: data.chatsUsed || 0,
            chatsRemaining: data.chatsRemaining ?? 10,
            maxChats: 10,
            visitorId,
          });
        } else if (isMounted) {
          // API error - assume trial with defaults
          setStatus({
            isTrialMode: true,
            isLoading: false,
            chatsUsed: 0,
            chatsRemaining: 10,
            maxChats: 10,
          });
        }
      } catch {
        // On error, assume trial mode with default values
        if (isMounted) {
          setStatus({
            isTrialMode: true,
            isLoading: false,
            chatsUsed: 0,
            chatsRemaining: 10,
            maxChats: 10,
          });
        }
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  return status;
}
