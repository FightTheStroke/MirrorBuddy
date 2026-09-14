import React from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import itAdmin from '../../../../../../messages/it/admin.json';
import enAdmin from '../../../../../../messages/en/admin.json';
import frAdmin from '../../../../../../messages/fr/admin.json';
import deAdmin from '../../../../../../messages/de/admin.json';
import esAdmin from '../../../../../../messages/es/admin.json';
import itErrors from '../../../../../../messages/it/errors.json';
import enErrors from '../../../../../../messages/en/errors.json';
import frErrors from '../../../../../../messages/fr/errors.json';
import deErrors from '../../../../../../messages/de/errors.json';
import esErrors from '../../../../../../messages/es/errors.json';
import itCommon from '../../../../../../messages/it/common.json';
import enCommon from '../../../../../../messages/en/common.json';
import frCommon from '../../../../../../messages/fr/common.json';
import deCommon from '../../../../../../messages/de/common.json';
import esCommon from '../../../../../../messages/es/common.json';
import KeyVaultPage from '../page';

vi.unmock('next-intl');
vi.mock('../components/add-key-modal', () => ({ AddKeyModal: () => null }));
vi.mock('../components/edit-key-modal', () => ({ EditKeyModal: () => null }));
vi.mock('../components/delete-key-modal', () => ({ DeleteKeyModal: () => null }));

const fetchMock = vi.fn<typeof fetch>();
const rawServerDetail = 'Prisma connection failed: private-host/example-secret';
const locales = [
  ['it', { ...itAdmin, ...itErrors, ...itCommon }],
  ['en', { ...enAdmin, ...enErrors, ...enCommon }],
  ['fr', { ...frAdmin, ...frErrors, ...frCommon }],
  ['de', { ...deAdmin, ...deErrors, ...deCommon }],
  ['es', { ...esAdmin, ...esErrors, ...esCommon }],
] as const;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPage(locale = 'en', messages: (typeof locales)[number][1] = locales[1][1]) {
  const onError = vi.fn();
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Europe/Rome"
      onError={onError}
    >
      <KeyVaultPage />
    </NextIntlClientProvider>,
  );
  return onError;
}

describe.each(locales)('KeyVault database errors (%s)', (locale, messages) => {
  it('announces a safe localized database category and retry action', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'database_error', message: rawServerDetail }), {
        status: 500,
      }),
    );

    const onError = renderPage(locale, messages);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(messages.admin.databaseConnectionError);
    expect(alert).toHaveTextContent(messages.errors.errorPage.message);
    expect(screen.getByRole('button', { name: messages.errors.retry })).toBeEnabled();
    expect(screen.queryByText(rawServerDetail)).not.toBeInTheDocument();
    expect(
      screen.queryByText(messages.admin.noSecretsStoredYetClickLdquoAddKeyRdquoToCreateOne),
    ).not.toBeInTheDocument();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('KeyVault error recovery', () => {
  it('retries with the keyboard, announces loading and renders the recovered credentials', async () => {
    let resolveRetry!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'database_error', message: rawServerDetail }), {
          status: 500,
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRetry = resolve;
          }),
      );
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('alert');
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: enErrors.errors.retry })).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/key-vault');
    expect(
      screen.getByRole('status', { name: enCommon.common.ui.skeleton.loading }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: enErrors.errors.retry })).not.toBeInTheDocument();
    await act(async () => {
      resolveRetry(
        new Response(
          JSON.stringify({
            secrets: [
              {
                id: 'recovered-key',
                service: 'Recovered service',
                keyName: 'RECOVERED_KEY',
                maskedValue: '****safe',
                status: 'active',
                lastUsed: null,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          }),
        ),
      );
    });

    expect(within(await screen.findByRole('table')).getByText('RECOVERED_KEY')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['encryption_not_configured', enAdmin.admin.encryptionNotConfigured],
    ['internal_error', enErrors.errors.serverError],
    ['new_server_category', enErrors.errors.generic],
  ])('keeps %s visible without leaking the server message', async (error, title) => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error, message: rawServerDetail }), { status: 503 }),
    );
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(title);
    expect(alert).toHaveTextContent(enErrors.errors.errorPage.message);
    expect(alert).not.toHaveTextContent(rawServerDetail);
    expect(screen.getByRole('button', { name: enErrors.errors.retry })).toBeEnabled();
    if (error === 'encryption_not_configured') {
      expect(screen.getByText(enAdmin.admin.setupInstructions)).toBeInTheDocument();
      expect(screen.getByText('TOKEN_ENCRYPTION_KEY')).toBeInTheDocument();
    }
  });

  it.each([null, {}, { error: null }, { error: 42 }])(
    'shows a safe recoverable fallback for malformed errors: %j',
    async (body) => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 500 }));
      renderPage();

      expect(await screen.findByRole('alert')).toHaveTextContent(enErrors.errors.generic);
      expect(screen.getByRole('button', { name: enErrors.errors.retry })).toBeEnabled();
    },
  );

  it('recognizes the database category even without a message', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'database_error' }), { status: 500 }),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      enAdmin.admin.databaseConnectionError,
    );
  });

  it('handles invalid JSON without exposing the parsing error', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html>private proxy detail</html>', { status: 502 }),
    );
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(enErrors.errors.generic);
    expect(alert).not.toHaveTextContent('private proxy detail');
  });

  it('handles rejected requests and a subsequent successful retry', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError(rawServerDetail))
      .mockResolvedValueOnce(new Response(JSON.stringify({ secrets: [] })));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(enErrors.errors.generic);
    expect(screen.queryByText(rawServerDetail)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: enErrors.errors.retry }));

    expect(
      await screen.findByText(enAdmin.admin.noSecretsStoredYetClickLdquoAddKeyRdquoToCreateOne),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not report a malformed success body as an empty vault', async () => {
    fetchMock.mockResolvedValueOnce(new Response('null'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(enErrors.errors.generic);
    expect(
      screen.queryByText(enAdmin.admin.noSecretsStoredYetClickLdquoAddKeyRdquoToCreateOne),
    ).not.toBeInTheDocument();
  });
});
