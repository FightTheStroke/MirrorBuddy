import { vi } from 'vitest';
import { clearCSRFToken } from '@/lib/auth';

export const logoutCSRFToken = 'logout-control-fixture-token';

/** Leaves identity transitions and CSRF handling real; replaces only HTTP transport. */
export function installLogoutTransportMock(logout: typeof fetch) {
  clearCSRFToken();
  const transport = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    if (input === '/api/session') return Response.json({ csrfToken: logoutCSRFToken });
    if (input === '/api/auth/logout') return logout(input, init);
    throw new Error(`Unexpected logout request: ${String(input)}`);
  });
  vi.stubGlobal('fetch', transport);
  return transport;
}
