import { vi } from 'vitest';
import { AUTH_COOKIE_CLIENT, clearCSRFToken, isAuthenticated } from '@/lib/auth';
import { resetConsentSnapshot } from '../consent-store';

export function setConsentTestAccount(authenticated = false): void {
  document.cookie = authenticated
    ? `${AUTH_COOKIE_CLIENT}=00000000-0000-4000-8000-000000000001; path=/`
    : `${AUTH_COOKIE_CLIENT}=; path=/; max-age=0`;
}

/** Mock only HTTP; production consent and CSRF helpers execute unchanged. */
export function installConsentTransportMock(eligibleAccount = false): void {
  resetConsentSnapshot();
  clearCSRFToken();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (input === '/api/session') return Response.json({ csrfToken: 'consent-regression-token' });
    if (input === '/api/user/consent' && init?.method === 'POST' && typeof init.body === 'string') {
      const consent = JSON.parse(init.body);
      const persisted = isAuthenticated();
      return Response.json({
        success: true,
        consent,
        persisted,
        analyticsAllowed: persisted && eligibleAccount && consent.analytics === true,
      });
    }
    throw new Error(`Unexpected consent request: ${String(input)}`);
  });
}
