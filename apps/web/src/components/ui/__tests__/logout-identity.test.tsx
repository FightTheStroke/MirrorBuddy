import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { clearCSRFToken, getClientIdentity, setClientIdentity } from '@/lib/auth';
import { installLogoutTransportMock, logoutCSRFToken } from '@/test/fixtures/logout-transport';
import { LogoutActions } from '../logout-actions';
import { MobileLogoutButton } from '@/components/settings/sections/mobile-logout-button';
import itMessages from '../../../../messages/it/common.json';
import enMessages from '../../../../messages/en/common.json';
import frMessages from '../../../../messages/fr/common.json';
import deMessages from '../../../../messages/de/common.json';
import esMessages from '../../../../messages/es/common.json';

vi.unmock('next-intl');
const transport = vi.fn<typeof fetch>();
const account = {
  status: 'authenticated' as const,
  userId: 'account',
  role: 'USER' as const,
  legacyOrigin: true,
  needsLegacyUpgrade: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  setClientIdentity(account);
  transport.mockResolvedValue(Response.json({ success: true }));
  installLogoutTransportMock(transport);
});
afterEach(() => {
  cleanup();
  clearCSRFToken();
  vi.unstubAllGlobals();
});

describe('durable logout controls', () => {
  it.each([
    ['it', itMessages],
    ['en', enMessages],
    ['fr', frMessages],
    ['de', deMessages],
    ['es', esMessages],
  ] as const)(
    '%s provides localized current/all controls and legacy-family consequence',
    async (locale, messages) => {
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LogoutActions />
        </NextIntlClientProvider>,
      );
      expect(screen.getByText(messages.common.session.legacyFamily)).toBeInTheDocument();
      const current = screen.getByRole('button', { name: messages.common.session.logoutCurrent });
      expect(current).toHaveAttribute('data-testid', 'logout-button');
      await userEvent
        .setup()
        .click(screen.getByRole('button', { name: messages.common.session.logoutAll }));
      expect(transport).toHaveBeenCalledExactlyOnceWith('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ scope: 'all' }),
        credentials: 'include',
        headers: expect.any(Headers),
      });
      expect(new Headers(transport.mock.calls[0][1]?.headers).get('X-CSRF-Token')).toBe(
        logoutCSRFToken,
      );
      expect(window.location.assign).toHaveBeenCalledWith(`/${locale}/welcome`);
      expect(getClientIdentity()).toEqual({ status: 'anonymous' });
    },
  );
  it('mobile logout remains visible without a hint and a failed revocation retains state and choices', async () => {
    document.cookie = 'mirrorbuddy-user-id-client=; path=/; max-age=0';
    localStorage.setItem('mirrorbuddy-unified-consent', 'preserved-choice');
    transport.mockResolvedValue(new Response('{}', { status: 503 }));
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <MobileLogoutButton />
      </NextIntlClientProvider>,
    );
    await userEvent.setup().click(screen.getByTestId('mobile-logout-button'));
    expect(screen.getByRole('alert')).toHaveTextContent(enMessages.common.session.logoutFailed);
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(getClientIdentity()).toEqual(account);
    expect(localStorage.getItem('mirrorbuddy-unified-consent')).toBe('preserved-choice');
    expect(transport).toHaveBeenCalledExactlyOnceWith('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ scope: 'current' }),
      credentials: 'include',
      headers: expect.any(Headers),
    });
    expect(new Headers(transport.mock.calls[0][1]?.headers).get('X-CSRF-Token')).toBe(
      logoutCSRFToken,
    );
  });
});
