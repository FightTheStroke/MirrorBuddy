/**
 * CSRF Token Hidden Input Component
 *
 * Automatically fetches and includes a CSRF token as a hidden input
 * in Server Action forms. Must be used inside all forms that use
 * mutation Server Actions.
 *
 * Usage:
 * ```tsx
 * <form action={myServerAction}>
 *   <CSRFTokenInput />
 *   <input name="data" ... />
 *   <button type="submit">Submit</button>
 * </form>
 * ```
 */

'use client';

import { useEffect, useState } from 'react';
import { getCSRFToken } from '@/lib/auth';

interface CSRFTokenInputProps {
  /**
   * Name of the hidden input field
   * Must match the fieldName parameter in Server Action validation
   * @default 'csrf_token'
   */
  fieldName?: string;
}

export function CSRFTokenInput({ fieldName = 'csrf_token' }: CSRFTokenInputProps) {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Fetch CSRF token on mount
    getCSRFToken()
      .then(setToken)
      .catch(() => {
        // Token fetch failed - form will submit without CSRF
        // Server action will reject the request
      });
  }, []);

  // Don't render until we have a token
  if (!token) {
    return null;
  }

  return <input type="hidden" name={fieldName} value={token} />;
}
