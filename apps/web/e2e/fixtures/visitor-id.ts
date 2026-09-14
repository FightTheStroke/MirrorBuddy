import { randomUUID } from 'node:crypto';

/**
 * The proxy accepts a trial visitor only when the cookie holds a UUID v4
 * (see isValidVisitorId in src/lib/auth/cookie-constants.ts). Any other shape is
 * treated as forged and the request is redirected to /welcome, so fixtures must
 * mint the same format the production guard requires.
 */
export function createE2EVisitorId(): string {
  return randomUUID();
}
