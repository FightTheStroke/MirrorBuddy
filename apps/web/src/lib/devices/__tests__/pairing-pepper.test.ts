/**
 * Regression for #1169 (Sentry MIRRORBUDDY-3C): production had neither
 * DEVICE_PAIRING_PEPPER nor ENCRYPTION_KEY, so pairing codes were keyed with a
 * constant published in this repository — a stored verifier leaked from the
 * database could be brute-forced over the 10^6 codes. Production must refuse
 * to pair instead of falling back; development keeps the fallback.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

import { logger } from '@/lib/logger';

import {
  DevicePairingUnavailableError,
  _resetPairingPepperForTesting,
  resolvePairingPepper,
} from '../pairing-pepper';

describe('resolvePairingPepper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPairingPepperForTesting();
    vi.stubEnv('DEVICE_PAIRING_PEPPER', '');
    vi.stubEnv('ENCRYPTION_KEY', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('fails closed in production without a configured pepper, reporting it once', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => resolvePairingPepper()).toThrow(DevicePairingUnavailableError);
    expect(() => resolvePairingPepper()).toThrow(DevicePairingUnavailableError);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('uses the configured pepper in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEVICE_PAIRING_PEPPER', 'p'.repeat(64));

    expect(resolvePairingPepper()).toBe('p'.repeat(64));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('keeps the development fallback outside production, without alerting', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(resolvePairingPepper()).toBe('mirrorbuddy-device-pairing-fallback-pepper');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
