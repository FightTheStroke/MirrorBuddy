import { afterEach, expect, it, vi } from 'vitest';
import { transport, expectCleared, installLogoutFetch } from './logout-fixtures';
import { clearCSRFToken, getClientIdentity, logoutClient, setClientIdentity } from '@/lib/auth';
import { AUTH_COOKIE_NAME, CSRF_TOKEN_COOKIE } from '@/lib/auth';

afterEach(() => {
  clearCSRFToken();
  setClientIdentity({ status: 'pending' });
  vi.unstubAllGlobals();
});

it('recovers the real logout client through real CSRF issuance and the rejected-cookie route', async () => {
  clearCSRFToken();
  transport.jar.set(AUTH_COOKIE_NAME, 's2:malformed.signature');
  transport.jar.delete(CSRF_TOKEN_COOKIE);
  setClientIdentity({ status: 'unavailable', reason: 'SESSION_REJECTED' });
  const fetch = installLogoutFetch();

  await logoutClient();

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(getClientIdentity()).toEqual({ status: 'anonymous' });
  expectCleared();
  expect(transport.transaction).not.toHaveBeenCalled();
});
