import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrialEmailForm } from '@/app/[locale]/welcome/components/trial-email-form';
import * as consentStorage from '@/lib/consent/unified-consent-storage';
import { getConsentSyncSnapshot, resetConsentSnapshot } from '@/lib/consent/consent-store';
import { setConsentTestAccount } from '@/lib/consent/__tests__/consent-test-transport';
import { AUTH_COOKIE_CLIENT, TRIAL_CONSENT_COOKIE } from '@/lib/auth';
import { TOS_VERSION } from '@/lib/tos/constants';
import { installConsentUITransport } from './consent-ui-fixture';
import { getTranslation as t } from '@/test/i18n-helpers';

const captured = vi.hoisted(() => ({
  onSave: undefined as ((accepted: boolean) => void) | undefined,
}));
vi.mock('../consent-reanswer', async (importOriginal) => {
  const original = await importOriginal<typeof import('../consent-reanswer')>();
  return {
    ...original,
    ConsentReanswer(props: ComponentProps<typeof original.ConsentReanswer>) {
      captured.onSave = props.onSave;
      return <original.ConsentReanswer {...props} />;
    },
  };
});

async function submit(onComplete: () => void | Promise<void>) {
  const user = userEvent.setup();
  render(<TrialEmailForm onComplete={onComplete} />);
  await user.type(screen.getByRole('textbox'), 'student@example.com');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: t('welcome.quickStart.trial.startTrial') }));
  return user;
}

describe('welcome separates recorded terms from trial completion', () => {
  beforeEach(() => {
    installConsentUITransport();
    captured.onSave = undefined;
    document.cookie = `${TRIAL_CONSENT_COOKIE}=; path=/; max-age=0`;
  });
  afterEach(() => {
    cleanup();
    resetConsentSnapshot();
    setConsentTestAccount(false);
    vi.restoreAllMocks();
  });

  it.each([
    new Error('Trial start unavailable'),
    new consentStorage.ConsentSyncError('network'),
    undefined,
  ])('retries only completion after its rejection (%s)', async (error) => {
    const complete = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    const save = vi.spyOn(consentStorage, 'saveTermsConsent');
    const user = await submit(complete);
    expect(await screen.findByRole('alert')).toHaveTextContent(t('consent.sync.trialStartFailed'));
    expect(screen.queryByText(t('consent.sync.failed'))).not.toBeInTheDocument();
    expect(consentStorage.hasUnifiedConsent()).toBe(true);
    expect(getConsentSyncSnapshot().error).toBeNull();
    const recorded = consentStorage.getUnifiedConsent()?.tos;
    await user.click(screen.getByRole('button', { name: t('consent.sync.retryTrial') }));
    expect(complete).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledOnce();
    expect(consentStorage.getUnifiedConsent()?.tos).toEqual(recorded);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces trial startup separately while completion is still pending', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const complete = vi.fn(() => pending);
    await submit(complete);
    expect(await screen.findByRole('status')).toHaveTextContent(t('consent.sync.startingTrial'));
    expect(screen.queryByText(t('consent.sync.saving'))).not.toBeInTheDocument();
    expect(consentStorage.hasUnifiedConsent()).toBe(true);
    expect(
      screen.getByRole('button', {
        name: t('welcome.quickStart.trial.startTrial'),
      }),
    ).toBeDisabled();
    await act(async () => {
      finish();
      await pending;
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(complete).toHaveBeenCalledOnce();
  });

  it.each(['storage', 'delivery'] as const)(
    'does not retain email or set the trial cookie before terms %s succeeds',
    async (failure) => {
      const complete = vi.fn();
      if (failure === 'storage') {
        vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
          throw new Error('Storage unavailable');
        });
      } else {
        setConsentTestAccount(true);
        const transport = vi.mocked(fetch).getMockImplementation()!;
        vi.mocked(fetch).mockImplementation(async (input, init) =>
          input === '/api/tos' && init?.method === 'POST'
            ? Response.json({ error: 'Unavailable' }, { status: 503 })
            : transport(input, init),
        );
      }
      await submit(complete);
      expect(await screen.findByRole('alert')).toHaveTextContent(t('consent.sync.failed'));
      expect(sessionStorage.getItem('mirrorbuddy-trial-email')).toBeNull();
      expect(document.cookie).not.toContain(`${TRIAL_CONSENT_COOKIE}=`);
      expect(complete).not.toHaveBeenCalled();
    },
  );

  it.each(['2025-04-05T10:00:00.000Z', ''])(
    'preserves the actual terms timestamp (%s) and shared version without inventing a date',
    async (oldDate) => {
      const recorded = consentStorage.saveTermsConsent(true);
      localStorage.setItem(
        'mirrorbuddy-unified-consent',
        JSON.stringify({
          ...recorded,
          tos: { ...recorded.tos, acceptedAt: oldDate },
        }),
      );
      const complete = vi.fn();
      await submit(complete);
      const cookie = document.cookie
        .split('; ')
        .find((value) => value.startsWith(`${TRIAL_CONSENT_COOKIE}=`));
      if (!cookie) throw new Error('Trial cookie missing');
      expect(JSON.parse(decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)))).toEqual({
        accepted: true,
        version: TOS_VERSION,
        acceptedAt: oldDate,
      });
      expect(complete).toHaveBeenCalledOnce();
    },
  );

  it('retries failed email storage as trial preparation without rewriting accepted terms', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Session storage unavailable');
    });
    const complete = vi.fn();
    const user = await submit(complete);
    expect(await screen.findByRole('alert')).toHaveTextContent(t('consent.sync.trialStartFailed'));
    expect(consentStorage.hasUnifiedConsent()).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    const terms = consentStorage.getUnifiedConsent()?.tos;
    setItem.mockRestore();
    await user.click(screen.getByRole('button', { name: t('consent.sync.retryTrial') }));
    expect(complete).toHaveBeenCalledOnce();
    expect(consentStorage.getUnifiedConsent()?.tos).toEqual(terms);
    expect(sessionStorage.getItem('mirrorbuddy-trial-email')).toBe('student@example.com');
  });

  it('rejects false re-answer input in the parent and rejects implicit form submit after supersession', async () => {
    setConsentTestAccount(true);
    const transport = vi.mocked(fetch).getMockImplementation()!;
    let failing = true;
    let posts = 0;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/tos' && init?.method === 'POST') {
        posts++;
        if (failing) return Response.json({ error: 'Unavailable' }, { status: 503 });
      }
      return transport(input, init);
    });
    const complete = vi.fn();
    const user = await submit(complete);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    document.cookie = `${AUTH_COOKIE_CLIENT}=different-account; path=/`;
    failing = false;
    await user.click(screen.getByRole('button', { name: t('consent.sync.retry') }));
    const fresh = await screen.findByTestId('consent-reanswer-terms');
    if (!captured.onSave) throw new Error('Missing real re-answer callback');
    await act(async () => {
      captured.onSave?.(false);
    });
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) => alert.textContent === t('welcome.quickStart.trial.tosLabel')),
      ).toBe(true),
    );
    const form = fresh.closest('form');
    if (!form) throw new Error('Missing welcome form');
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(posts).toBe(1);
    expect(consentStorage.hasUnifiedConsent()).toBe(false);
    expect(complete).not.toHaveBeenCalled();
  });
});
