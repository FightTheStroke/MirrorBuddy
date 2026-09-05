import { hashSessionHandle } from '../session-token';

export const activatedAt = new Date('2026-01-01T00:00:00.000Z');
export const dbNow = new Date('2026-01-02T00:00:00.000Z');
export const deadline = new Date('2026-01-08T00:00:00.000Z');
export const handle = Buffer.alloc(32, 7).toString('base64url');
export const modernCredential = {
  valid: true,
  kind: 'modern',
  handle,
  handleHash: hashSessionHandle(handle),
} as const;
export const legacyCredential = {
  valid: true,
  kind: 'legacy',
  userId: 'session-owner',
  legacyOrigin: true,
} as const;

export function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    dbNow,
    activationId: 'global',
    sessionActivatedAt: activatedAt,
    userId: 'session-owner',
    userDisabled: false,
    userAuthVersion: 4,
    userLegacyRevoked: false,
    handleHash: modernCredential.handleHash,
    sessionUserId: 'session-owner',
    issuedAt: new Date('2026-01-01T12:00:00.000Z'),
    expiresAt: new Date('2026-02-01T00:00:00.000Z'),
    revokedAt: null,
    sessionAuthVersion: 4,
    legacyOrigin: false,
    ...overrides,
  };
}

export function legacySnapshot(overrides: Record<string, unknown> = {}) {
  return snapshot({
    handleHash: null,
    sessionUserId: null,
    issuedAt: null,
    expiresAt: null,
    revokedAt: null,
    sessionAuthVersion: null,
    legacyOrigin: null,
    ...overrides,
  });
}
