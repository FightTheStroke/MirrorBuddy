import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from '@/app/[locale]/login/page';
import { getClientIdentity, setClientIdentity } from '../client-auth';

const push = vi.hoisted(() => vi.fn());
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
const account = {
  status: 'authenticated' as const,
  userId: 'server-user',
  role: 'USER' as const,
  legacyOrigin: false,
  needsLegacyUpgrade: false,
};
beforeEach(() => {
  push.mockReset();
  vi.mocked(window.location.assign).mockClear();
  setClientIdentity({ status: 'anonymous' });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function submit() {
  const view = render(<LoginPage />);
  const form = view.container.querySelector('form');
  if (!form) throw new Error('Login form missing');
  fireEvent.submit(form);
}

describe('real login form refresh seam', () => {
  it.each([false, true])(
    'refreshes identity before navigation, preserving mustChangePassword=%s',
    async (mustChangePassword) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockImplementation(async (url) =>
            Response.json(
              url === '/api/auth/login'
                ? { user: { id: account.userId, role: 'USER', mustChangePassword } }
                : { identity: account },
            ),
          ),
      );
      submit();
      await waitFor(() =>
        expect(window.location.assign).toHaveBeenCalledWith(
          mustChangePassword ? '/it/change-password' : '/it',
        ),
      );
      expect(getClientIdentity()).toEqual(account);
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({ cache: 'no-store' }),
      );
    },
  );
  it('does not navigate or trust issuance fields when the identity refresh fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (url) =>
          url === '/api/auth/login'
            ? Response.json({ user: { id: 'unconfirmed-user', role: 'ADMIN' } })
            : Response.json({ code: 'SESSION_UNAVAILABLE' }, { status: 503 }),
        ),
    );
    submit();
    await screen.findByRole('alert');
    expect(push).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(getClientIdentity()).toEqual({ status: 'unavailable', reason: 'SESSION_UNAVAILABLE' });
  });
});
