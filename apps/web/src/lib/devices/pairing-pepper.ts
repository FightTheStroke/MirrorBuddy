/**
 * Server-side pepper for robot pairing codes.
 *
 * A 6-digit code has 10^6 values, so a stored hash alone can be brute-forced
 * from a database leak; the HMAC key makes the verifier useless without it.
 * The development fallback is published in this repository, so it protects
 * nothing: production refuses to pair rather than use it (#1169).
 */
import { logger } from '@/lib/logger';

const DEVELOPMENT_FALLBACK_PEPPER = 'mirrorbuddy-device-pairing-fallback-pepper';

export class DevicePairingUnavailableError extends Error {
  constructor() {
    super('Device pairing is unavailable: DEVICE_PAIRING_PEPPER is not configured');
    this.name = 'DevicePairingUnavailableError';
  }
}

let missingPepperReported = false;

export function resolvePairingPepper(): string {
  const configured = process.env.DEVICE_PAIRING_PEPPER || process.env.ENCRYPTION_KEY;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    if (!missingPepperReported) {
      missingPepperReported = true;
      logger.error('DEVICE_PAIRING_PEPPER is not set; device pairing is disabled');
    }
    throw new DevicePairingUnavailableError();
  }
  return DEVELOPMENT_FALLBACK_PEPPER;
}

export function isDevicePairingUnavailable(error: unknown): boolean {
  return error instanceof Error && error.name === 'DevicePairingUnavailableError';
}

export function _resetPairingPepperForTesting(): void {
  missingPepperReported = false;
}
