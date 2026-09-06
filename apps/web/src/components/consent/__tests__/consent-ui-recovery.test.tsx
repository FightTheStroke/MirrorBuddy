import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { UnifiedConsentWall } from '../unified-consent-wall';
import { InlineConsent } from '../inline-consent';
import { PrivacySettings } from '@/components/settings/sections/privacy-settings';
import { TrialEmailForm } from '@/app/[locale]/welcome/components/trial-email-form';
import {
  getUnifiedConsent,
  hasAnalyticsConsent,
  hasUnifiedConsent,
  saveTermsConsent,
} from '@/lib/consent/unified-consent-storage';
import { resetConsentSnapshot } from '@/lib/consent/consent-store';
import { setConsentTestAccount } from '@/lib/consent/__tests__/consent-test-transport';
import { getTranslation as t } from '@/test/i18n-helpers';
import { installConsentUITransport } from './consent-ui-fixture';

describe('consent callers retain and retry real failed intents', () => {
  beforeEach(() => {
    installConsentUITransport(true);
  });
  afterEach(() => {
    cleanup();
    resetConsentSnapshot();
    setConsentTestAccount(false);
    vi.restoreAllMocks();
  });

  for (const surface of ['inline', 'privacy', 'wall'] as const) {
    it.each(['storage', 'network', 403] as const)(
      `${surface} presents %s and rejected retry, then recovers without re-answering`,
      async (failure) => {
        if (surface !== 'wall') saveTermsConsent(true);
        const user = userEvent.setup();
        const transport = vi.mocked(fetch).getMockImplementation()!;
        let failing = true;
        const requests: string[] = [];
        vi.mocked(fetch).mockImplementation(async (input, init) => {
          if (input === '/api/user/consent' && init?.method === 'POST') {
            requests.push(String(init.body));
            if (failing && failure === 'network') throw new TypeError('Offline');
            if (failing && failure === 403)
              return Response.json({ error: 'CSRF' }, { status: 403 });
          }
          return transport(input, init);
        });
        const setItem = localStorage.setItem;
        vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
          if (failing && failure === 'storage' && key === 'mirrorbuddy-unified-consent') {
            throw new DOMException('Storage unavailable', 'QuotaExceededError');
          }
          setItem.call(localStorage, key, value);
        });
        if (surface === 'inline') {
          render(<InlineConsent />);
          await user.click(
            screen.getByRole('checkbox', { name: t('consent.inline.analyticsLabel') }),
          );
          await user.click(screen.getByRole('button', { name: t('consent.inline.submitButton') }));
        } else if (surface === 'privacy') {
          render(<PrivacySettings />);
          await user.click(
            screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') }),
          );
        } else {
          render(
            <UnifiedConsentWall>
              <button>Study</button>
            </UnifiedConsentWall>,
          );
          await user.click(
            await screen.findByRole('button', { name: t('consent.unified.buttons.acceptAll') }),
          );
        }
        expect(await screen.findByRole('alert')).toHaveTextContent(t('consent.sync.failed'));
        const intentDate = getUnifiedConsent()?.cookies.acceptedAt;
        expect(hasAnalyticsConsent()).toBe(false);
        expect(getUnifiedConsent()?.cookies.analytics).toBe(true);
        await user.click(screen.getByRole('button', { name: t('consent.sync.retry') }));
        expect(await screen.findByRole('alert')).toBeInTheDocument();
        failing = false;
        await user.click(screen.getByRole('button', { name: t('consent.sync.retry') }));
        await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
        expect(getUnifiedConsent()?.cookies.acceptedAt).toBe(intentDate);
        expect(getUnifiedConsent()?.pending).toBeUndefined();
        expect(new Set(requests).size).toBe(1);
        expect(hasAnalyticsConsent()).toBe(false);
        expect(hasUnifiedConsent()).toBe(surface !== 'wall');
      },
    );
  }

  it('does not block study for failed optional refusal after explicit guest terms', async () => {
    const user = userEvent.setup();
    const transport = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/user/consent') throw new TypeError('Offline');
      return transport(input, init);
    });
    render(
      <UnifiedConsentWall>
        <button>Study</button>
      </UnifiedConsentWall>,
    );
    await user.click(
      await screen.findByRole('button', { name: t('consent.unified.buttons.rejectAll') }),
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', { name: t('consent.unified.tosCheckbox.label') }),
    );
    await user.click(screen.getByRole('button', { name: t('consent.terms.modal.buttons.accept') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Study' })).toBeEnabled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(hasUnifiedConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('keeps failed account terms mandatory until their own retry succeeds', async () => {
    setConsentTestAccount(true);
    const transport = vi.mocked(fetch).getMockImplementation()!;
    let failing = true;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/tos' && init?.method === 'POST' && failing) {
        return Response.json({ error: 'Unavailable' }, { status: 503 });
      }
      return transport(input, init);
    });
    const user = userEvent.setup();
    render(
      <UnifiedConsentWall>
        <main>Study</main>
      </UnifiedConsentWall>,
    );
    await user.click(
      await screen.findByRole('checkbox', { name: t('consent.unified.tosCheckbox.label') }),
    );
    await user.click(screen.getByRole('button', { name: t('consent.terms.modal.buttons.accept') }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(hasUnifiedConsent()).toBe(false);
    failing = false;
    await user.click(screen.getByRole('button', { name: t('consent.sync.retry') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(hasUnifiedConsent()).toBe(true);
    expect(getUnifiedConsent()?.cookies.analytics).toBeNull();
  });

  it('welcome catches synchronous terms-save failure and retries its existing checked choice', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TrialEmailForm onComplete={onComplete} />);
    await user.type(screen.getByRole('textbox'), 'student@example.com');
    await user.click(screen.getByRole('checkbox'));
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Unavailable', 'QuotaExceededError');
    });
    await user.click(
      screen.getByRole('button', { name: t('welcome.quickStart.trial.startTrial') }),
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('mirrorbuddy-trial-email')).toBeNull();
    setItem.mockRestore();
    await user.click(screen.getByRole('button', { name: t('consent.sync.retry') }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(hasUnifiedConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('a retry in actual settings also clears the enclosing wall status', async () => {
    saveTermsConsent(true);
    const user = userEvent.setup();
    const transport = vi.mocked(fetch).getMockImplementation()!;
    let failing = true;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/user/consent' && failing) throw new TypeError('Offline');
      return transport(input, init);
    });
    render(
      <UnifiedConsentWall>
        <PrivacySettings />
      </UnifiedConsentWall>,
    );
    await user.click(screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') }));
    const privacy = within(
      screen.getByRole('region', { name: t('settings.privacy.telemetriaEAnalisi') }),
    );
    expect(await privacy.findByRole('alert')).toBeInTheDocument();
    failing = false;
    await user.click(privacy.getByRole('button', { name: t('consent.sync.retry') }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(getUnifiedConsent()?.pending).toBeUndefined();
    expect(hasUnifiedConsent()).toBe(true);
  });
});
