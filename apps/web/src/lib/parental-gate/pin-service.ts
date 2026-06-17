// ============================================================================
// PARENTAL GATE — PIN service (Issue #432)
// Stores a bcrypt hash of the parent PIN in Settings.parentalPinHash.
// The hash is NEVER returned to the client; only set/verify/status are exposed.
// ============================================================================

import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'parental-gate/pin-service' });

// 4 to 6 digits — child-resistant, easy for a parent to remember.
const PIN_REGEX = /^\d{4,6}$/;

/**
 * Validate the PIN format (4-6 numeric digits).
 */
export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_REGEX.test(pin);
}

/**
 * Whether a parental PIN has been configured for the given user.
 * Returns false (fail-closed to "no PIN", math fallback applies) on any error.
 */
export async function getParentalPinStatus(userId: string): Promise<{ isSet: boolean }> {
  if (!userId) return { isSet: false };
  try {
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { parentalPinHash: true },
    });
    return { isSet: Boolean(settings?.parentalPinHash) };
  } catch (error) {
    log.error('Failed to read parental PIN status', { error: String(error) });
    return { isSet: false };
  }
}

/**
 * Set (or replace) the parental PIN for the given user.
 * Throws on missing userId or invalid PIN format.
 */
export async function setParentalPin(userId: string, pin: string): Promise<void> {
  if (!userId) throw new Error('Missing userId');
  if (!isValidPinFormat(pin)) throw new Error('Invalid PIN format');

  const parentalPinHash = await hashPassword(pin);
  await prisma.settings.upsert({
    where: { userId },
    update: { parentalPinHash },
    create: { userId, parentalPinHash },
  });
  log.info('Parental PIN set');
}

/**
 * Verify a submitted PIN against the stored hash.
 * Returns false on any error, invalid format, or when no PIN is configured.
 */
export async function verifyParentalPin(userId: string, pin: string): Promise<boolean> {
  if (!userId || !isValidPinFormat(pin)) return false;
  try {
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { parentalPinHash: true },
    });
    if (!settings?.parentalPinHash) return false;
    return await verifyPassword(pin, settings.parentalPinHash);
  } catch (error) {
    log.error('Failed to verify parental PIN', { error: String(error) });
    return false;
  }
}
