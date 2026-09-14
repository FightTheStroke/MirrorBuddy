import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TrialEmailForm } from '@/app/[locale]/welcome/components/trial-email-form';
import { PrivacySettings } from '@/components/settings/sections/privacy-settings';
import { UnifiedConsentWall } from '../unified-consent-wall';
import { InlineConsent } from '../inline-consent';
import {
  getUnifiedConsent,
  hasAnalyticsConsent,
  hasUnifiedConsent,
  saveAnalyticsConsent,
  saveTermsConsent,
  syncUnifiedConsentToServer,
} from '@/lib/consent/unified-consent-storage';
import { getConsentSyncSnapshot, resetConsentSnapshot } from '@/lib/consent/consent-store';
import {
  AUTH_COOKIE_CLIENT,
  AUTH_COOKIE_NAME,
  TRIAL_CONSENT_COOKIE,
  clearCSRFToken,
} from '@/lib/auth';
import { getTranslation } from '@/test/i18n-helpers';
import { setConsentTestAccount } from '@/lib/consent/__tests__/consent-test-transport';

const t = getTranslation;
const unexpectedRequests: string[] = [];

describe('T5 actual consent caller compatibility', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetConsentSnapshot();
    setConsentTestAccount(false);
    clearCSRFToken();
    unexpectedRequests.length = 0;
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    for (const name of [AUTH_COOKIE_CLIENT, AUTH_COOKIE_NAME, TRIAL_CONSENT_COOKIE]) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? 'GET';
      if (url === '/api/session' && method === 'GET') {
        return Response.json({ csrfToken: 'caller-regression-csrf-token' });
      }
      if (url === '/api/user/consent' && method === 'POST') {
        if (typeof init?.body !== 'string') throw new Error('Missing consent request body');
        return Response.json({
          success: true,
          consent: JSON.parse(init.body),
          persisted: false,
          analyticsAllowed: false,
        });
      }
      if (url === '/api/version' && method === 'GET') {
        return Response.json({ version: 'test', environment: 'test', buildTime: '' });
      }
      unexpectedRequests.push(`${method} ${url}`);
      throw new Error(`Unexpected test request: ${method} ${url}`);
    });
  });

  afterEach(() => {
    cleanup();
    resetConsentSnapshot();
    clearCSRFToken();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    expect(unexpectedRequests).toEqual([]);
  });

  it('cannot start the welcome trial without the existing explicit terms checkbox', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TrialEmailForm onComplete={onComplete} />);
    await user.type(
      screen.getByRole('textbox', { name: t('welcome.quickStart.trial.emailLabel') }),
      'student@example.com',
    );
    const submit = screen.getByRole('button', { name: t('welcome.quickStart.trial.startTrial') });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(onComplete).not.toHaveBeenCalled();
    expect(hasUnifiedConsent()).toBe(false);
    expect(document.cookie).not.toContain(`${TRIAL_CONSENT_COOKIE}=`);
  });

  it.each([null, false, true])(
    'welcome terms acceptance survives page remount without changing analytics=%s',
    async (analytics) => {
      if (analytics !== null) await syncUnifiedConsentToServer(saveAnalyticsConsent(analytics));
      const priorAnalytics = getUnifiedConsent()?.cookies;
      const user = userEvent.setup();
      const onComplete = vi.fn();
      const welcome = render(<TrialEmailForm onComplete={onComplete} />);
      expect(
        screen.getByRole('link', { name: t('welcome.quickStart.trial.termsLink') }),
      ).toHaveAttribute('href', '/terms');
      await user.type(
        screen.getByRole('textbox', { name: t('welcome.quickStart.trial.emailLabel') }),
        'student@example.com',
      );
      await user.click(
        screen.getByRole('checkbox', { name: t('welcome.quickStart.trial.tosLabel') }),
      );
      await user.click(
        screen.getByRole('button', { name: t('welcome.quickStart.trial.startTrial') }),
      );
      expect(onComplete).toHaveBeenCalledOnce();
      expect(hasUnifiedConsent()).toBe(true);
      expect(hasAnalyticsConsent()).toBe(false);
      expect(getUnifiedConsent()?.cookies.analytics).toBe(analytics);
      if (priorAnalytics) expect(getUnifiedConsent()?.cookies).toEqual(priorAnalytics);
      expect(document.cookie).toContain(`${TRIAL_CONSENT_COOKIE}=`);
      const persisted = getUnifiedConsent();

      welcome.unmount();
      resetConsentSnapshot();
      render(
        <UnifiedConsentWall>
          <main data-testid="study" />
        </UnifiedConsentWall>,
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByTestId('study')).toBeInTheDocument();
      expect(getUnifiedConsent()).toEqual(persisted);
    },
  );

  it.each([
    ['consent.unified.buttons.acceptAll', true],
    ['consent.unified.buttons.rejectAll', false],
  ] as const)(
    'banner cookie action %s is not terms evidence on reload',
    async (label, analytics) => {
      const user = userEvent.setup();
      const view = render(
        <UnifiedConsentWall>
          <main data-testid="study" />
        </UnifiedConsentWall>,
      );
      await user.click(await screen.findByRole('button', { name: t(label) }));
      await waitFor(() => expect(getConsentSyncSnapshot().pending).toEqual([]));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(getUnifiedConsent()?.tos.accepted).toBeNull();
      expect(getUnifiedConsent()?.cookies.analytics).toBe(analytics);
      expect(hasUnifiedConsent()).toBe(false);
      expect(hasAnalyticsConsent()).toBe(false);
      expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/tos', expect.anything());

      view.unmount();
      resetConsentSnapshot();
      render(
        <UnifiedConsentWall>
          <main data-testid="study" />
        </UnifiedConsentWall>,
      );
      expect(await screen.findByRole('button', { name: t(label) })).toBeInTheDocument();
      expect(hasUnifiedConsent()).toBe(false);
    },
  );

  it('inline optional refusal never grants mandatory terms', async () => {
    const user = userEvent.setup();
    render(<InlineConsent />);
    const optional = screen.getByRole('checkbox', { name: t('consent.inline.analyticsLabel') });
    expect(optional).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: t('consent.inline.submitButton') }));
    await waitFor(() => expect(getUnifiedConsent()?.cookies.analytics).toBe(false));
    expect(hasUnifiedConsent()).toBe(false);
    expect(getUnifiedConsent()?.tos.accepted).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/tos', expect.anything());
  });

  it.each([null, false])('privacy analytics toggle cannot grant terms=%s', async (terms) => {
    if (terms !== null) saveTermsConsent(terms);
    saveAnalyticsConsent(false);
    const priorTerms = getUnifiedConsent()?.tos;
    const user = userEvent.setup();
    render(<PrivacySettings />);
    await user.click(screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') }));
    await waitFor(() => expect(getUnifiedConsent()?.pending).toBeUndefined());
    expect(getUnifiedConsent()?.cookies.analytics).toBe(true);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(getUnifiedConsent()?.tos).toEqual(priorTerms);
    expect(hasUnifiedConsent()).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/tos', expect.anything());
  });

  it.each([403, 'network'] as const)(
    'privacy caller keeps %s acceptance pending until retry',
    async (failure) => {
      const transport = vi.mocked(fetch).getMockImplementation();
      if (!transport) throw new Error('Missing HTTP fixture');
      vi.mocked(fetch).mockImplementation(async (input, init) => {
        if (input !== '/api/user/consent') return transport(input, init);
        if (failure === 'network') throw new TypeError('Offline');
        return Response.json({ error: 'Save rejected' }, { status: failure });
      });
      saveTermsConsent(true);
      saveAnalyticsConsent(false);
      const terms = getUnifiedConsent()?.tos;
      const user = userEvent.setup();
      render(<PrivacySettings />);
      await user.click(screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') }));
      await waitFor(() => expect(getConsentSyncSnapshot().status).toBe('error'));
      expect(hasAnalyticsConsent()).toBe(false);
      expect(hasUnifiedConsent()).toBe(true);
      expect(getUnifiedConsent()?.pending).toContain('analytics');
      expect(screen.getByRole('alert')).toHaveTextContent(t('consent.sync.failed'));
      vi.mocked(fetch).mockImplementation(transport);
      await user.click(screen.getByRole('button', { name: t('consent.sync.retry') }));
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(hasAnalyticsConsent()).toBe(false);
      expect(getUnifiedConsent()?.pending).toBeUndefined();
      expect(getUnifiedConsent()?.tos).toEqual(terms);
      expect(fetch).not.toHaveBeenCalledWith('/api/tos', expect.anything());
    },
  );
});
