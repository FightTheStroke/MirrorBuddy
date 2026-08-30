/**
 * The Pro page must not be a dead end.
 *
 * Before this, a student who tapped "Pro" in the analytics screen landed on a
 * 404 — a page that does not exist, in an app used by children who already
 * have to work harder than most to read what is on the screen. The page now
 * takes an email; these tests hold it to that, including the part where the
 * signup is labelled as coming from Pro so the team knows what was asked for.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import itWaitlist from '../../../../../messages/it/waitlist.json';
import itPro from '../../../../../messages/it/pro.json';
import { ProWaitlistForm, errorKeyForStatus } from '../pro-waitlist-form';

const messages = { ...itWaitlist, ...itPro };
const submitLabel = itWaitlist.waitlist.submitButton;
const emailLabel = itWaitlist.waitlist.emailLabel;

function renderForm() {
  return render(
    <NextIntlClientProvider locale="it" messages={messages}>
      <ProWaitlistForm locale="it" />
    </NextIntlClientProvider>,
  );
}

async function fillAndSubmit(email: string, { consent = true, marketing = false } = {}) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(emailLabel), email);
  const [gdprBox, marketingBox] = screen.getAllByRole('checkbox');
  if (consent) await user.click(gdprBox);
  if (marketing) await user.click(marketingBox);
  await user.click(screen.getByRole('button', { name: submitLabel }));
}

describe('Pro waitlist form', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 201 } as Response));
  });

  it('tells the API the request came from the Pro page', async () => {
    renderForm();
    await fillAndSubmit('parent@example.com');

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/waitlist/signup');
    expect(body.source).toBe('pro');
    expect(body.email).toBe('parent@example.com');
    expect(body.gdprConsent).toBe(true);
    expect(body.locale).toBe('it');
  });

  it('does not claim consent to be written to unless it was given', async () => {
    renderForm();
    await fillAndSubmit('parent@example.com');

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.marketingConsent).toBe(false);
  });

  it('records consent to be written to when it was given', async () => {
    renderForm();
    await fillAndSubmit('parent@example.com', { marketing: true });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.marketingConsent).toBe(true);
  });

  it('confirms in words, not just by clearing the form', async () => {
    renderForm();
    await fillAndSubmit('parent@example.com');

    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('never sends a signup without GDPR consent', async () => {
    renderForm();
    await fillAndSubmit('parent@example.com', { consent: false });

    expect(fetch).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('rejects an address that cannot receive mail, before bothering the server', async () => {
    renderForm();
    await fillAndSubmit('not-an-address');

    expect(fetch).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('announces the error to a screen reader and links it to the field', async () => {
    renderForm();
    await fillAndSubmit('not-an-address');

    const alert = await screen.findByRole('alert');
    const input = screen.getByLabelText(emailLabel);

    expect(input).toHaveAttribute('aria-describedby', alert.id);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('says something useful when the network is gone, instead of nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderForm();
    await fillAndSubmit('parent@example.com');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('maps every server answer to a message the person can act on', () => {
    expect(errorKeyForStatus(409)).toBe('errorDuplicate');
    expect(errorKeyForStatus(429)).toBe('errorRateLimit');
    expect(errorKeyForStatus(400)).toBe('errorValidation');
    expect(errorKeyForStatus(500)).toBe('errorServer');
  });
});
