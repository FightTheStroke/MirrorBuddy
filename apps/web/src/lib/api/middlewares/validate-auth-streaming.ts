import { cookies } from 'next/headers';
import { validateAuth, validateSessionOwnership } from '@/lib/auth/session-auth';
import { VISITOR_COOKIE_NAME, validateVisitorId } from '@/lib/auth/cookie-constants';

export interface StreamingAuthResult {
  authenticated: boolean;
  userId: string | null;
  visitorId: string | null;
  error?: string;
}

export async function validateAuthForStreaming(request: Request): Promise<StreamingAuthResult> {
  if (!request) throw new TypeError('Request is required');
  const auth = await validateAuth();
  if (auth.authenticated) return { authenticated: true, userId: auth.userId, visitorId: null };
  const store = await cookies();
  const visitorId = validateVisitorId(store.get(VISITOR_COOKIE_NAME)?.value);
  return { authenticated: false, userId: null, visitorId };
}

export async function requireAuthForStreaming(
  request: Request,
): Promise<{ userId: string | null; error: string | null }> {
  const auth = await validateAuthForStreaming(request);
  return {
    userId: auth.userId,
    error: auth.authenticated ? null : 'Authentication required',
  };
}

export const validateSessionOwnershipForStreaming = validateSessionOwnership;
