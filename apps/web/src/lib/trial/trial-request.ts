import { prisma } from '@/lib/db';
import { validateVisitorId } from '@/lib/auth/cookie-constants';

export function hasTrialConsent(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const consent: unknown = JSON.parse(decodeURIComponent(value));
    return (
      typeof consent === 'object' &&
      consent !== null &&
      'accepted' in consent &&
      consent.accepted === true
    );
  } catch {
    return false;
  }
}

/** IP hashes deduplicate budgets; only the independent visitor cookie proves ownership. */
export async function findOwnedTrialSession(
  visitor: string | null | undefined,
  sessionId?: string,
) {
  const visitorId = validateVisitorId(visitor ?? undefined);
  if (!visitorId) return null;
  return prisma.trialSession.findFirst({
    where: { visitorId, ...(sessionId ? { id: sessionId } : {}) },
  });
}
