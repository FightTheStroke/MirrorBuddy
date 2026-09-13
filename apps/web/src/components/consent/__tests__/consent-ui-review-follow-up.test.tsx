import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as consentStorage from '@/lib/consent/unified-consent-storage';
import { getConsentSyncSnapshot, resetConsentSnapshot } from '@/lib/consent/consent-store';
import { ConsentSyncError } from '@/lib/consent/unified-consent';
import { setConsentTestAccount } from '@/lib/consent/__tests__/consent-test-transport';
import { PrivacyConsentSettings } from '@/components/settings/sections/privacy-consent-settings';
import { ConsentFeedback } from '../consent-feedback';
import { ConsentReanswer } from '../consent-reanswer';
import { installConsentUITransport } from './consent-ui-fixture';
import { getTranslation as t } from '@/test/i18n-helpers';

const originalURL = window.location.href;

describe('review fixes for consent follow-up and external choices', () => {
  beforeEach(() => {
    installConsentUITransport();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', originalURL);
    resetConsentSnapshot();
    setConsentTestAccount(false);
    vi.restoreAllMocks();
  });

  it('reports reload failure after successful local clearing, without offering save retry', async () => {
    consentStorage.saveTermsConsent(true);
    const clear = vi.spyOn(consentStorage, 'clearUnifiedConsent');
    const reload = vi.fn(() => {
      throw new Error('Navigation unavailable');
    });
    vi.stubGlobal(
      'window',
      new Proxy(window, {
        get(target, key, receiver) {
          return key === 'location'
            ? { reload, href: target.location.href }
            : Reflect.get(target, key, receiver);
        },
      }),
    );
    const user = userEvent.setup();
    render(<PrivacyConsentSettings />);
    await user.click(
      screen.getByRole('button', {
        name: t('settings.privacy.reviewAndModifyConsents'),
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(t('consent.sync.reloadFailed'));
    expect(consentStorage.getUnifiedConsent()).toBeNull();
    expect(clear).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: t('consent.sync.retry') })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('consent.sync.reload') })).toHaveAttribute(
      'href',
      window.location.href,
    );
  });

  it('offers actionable reload, not a nonexistent fresh-choice form, for invalid intent', () => {
    window.history.replaceState(null, '', '#consent');
    render(
      <ConsentFeedback
        snapshot={getConsentSyncSnapshot()}
        busy={false}
        failure={new ConsentSyncError('invalid-intent')}
        retry={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(t('consent.sync.cannotRetry'));
    expect(screen.getByRole('link', { name: t('consent.sync.reload') })).toHaveAttribute(
      'href',
      window.location.href.split('#')[0],
    );
    expect(screen.queryByText(t('consent.sync.changed'))).not.toBeInTheDocument();
  });

  it('does not offer reload instead of the explicit supersession re-answer form', () => {
    render(
      <>
        <ConsentReanswer purpose="analytics" busy={false} onSave={vi.fn()} />
        <ConsentFeedback
          snapshot={getConsentSyncSnapshot()}
          busy={false}
          failure={new ConsentSyncError('superseded')}
          retry={vi.fn()}
          requiresNewDecision
        />
      </>,
    );
    expect(screen.getByTestId('consent-reanswer-analytics')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(t('consent.sync.changed'));
    expect(screen.queryByRole('link', { name: t('consent.sync.reload') })).not.toBeInTheDocument();
  });

  it.each([false, true])(
    'refreshes cross-tab choice %s and date even while permission stays off',
    async (analytics) => {
      consentStorage.saveTermsConsent(true);
      const intent = consentStorage.saveAnalyticsConsent(!analytics);
      await consentStorage.syncUnifiedConsentToServer(intent);
      render(<PrivacyConsentSettings />);
      const toggle = screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') });
      await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', String(!analytics)));
      const before = getConsentSyncSnapshot();
      const stored = consentStorage.getUnifiedConsent();
      if (!stored) throw new Error('Missing original consent');
      const acceptedAt = '2025-05-06T12:00:00.000Z';
      const next = JSON.stringify({
        ...stored,
        cookies: { ...stored.cookies, analytics, acceptedAt },
      });
      await act(async () => {
        localStorage.setItem('mirrorbuddy-unified-consent', next);
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'mirrorbuddy-unified-consent',
            newValue: next,
          }),
        );
      });
      expect(getConsentSyncSnapshot()).toBe(before);
      expect(toggle).toHaveAttribute('aria-checked', String(analytics));
      const date = new Intl.DateTimeFormat('it', { dateStyle: 'long' }).format(
        new Date(acceptedAt),
      );
      expect(screen.getByText(`${t('consent.sync.decisionDate')} ${date}`)).toBeInTheDocument();
      expect(screen.getByText(t('consent.sync.collectionOff'))).toBeInTheDocument();
      expect(consentStorage.hasAnalyticsConsent()).toBe(false);
    },
  );
});
