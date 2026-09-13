import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { resolveSessionToken } from './session-reader';
import { SessionReadError, type SessionResolution } from './session-policy';
import { AuthenticationError } from './auth-error';
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE } from './cookie-constants';

export type AuthenticatedSession = Extract<SessionResolution, { status: 'AUTHENTICATED' }>;
export type AuthResult =
  | { authenticated: true; userId: string; session: AuthenticatedSession; error?: never }
  | { authenticated: false; userId: null; error: string; session?: never };
export type AdminAuthResult = AuthResult & { isAdmin: boolean };
export type AdminReadOnlyAuthResult = AuthResult & { canAccessAdminReadOnly: boolean };

async function readRole(userId: string) {
  try {
    return await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  } catch {
    throw new AuthenticationError('SESSION_UNAVAILABLE');
  }
}

/** Only absent credentials return anonymous. Rejected/unavailable credentials are failures. */
export async function validateAuth(): Promise<AuthResult> {
  const token = await getPresentedSessionToken();
  if (typeof token === 'undefined') {
    return { authenticated: false, userId: null, error: 'No authentication cookie' };
  }
  return validatePresentedToken(token);
}

/** Opaque transport only, for fresh-proof replacement; never interpret this as identity. */
export async function getPresentedSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  const cookie = store.get(AUTH_COOKIE_NAME) ?? store.get(LEGACY_AUTH_COOKIE);
  if (!cookie) return undefined;
  if (typeof cookie.value !== 'string') throw new AuthenticationError('SESSION_REJECTED');
  return cookie.value;
}

async function validatePresentedToken(token: unknown): Promise<AuthResult> {
  let resolution: SessionResolution;
  try {
    resolution = await resolveSessionToken(token);
  } catch (error) {
    if (error instanceof SessionReadError) throw new AuthenticationError('SESSION_UNAVAILABLE');
    throw error;
  }
  if (resolution.status === 'NOT_ACTIVATED') throw new AuthenticationError('SESSION_NOT_ACTIVATED');
  if (resolution.status === 'DENIED') throw new AuthenticationError('SESSION_REJECTED');
  return { authenticated: true, userId: resolution.userId, session: resolution };
}

export async function validateSessionOwnership(
  sessionId: string | null | undefined,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!sessionId || !userId) throw new TypeError('Session and user identity are required');
  if (sessionId.startsWith('voice-')) return true;
  const conversation = await prisma.conversation.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  return conversation !== null;
}

export async function validateAdminAuth(): Promise<AdminAuthResult> {
  const auth = await validateAuth();
  if (!auth.authenticated) return { ...auth, isAdmin: false };
  const user = await readRole(auth.userId);
  if (!user) throw new AuthenticationError('SESSION_REJECTED');
  return { ...auth, isAdmin: user.role === 'ADMIN' };
}

export async function validateAdminReadOnlyAuth(): Promise<AdminReadOnlyAuthResult> {
  const auth = await validateAuth();
  if (!auth.authenticated) return { ...auth, canAccessAdminReadOnly: false };
  const user = await readRole(auth.userId);
  if (!user) throw new AuthenticationError('SESSION_REJECTED');
  return {
    ...auth,
    canAccessAdminReadOnly: user.role === 'ADMIN' || user.role === 'ADMIN_READONLY',
  };
}

export async function requireAuthenticatedUser(): Promise<{
  userId: string | null;
  errorResponse: Response | null;
}> {
  const auth = await validateAuth();
  if (!auth.authenticated) {
    return {
      userId: null,
      errorResponse: Response.json(
        { error: 'Authentication required', code: 'AUTH_ABSENT' },
        { status: 401 },
      ),
    };
  }
  return { userId: auth.userId, errorResponse: null };
}
