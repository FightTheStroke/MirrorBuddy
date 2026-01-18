"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { TosAcceptanceModal } from "./tos-acceptance-modal";
import { logger } from "@/lib/logger";

/**
 * TosGateProvider - Enforces Terms of Service acceptance for authenticated users.
 *
 * Client-side implementation (Option A) that:
 * - Checks ToS status on mount via GET /api/tos
 * - Shows TosAcceptanceModal if not accepted
 * - Skips check for public pages (/terms, /privacy, /cookies)
 * - Caches result in session to avoid repeated API calls
 * - Supports re-consent: when ToS version changes, shows modal with "updated" message
 *
 * F-12: Block access if ToS not accepted
 */

// Public pages that don't require ToS acceptance
const PUBLIC_PATHS = [
  "/terms",
  "/privacy",
  "/cookies",
  "/landing",
  "/welcome",
  "/auth/login",
  "/auth/signup",
];

// API routes that should not trigger ToS check
const API_PATH_PREFIX = "/api/";

// Session storage keys
const TOS_ACCEPTED_KEY = "tos_accepted";
const TOS_VERSION_KEY = "tos_accepted_version";

interface TosStatus {
  accepted: boolean;
  checked: boolean;
  version?: string;
  isReconsent?: boolean; // True if user accepted old version but needs new one
}

export function TosGateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tosStatus, setTosStatus] = React.useState<TosStatus>({
    accepted: true, // Optimistic - assume accepted until proven otherwise
    checked: false,
  });
  const [showModal, setShowModal] = React.useState(false);
  const checkedRef = React.useRef(false);

  // Check if current path is public (no ToS required)
  const isPublicPath = React.useMemo(() => {
    if (!pathname) return true;
    if (pathname.startsWith(API_PATH_PREFIX)) return true;
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
  }, [pathname]);

  // Check ToS status on mount (only once per session)
  React.useEffect(() => {
    // Skip if already checked or on public path
    if (checkedRef.current || isPublicPath) {
      return;
    }

    checkedRef.current = true;

    // Fetch ToS status from API (always, to check version)
    fetch("/api/tos", {
      method: "GET",
      credentials: "include", // Include cookies for auth
    })
      .then((response) => {
        // If 401 Unauthorized, user is not logged in - allow access
        if (response.status === 401) {
          setTosStatus({ accepted: true, checked: true });
          return null;
        }
        if (!response.ok) {
          throw new Error(`ToS check failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data) return; // 401 case

        const accepted = data.accepted === true;
        const currentVersion = data.version;

        // Check session cache with version validation
        const cachedAccepted = sessionStorage.getItem(TOS_ACCEPTED_KEY);
        const cachedVersion = sessionStorage.getItem(TOS_VERSION_KEY);

        // If cached and version matches, use cache
        if (cachedAccepted === "true" && cachedVersion === currentVersion) {
          setTosStatus({
            accepted: true,
            checked: true,
            version: currentVersion,
          });
          return;
        }

        // Detect re-consent scenario: user has previous acceptance but needs new version
        const isReconsent = !accepted && data.previousVersion !== undefined;

        setTosStatus({
          accepted,
          checked: true,
          version: currentVersion,
          isReconsent,
        });

        // Cache in session if accepted (with version)
        if (accepted) {
          sessionStorage.setItem(TOS_ACCEPTED_KEY, "true");
          sessionStorage.setItem(TOS_VERSION_KEY, currentVersion);
        } else {
          // Clear any stale cache
          sessionStorage.removeItem(TOS_ACCEPTED_KEY);
          sessionStorage.removeItem(TOS_VERSION_KEY);
          // Show modal if not accepted
          setShowModal(true);
        }
      })
      .catch((error) => {
        logger.error(
          "ToS check error",
          { component: "TosGateProvider" },
          error,
        );
        // On error, allow access (graceful degradation)
        setTosStatus({ accepted: true, checked: true });
      });
  }, [isPublicPath]);

  // Handle ToS acceptance
  const handleAccept = React.useCallback((version: string) => {
    // Cache acceptance in session (with version)
    sessionStorage.setItem(TOS_ACCEPTED_KEY, "true");
    sessionStorage.setItem(TOS_VERSION_KEY, version);

    // Update state
    setTosStatus({ accepted: true, checked: true, version });
    setShowModal(false);
  }, []);

  return (
    <>
      {children}
      {tosStatus.checked && !tosStatus.accepted && (
        <TosAcceptanceModal
          open={showModal}
          onAccept={handleAccept}
          isReconsent={tosStatus.isReconsent}
        />
      )}
    </>
  );
}
