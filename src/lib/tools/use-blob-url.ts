/**
 * Hook to manage blob URLs for iframe content
 *
 * Using blob URLs instead of srcDoc bypasses the parent's CSP,
 * allowing inline scripts to execute in sandboxed iframes.
 *
 * @see ADR 0024 - Demo HTML Builder centralization
 */

import { useMemo, useEffect, useRef } from 'react';

/**
 * Creates and manages a blob URL from HTML content
 * Automatically revokes the URL on unmount or content change to prevent memory leaks
 *
 * @param htmlContent - The complete HTML document string
 * @returns A blob URL that can be used as iframe src
 */
export function useBlobUrl(htmlContent: string): string {
  // Store previous URL for cleanup in useEffect
  const previousUrlRef = useRef<string | null>(null);

  // Create blob URL
  const blobUrl = useMemo(() => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [htmlContent]);

  // Handle cleanup in useEffect (not during render)
  useEffect(() => {
    // Store current URL for cleanup on next render or unmount
    const currentUrl = blobUrl;

    // Revoke previous URL if it exists and is different
    if (previousUrlRef.current && previousUrlRef.current !== currentUrl) {
      URL.revokeObjectURL(previousUrlRef.current);
    }

    // Update ref to current URL
    previousUrlRef.current = currentUrl;

    // Cleanup on unmount
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [blobUrl]);

  return blobUrl;
}
