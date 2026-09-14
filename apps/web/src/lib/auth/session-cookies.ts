import 'server-only';
import type { IssuedSession } from './session-issuance';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
  LEGACY_AUTH_COOKIE,
  ADMIN_COOKIE_NAME,
  SIMULATED_TIER_COOKIE,
  CSRF_TOKEN_COOKIE,
} from './cookie-constants';

interface CookieWriter {
  set(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax';
      path: string;
      maxAge: number;
      expires: Date;
    },
  ): unknown;
}

export function setSessionCookies(store: CookieWriter, issued: IssuedSession): void {
  if (!store || !issued?.token || !issued.userId || !(issued.expiresAt instanceof Date))
    throw new TypeError('Persisted session and cookie writer are required');
  const options = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: issued.maxAge,
    expires: issued.expiresAt,
  };
  store.set(AUTH_COOKIE_NAME, issued.token, { ...options, httpOnly: true });
  store.set(AUTH_COOKIE_CLIENT, issued.userId, { ...options, httpOnly: false });
}

export function clearSessionCookies(store: CookieWriter): void {
  if (!store) throw new TypeError('Cookie writer is required');
  for (const name of [
    AUTH_COOKIE_NAME,
    LEGACY_AUTH_COOKIE,
    AUTH_COOKIE_CLIENT,
    ADMIN_COOKIE_NAME,
    SIMULATED_TIER_COOKIE,
    CSRF_TOKEN_COOKIE,
  ]) {
    store.set(name, '', {
      httpOnly: name !== AUTH_COOKIE_CLIENT,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
  }
  // Visitor budgets and consent survive logout; neither is an authentication credential.
}
