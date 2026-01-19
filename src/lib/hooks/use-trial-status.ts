"use client";

import { useState, useEffect } from "react";
import { isAuthenticated } from "@/lib/auth/client-auth";

interface TrialStatus {
  isTrialMode: boolean;
  isLoading: boolean;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
}

const DEFAULT_STATUS: TrialStatus = {
  isTrialMode: false,
  isLoading: true,
  chatsUsed: 0,
  chatsRemaining: 10,
  maxChats: 10,
};

/**
 * Hook to get trial status for the current user.
 * Returns trial info if user is not authenticated, null if authenticated.
 */
export function useTrialStatus(): TrialStatus {
  const [status, setStatus] = useState<TrialStatus>(DEFAULT_STATUS);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      // If authenticated, user is not in trial mode
      if (isAuthenticated()) {
        if (isMounted) {
          setStatus({
            isTrialMode: false,
            isLoading: false,
            chatsUsed: 0,
            chatsRemaining: 10,
            maxChats: 10,
          });
        }
        return;
      }

      // Fetch trial session status
      try {
        const res = await fetch("/api/trial/session");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.hasSession) {
            setStatus({
              isTrialMode: true,
              isLoading: false,
              chatsUsed: data.chatsUsed || 0,
              chatsRemaining: data.chatsRemaining || 10,
              maxChats: 10,
            });
          } else {
            setStatus({
              isTrialMode: true,
              isLoading: false,
              chatsUsed: 0,
              chatsRemaining: 10,
              maxChats: 10,
            });
          }
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
