import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { userEvent } from '@testing-library/user-event';
import * as consentStorage from '@/lib/consent/unified-consent-storage';
import { resetConsentSnapshot } from '@/lib/consent/consent-store';
import { AUTH_COOKIE_CLIENT } from '@/lib/auth';
import { setConsentTestAccount } from '@/lib/consent/__tests__/consent-test-transport';
import { PrivacyConsentSettings } from '@/components/settings/sections/privacy-consent-settings';
import { UnifiedConsentWall } from '../unified-consent-wall';
import { InlineConsent } from '../inline-consent';
import { installConsentUITransport } from './consent-ui-fixture';
import { getTranslation as t } from '@/test/i18n-helpers';

describe('UI recovery at consent identity boundaries', () => {
  beforeEach(() => {
    installConsentUITransport(true);
  });
  afterEach(() => {
    cleanup();
    resetConsentSnapshot();
    setConsentTestAccount(false);
    vi.restoreAllMocks();
  });

  it('does not invoke the identity-observing permission getter during server render', async () => {
    const getter = vi.spyOn(consentStorage, 'hasAnalyticsConsent');
    renderToString(<PrivacyConsentSettings />);
    expect(getter).not.toHaveBeenCalled();
    render(<PrivacyConsentSettings />);
    await waitFor(() => expect(getter).toHaveBeenCalled());
  });

  it.each(['privacy', 'inline', 'wall'] as const)(
    '%s requires a fresh default-off answer after an old account opt-in is superseded',
    async (surface) => {
      if (surface !== 'wall') consentStorage.saveTermsConsent(true);
      setConsentTestAccount(true);
      let release!: () => void;
      let requested!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const started = new Promise<void>((resolve) => {
        requested = resolve;
      });
      const transport = vi.mocked(fetch).getMockImplementation()!;
      const bodies: string[] = [];
      vi.mocked(fetch).mockImplementation(async (input, init) => {
        const response = await transport(input, init);
        if (input === '/api/user/consent' && init?.method === 'POST') {
          bodies.push(String(init.body));
          if (bodies.length === 1) {
            requested();
            await held;
          }
        }
        return response;
      });
      const user = userEvent.setup();
      if (surface === 'privacy') {
        render(<PrivacyConsentSettings />);
        await user.click(
          screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') }),
        );
      } else if (surface === 'inline') {
        render(<InlineConsent />);
        await user.click(
          screen.getByRole('checkbox', { name: t('consent.inline.analyticsLabel') }),
        );
        await user.click(screen.getByRole('button', { name: t('consent.inline.submitButton') }));
      } else {
        render(
          <UnifiedConsentWall>
            <main>Study</main>
          </UnifiedConsentWall>,
        );
        await user.click(
          await screen.findByRole('button', { name: t('consent.unified.buttons.acceptAll') }),
        );
      }
      await started;
      document.cookie = `${AUTH_COOKIE_CLIENT}=different-account; path=/`;
      await act(async () => {
        release();
        await held;
      });
      const form = within(await screen.findByTestId('consent-reanswer-analytics'));
      expect(
        screen.queryByRole('button', { name: t('consent.sync.retry') }),
      ).not.toBeInTheDocument();
      expect(form.getByRole('checkbox')).not.toBeChecked();
      expect(bodies).toHaveLength(1);
      expect(consentStorage.hasAnalyticsConsent()).toBe(false);
      await user.click(form.getByRole('button', { name: t('consent.sync.saveNewChoice') }));
      await waitFor(() => expect(consentStorage.getUnifiedConsent()?.pending).toBeUndefined());
      expect(bodies).toHaveLength(2);
      expect(JSON.parse(bodies[1])).toMatchObject({ analytics: false });
      expect(consentStorage.getUnifiedConsent()?.cookies.analytics).toBe(false);
      expect(consentStorage.hasAnalyticsConsent()).toBe(false);
    },
  );

  it('shows a malformed client hint as a recoverable initialization error, not a guest grant', async () => {
    consentStorage.saveTermsConsent(true);
    document.cookie = `${AUTH_COOKIE_CLIENT}=%; path=/`;
    const user = userEvent.setup();
    render(
      <UnifiedConsentWall>
        <button>Study</button>
      </UnifiedConsentWall>,
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(consentStorage.hasUnifiedConsent()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    setConsentTestAccount(false);
    await user.click(screen.getByRole('button', { name: t('consent.sync.retry') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(consentStorage.hasUnifiedConsent()).toBe(true);
    expect(consentStorage.hasAnalyticsConsent()).toBe(false);
  });

  it('replaces a retryable transport failure with fresh-choice recovery after identity changes', async () => {
    consentStorage.saveTermsConsent(true);
    setConsentTestAccount(true);
    const transport = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/user/consent') throw new TypeError('Offline');
      return transport(input, init);
    });
    const user = userEvent.setup();
    render(<PrivacyConsentSettings />);
    await user.click(screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(t('consent.sync.failed'));
    document.cookie = `${AUTH_COOKIE_CLIENT}=different-account; path=/`;
    vi.mocked(fetch).mockImplementation(transport);
    await user.click(screen.getByRole('button', { name: t('consent.sync.retry') }));
    expect(await screen.findByTestId('consent-reanswer-analytics')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('consent.sync.retry') })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(t('consent.sync.changed'));
  });
});
