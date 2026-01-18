'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { TosAcceptanceModal } from './tos-acceptance-modal';

/**
 * TosGateProvider - Enforces Terms of Service acceptance for authenticated users.
 *
 * Client-side implementation (Option A) that:
 * - Checks ToS status on mount via GET /api/tos
 * - Shows TosAcceptanceModal if not accepted
 * - Skips check for public pages (/terms, /privacy, /cookies)
 * - Caches result in session to avoid repeated API calls
 *
 * F-12: Block access if ToS not accepted
 */

// Public pages that don't require ToS acceptance
const PUBLIC_PATHS = [
  '/terms',
  '/privacy',
  '/cookies',
  '/landing',
  '/welcome',
  '/showcase',
  '/auth/login',
  '/auth/signup',
];

// API routes that should not trigger ToS check
const API_PATH_PREFIX = '/api/';

interface TosStatus {
  accepted: boolean;
  checked: boolean;
  version?: string;
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

    // Check session cache first
    const cachedStatus = sessionStorage.getItem('tos_accepted');
    if (cachedStatus === 'true') {
      setTosStatus({ accepted: true, checked: true });
      return;
    }

    // Fetch ToS status from API
    fetch('/api/tos', {
      method: 'GET',
      credentials: 'include', // Include cookies for auth
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

        setTosStatus({
          accepted,
          checked: true,
          version: data.version,
        });

        // Cache in session if accepted
        if (accepted) {
          sessionStorage.setItem('tos_accepted', 'true');
        } else {
          // Show modal if not accepted
          setShowModal(true);
        }
      })
      .catch((error) => {
        console.error('ToS check error:', error);
        // On error, allow access (graceful degradation)
        setTosStatus({ accepted: true, checked: true });
      });
  }, [isPublicPath]);

  // Handle ToS acceptance
  const handleAccept = React.useCallback(() => {
    // Cache acceptance in session
    sessionStorage.setItem('tos_accepted', 'true');

    // Update state
    setTosStatus({ accepted: true, checked: true });
    setShowModal(false);

    console.log('ToS accepted, modal closed');
  }, []);

  return (
    <>
      {children}
      {tosStatus.checked && !tosStatus.accepted && (
        <TosAcceptanceModal open={showModal} onAccept={handleAccept} />
      )}
    </>
  );
}
