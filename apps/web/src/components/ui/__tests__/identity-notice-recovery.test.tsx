import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import {
  transport,
  nativeSession,
  legacySession,
  installLogoutFetch,
  expectCleared,
} from '@/app/api/auth/logout/__tests__/logout-fixtures';
import {
  clearCSRFToken,
  getClientIdentity,
  setClientIdentity,
  type ClientIdentity,
} from '@/lib/auth';
import { dbNow } from '@/test/fixtures/session-lifecycle';
import { AUTH_COOKIE_NAME } from '@/lib/auth';
import { IdentityNotice } from '../identity-notice';
import { LogoutActions } from '../logout-actions';
import itMessages from '../../../../messages/it/common.json';
import enMessages from '../../../../messages/en/common.json';
import frMessages from '../../../../messages/fr/common.json';
import deMessages from '../../../../messages/de/common.json';
import esMessages from '../../../../messages/es/common.json';

vi.unmock('next-intl');

beforeEach(() => {
  clearCSRFToken();
  setClientIdentity({ status: 'unavailable', reason: 'SESSION_REJECTED' });
  installLogoutFetch();
});
afterEach(() => {
  cleanup();
  clearCSRFToken();
  setClientIdentity({ status: 'pending' });
  vi.unstubAllGlobals();
});

function renderNotice(settings = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <IdentityNotice />
      {settings && <LogoutActions />}
    </NextIntlClientProvider>,
  );
}

function currentButton() {
  return within(screen.getByRole('alert')).getByRole('button', {
    name: enMessages.common.session.logoutCurrent,
  });
}

describe('cold-load identity alert provides truthful current logout recovery', () => {
  it.each([
    { locale: 'it', messages: itMessages },
    { locale: 'en', messages: enMessages },
    { locale: 'fr', messages: frMessages },
    { locale: 'de', messages: deMessages },
    { locale: 'es', messages: esMessages },
  ])(
    '$locale exposes recovery directly inside the alert without settings',
    async ({ locale, messages }) => {
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <IdentityNotice />
        </NextIntlClientProvider>,
      );
      const alert = within(screen.getByRole('alert'));
      expect(
        alert.getByRole('button', { name: messages.common.session.logoutCurrent }),
      ).toBeEnabled();
      expect(alert.getByRole('button', { name: messages.common.session.retry })).toBeEnabled();
      const all = alert.getByRole('button', { name: messages.common.session.logoutAll });
      expect(all).toBeDisabled();
      await userEvent.setup().click(all);
      expect(fetch).not.toHaveBeenCalled();
      expect(getClientIdentity().status).toBe('unavailable');
    },
  );

  it('uses distinct identifiers when settings logout controls coexist', () => {
    renderNotice(true);
    const alert = screen.getByTestId('identity-unavailable-alert');
    expect(within(alert).getByTestId('identity-logout-button')).toBeEnabled();
    expect(screen.getAllByTestId('logout-button')).toHaveLength(1);
    expect(screen.getAllByTestId('identity-logout-button')).toHaveLength(1);
    expect(within(alert).queryByTestId('logout-button')).not.toBeInTheDocument();
  });

  it.each(['malformed', 'expired', 'revoked'])(
    'performs real CSRF/current logout and navigates only after %s recovery',
    async (kind) => {
      if (kind === 'malformed') transport.jar.set(AUTH_COOKIE_NAME, 's2:invalid.signature');
      else nativeSession(kind === 'expired' ? { expiresAt: dbNow } : { revokedAt: dbNow });
      renderNotice();

      await userEvent.setup().click(currentButton());

      await waitFor(() =>
        expect(window.location.assign).toHaveBeenCalledWith(
          new URL('/en/welcome', window.location.origin).href,
        ),
      );
      expect(getClientIdentity()).toEqual({ status: 'anonymous' });
      expectCleared();
      expect(transport.transaction).not.toHaveBeenCalled();
      const calls = vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/auth/logout');
      expect(calls).toHaveLength(1);
      expect(calls[0][1]?.body).toBe('{"scope":"current"}');
    },
  );

  it.each(['SESSION_UNAVAILABLE', 'SESSION_NOT_ACTIVATED'])(
    '%s remains a visible failure without cookie clearing or anonymous success',
    async (reason) => {
      const identity: ClientIdentity = { status: 'unavailable', reason };
      setClientIdentity(identity);
      if (reason === 'SESSION_NOT_ACTIVATED') {
        legacySession({ activationId: null, sessionActivatedAt: null });
      } else {
        nativeSession();
        transport.tx.$queryRaw.mockReset().mockRejectedValue(new Error('database offline'));
      }
      renderNotice();

      await userEvent.setup().click(currentButton());

      await waitFor(() =>
        expect(screen.getByText(enMessages.common.session.logoutFailed)).toBeVisible(),
      );
      expect(getClientIdentity()).toBe(identity);
      expect(window.location.assign).not.toHaveBeenCalled();
      expect(transport.set).not.toHaveBeenCalled();
      expect(transport.transaction).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: enMessages.common.session.logoutAll }),
      ).toBeDisabled();
      expect(screen.getByTestId('identity-unavailable-alert')).toBeVisible();
    },
  );

  it('keeps identity unavailable and prevents duplicate submissions until real acknowledgement', async () => {
    const issued = nativeSession({ expiresAt: dbNow });
    let complete: ((rows: (typeof issued.row)[]) => void) | undefined;
    const pending = new Promise<(typeof issued.row)[]>((resolve) => {
      complete = resolve;
    });
    transport.tx.$queryRaw.mockReset().mockReturnValue(pending);
    renderNotice();
    const current = currentButton();
    await userEvent.setup().click(current);
    await waitFor(() => expect(transport.tx.$queryRaw).toHaveBeenCalledOnce());
    expect(current).toBeDisabled();
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(getClientIdentity().status).toBe('unavailable');
    await userEvent.setup().click(current);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/auth/logout')).toHaveLength(
      1,
    );

    await act(async () => {
      if (!complete) throw new Error('Missing database response resolver');
      complete([issued.row]);
    });

    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith(
        new URL('/en/welcome', window.location.origin).href,
      ),
    );
    expectCleared();
  });

  it.each<ClientIdentity>([
    { status: 'pending' },
    { status: 'anonymous' },
    {
      status: 'authenticated',
      userId: 'owner',
      role: 'USER',
      legacyOrigin: false,
      needsLegacyUpgrade: false,
    },
  ])('does not introduce an unavailable alert for $status', (identity) => {
    setClientIdentity(identity);
    renderNotice();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
