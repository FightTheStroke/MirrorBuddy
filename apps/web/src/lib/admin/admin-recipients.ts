/**
 * Who receives an internal notification.
 *
 * Every alert — a child-safety escalation, a cost alarm, a contact form, a Pro
 * waitlist signup — used to go to a single address held in an environment
 * variable, and the waitlist went to an address written into the source. Both
 * are single points of failure: promoting a second administrator did not make
 * them reachable, and a mistyped variable sent safety escalations into the void
 * (`info@fighttestroke.org` was live in production until 30 August 2026).
 *
 * Recipients are now the administrators recorded in the database. Add an
 * administrator and they start receiving alerts; remove one and they stop.
 *
 * `ADMIN_EMAIL` remains as a fallback and is never dropped: a safety
 * escalation must survive an unreachable database.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'admin-recipients' });

/** Cheap sanity check — these addresses come from the database, not a form. */
function isDeliverable(email: string | null | undefined): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function fallbackRecipients(): string[] {
  const configured = process.env.ADMIN_EMAIL;
  return isDeliverable(configured) ? [configured] : [];
}

/**
 * Active administrators, by email address.
 *
 * Read-only administrators are excluded: that role exists for automated
 * production checks, not for a person who should be told something is wrong.
 * Disabled accounts and test accounts are excluded for the same reason.
 *
 * Never throws. An empty result means nothing can be notified at all, and the
 * caller should say so in its logs rather than fail.
 */
export async function getAdminRecipients(): Promise<string[]> {
  let fromDatabase: string[] = [];

  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', disabled: false, isTestData: false },
      select: { email: true },
    });
    fromDatabase = admins.map((a) => a.email).filter(isDeliverable);
  } catch (error) {
    log.error('Could not read administrators, falling back to ADMIN_EMAIL', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return fallbackRecipients();
  }

  // The configured address is always included. It is how the operator stays
  // reachable while the administrator list is being changed.
  const all = [...fromDatabase, ...fallbackRecipients()];
  const unique = [...new Set(all.map((e) => e.toLowerCase()))];

  if (unique.length === 0) {
    log.warn('No administrator can be notified: no ADMIN user and no ADMIN_EMAIL');
  }

  return unique;
}
