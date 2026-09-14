import { csrfFetch } from './csrf-client';
import type { ClientIdentity } from './identity-types';

export type { ClientIdentity } from './identity-types';
export type LogoutScope = 'current' | 'all';
export const PENDING_IDENTITY: ClientIdentity = Object.freeze({ status: 'pending' });
let identity: ClientIdentity = PENDING_IDENTITY;
let generation = 0;
const listeners = new Set<() => void>();

export class IdentityUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`Identity unavailable: ${reason}`);
    this.name = 'IdentityUnavailableError';
  }
}

export const getClientIdentity = (): ClientIdentity => identity;
export function subscribeClientIdentity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called only with server projections or a successful durable logout acknowledgement. */
export function setClientIdentity(next: ClientIdentity | null | undefined): void {
  generation++;
  identity = next ?? { status: 'unavailable', reason: 'INVALID_IDENTITY_RESPONSE' };
  listeners.forEach((listener) => listener());
}

function parseIdentity(value: unknown): ClientIdentity | null {
  if (!value || typeof value !== 'object') return null;
  if (!('status' in value) || value.status !== 'authenticated') return null;
  if (
    !('userId' in value) ||
    typeof value.userId !== 'string' ||
    !value.userId ||
    !('role' in value) ||
    !['USER', 'ADMIN', 'ADMIN_READONLY'].includes(String(value.role)) ||
    !('legacyOrigin' in value) ||
    typeof value.legacyOrigin !== 'boolean' ||
    !('needsLegacyUpgrade' in value) ||
    typeof value.needsLegacyUpgrade !== 'boolean'
  )
    return null;
  return {
    status: 'authenticated',
    userId: value.userId,
    role: value.role as 'USER' | 'ADMIN' | 'ADMIN_READONLY',
    legacyOrigin: value.legacyOrigin,
    needsLegacyUpgrade: value.needsLegacyUpgrade,
  };
}

export async function refreshClientIdentity(): Promise<ClientIdentity> {
  setClientIdentity(PENDING_IDENTITY);
  const requestGeneration = generation;
  let next: ClientIdentity;
  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' });
    const data: unknown = await response.json();
    const body = data && typeof data === 'object' ? data : {};
    const code = 'code' in body && typeof body.code === 'string' ? body.code : undefined;
    if (response.status === 401 && code === 'AUTH_ABSENT') next = { status: 'anonymous' };
    else if (response.ok) {
      next = ('identity' in body && parseIdentity(body.identity)) || {
        status: 'unavailable',
        reason: 'INVALID_IDENTITY_RESPONSE',
      };
    } else next = { status: 'unavailable', reason: code || 'SESSION_UNAVAILABLE' };
  } catch {
    next = { status: 'unavailable', reason: 'SESSION_UNAVAILABLE' };
  }
  if (generation === requestGeneration) setClientIdentity(next);
  return identity;
}

/** Compatibility name only: the readable hint is deliberately never consulted. */
export function getUserIdFromCookie(): string | null {
  if (identity.status === 'authenticated') return identity.userId;
  if (identity.status === 'anonymous') return null;
  throw new IdentityUnavailableError(
    identity.status === 'unavailable' ? identity.reason : 'PENDING',
  );
}

export function requireClientUserId(): string {
  const userId = getUserIdFromCookie();
  if (!userId) throw new IdentityUnavailableError('AUTH_ABSENT');
  return userId;
}

export function isAuthenticated(): boolean {
  return getUserIdFromCookie() !== null;
}

export async function requireIdentityRefresh(
  expected?: 'authenticated' | 'anonymous',
): Promise<ClientIdentity> {
  const next = await refreshClientIdentity();
  if (next.status === 'unavailable' || next.status === 'pending') {
    throw new IdentityUnavailableError(next.status === 'unavailable' ? next.reason : 'PENDING');
  }
  if (expected && next.status !== expected)
    throw new IdentityUnavailableError('UNEXPECTED_IDENTITY');
  return next;
}

export async function logoutClient(scope: LogoutScope = 'current'): Promise<void> {
  // Do not upgrade/refresh first: logout must act on the credential actually presented.
  const response = await csrfFetch('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ scope }),
  });
  if (!response.ok) throw new IdentityUnavailableError('LOGOUT_FAILED');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('success' in data) || data.success !== true) {
    throw new IdentityUnavailableError('INVALID_LOGOUT_RESPONSE');
  }
  setClientIdentity({ status: 'anonymous' });
}

export async function upgradeLegacyIdentity(): Promise<void> {
  const current = identity;
  if (current.status !== 'authenticated' || !current.needsLegacyUpgrade) return;
  const response = await csrfFetch('/api/auth/session/upgrade', { method: 'POST' });
  if (!response.ok) throw new IdentityUnavailableError('UPGRADE_FAILED');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('success' in data) || data.success !== true) {
    throw new IdentityUnavailableError('INVALID_UPGRADE_RESPONSE');
  }
  if (identity === current) await requireIdentityRefresh();
}
