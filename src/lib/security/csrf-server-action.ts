/**
 * CSRF Protection for Server Actions
 *
 * Server Actions use FormData instead of NextRequest, so we need
 * different validation logic compared to API routes.
 *
 * Pattern:
 * 1. Client fetches CSRF token from /api/session
 * 2. Client includes token as hidden form field
 * 3. Server Action validates token from FormData against cookie
 *
 * Usage in Server Action:
 * ```typescript
 * 'use server';
 * async function myAction(formData: FormData) {
 *   const csrfError = await validateServerActionCSRF(formData);
 *   if (csrfError) {
 *     throw new Error(csrfError);
 *   }
 *   // ... rest of mutation logic
 * }
 * ```
 */

import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { CSRF_TOKEN_COOKIE } from '@/lib/auth';

/**
 * Validate CSRF token from Server Action FormData
 *
 * Compares token in FormData with token in cookie (double-submit pattern).
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param formData - FormData from Server Action
 * @param fieldName - Name of the hidden input field containing the token (default: 'csrf_token')
 * @returns Error message if validation fails, null if successful
 */
export async function validateServerActionCSRF(
  formData: FormData,
  fieldName = 'csrf_token',
): Promise<string | null> {
  // Get token from form data
  const formToken = formData.get(fieldName);
  if (!formToken || typeof formToken !== 'string') {
    return 'Missing CSRF token in form';
  }

  // Get token from cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
  if (!cookieToken) {
    return 'CSRF token not found in session';
  }

  // Timing-safe comparison
  try {
    const formBuffer = Buffer.from(formToken, 'base64url');
    const cookieBuffer = Buffer.from(cookieToken, 'base64url');

    // Ensure same length (timingSafeEqual requires it)
    if (formBuffer.length !== cookieBuffer.length) {
      return 'Invalid CSRF token';
    }

    if (!timingSafeEqual(formBuffer, cookieBuffer)) {
      return 'Invalid CSRF token';
    }

    return null; // Success
  } catch {
    return 'Invalid CSRF token format';
  }
}

/**
 * Require CSRF validation in Server Action
 * Throws error if validation fails
 *
 * @param formData - FormData from Server Action
 * @param fieldName - Name of the hidden input field containing the token
 */
export async function requireServerActionCSRF(
  formData: FormData,
  fieldName = 'csrf_token',
): Promise<void> {
  const error = await validateServerActionCSRF(formData, fieldName);
  if (error) {
    throw new Error(error);
  }
}
