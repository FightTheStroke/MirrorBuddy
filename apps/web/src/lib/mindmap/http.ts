import 'server-only';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiError, type Middleware } from '@/lib/api/pipe';
import { validateAuth, type AuthenticatedSession } from '@/lib/auth/session-auth';
import { AuthenticationError } from '@/lib/auth/auth-error';
import {
  VISITOR_COOKIE_NAME,
  TRIAL_CONSENT_COOKIE,
  validateVisitorId,
} from '@/lib/auth/cookie-constants';
import { hasTrialConsent } from '@/lib/trial/trial-request';
import { canAccessFullFeatures } from '@/lib/compliance/server';
import { revalidateSession } from '@/lib/auth/session-reader';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { MindmapError } from './protocol';
import type { MindmapOwner } from './storage';

export type MindmapAccess = { owner: MindmapOwner; session?: AuthenticatedSession };

export const withMindmapErrors: Middleware = async (_ctx, next) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof MindmapError) throw new ApiError(error.code, error.status);
    if (error instanceof ZodError || error instanceof SyntaxError)
      throw new ApiError('Invalid mindmap request', 400);
    throw error;
  }
};

export async function authorizeMindmap(
  request: NextRequest,
  allowTrial = true,
): Promise<MindmapAccess> {
  // validateAuth throws for rejected credentials; only genuine absence can choose trial.
  const auth = await validateAuth();
  let access: MindmapAccess;
  if (auth.authenticated) {
    access = { owner: { kind: 'user', userId: auth.userId }, session: auth.session };
  } else {
    if (!allowTrial) throw new ApiError('Authentication required', 401);
    const cookieStore = await cookies();
    const visitorId = validateVisitorId(cookieStore.get(VISITOR_COOKIE_NAME)?.value);
    if (!visitorId) throw new ApiError('Authentication required', 401);
    if (!hasTrialConsent(cookieStore.get(TRIAL_CONSENT_COOKIE)?.value))
      throw new ApiError('Trial privacy consent required', 403);
    access = { owner: { kind: 'trial', visitorId } };
  }
  const identifier =
    access.owner.kind === 'user' ? access.owner.userId : getRateLimitIdentifier(request);
  const limit = await checkRateLimitAsync(`mindmap:${identifier}`, RATE_LIMITS.GENERAL);
  if (!limit.success) throw new ApiError('Too many mindmap requests', 429);
  if (
    request.method !== 'GET' &&
    access.owner.kind === 'user' &&
    !(await canAccessFullFeatures(access.owner.userId))
  )
    throw new ApiError('Parental consent required', 403, { code: 'COPPA_CONSENT_REQUIRED' });
  return access;
}

export async function revalidateMindmapAccess(access: MindmapAccess): Promise<void> {
  if (access.owner.kind === 'user') {
    const result = await revalidateSession(prisma, access.session);
    if (result.status !== 'AUTHENTICATED') throw new AuthenticationError('SESSION_REJECTED');
  }
  // Trial ownership and expiry are read from the database by every snapshot operation.
}
