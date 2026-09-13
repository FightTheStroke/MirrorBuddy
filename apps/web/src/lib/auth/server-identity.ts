import 'server-only';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AuthenticationError } from './auth-error';
import { validateAuth, type AuthenticatedSession } from './session-auth';
import type { ClientIdentity } from './identity-types';

export async function projectSessionIdentity(
  session: AuthenticatedSession,
): Promise<ClientIdentity> {
  if (!session?.userId) throw new AuthenticationError('SESSION_REJECTED');
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, disabled: true },
  });
  if (!user || user.disabled) throw new AuthenticationError('SESSION_REJECTED');
  return {
    status: 'authenticated',
    userId: session.userId,
    role: user.role,
    legacyOrigin: session.session.legacyOrigin,
    needsLegacyUpgrade: session.session.kind === 'legacy',
  };
}

/** A request-local projection; never cache authorization or expose a session handle. */
export async function getServerIdentity(): Promise<ClientIdentity> {
  try {
    const auth = await validateAuth();
    return auth.authenticated
      ? await projectSessionIdentity(auth.session)
      : { status: 'anonymous' };
  } catch (error) {
    if (error instanceof AuthenticationError) return { status: 'unavailable', reason: error.code };
    logger.error('Server identity unavailable', { code: 'SESSION_UNAVAILABLE' });
    return { status: 'unavailable', reason: 'SESSION_UNAVAILABLE' };
  }
}
