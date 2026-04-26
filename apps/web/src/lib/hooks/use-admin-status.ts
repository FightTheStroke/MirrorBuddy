/**
 * Hook to check if current user is an admin
 * Fetches user info from /api/auth/me and caches the result
 */

import { useState, useEffect } from "react";

interface AdminStatus {
  isAdmin: boolean;
  isLoading: boolean;
  userId: string | null;
}

export function useAdminStatus(): AdminStatus {
  const [status, setStatus] = useState<AdminStatus>({
    isAdmin: false,
    isLoading: true,
    userId: null,
  });

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setStatus({
            isAdmin: data.user?.isAdmin ?? false,
            isLoading: false,
            userId: data.user?.id ?? null,
          });
        } else {
          setStatus({ isAdmin: false, isLoading: false, userId: null });
        }
      } catch {
        setStatus({ isAdmin: false, isLoading: false, userId: null });
      }
    }

    checkAdminStatus();
  }, []);

  return status;
}
