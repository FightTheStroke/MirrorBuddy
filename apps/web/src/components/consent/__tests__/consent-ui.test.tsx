import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { UnifiedConsentWall } from '../unified-consent-wall';
import { InlineConsent } from '../inline-consent';
import { PrivacySettings } from '@/components/settings/sections/privacy-settings';
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

describe('actual consent UI decisions and child identity', () => {
  beforeEach(() => {
    installConsentUITransport();
  });
  afterEach(() => {
    cleanup();
    resetConsentSnapshot();
    setConsentTestAccount(false);
    vi.restoreAllMocks();
  });

  it('defaults optional analytics off on both editable surfaces', async () => {
    render(
      <>
        <InlineConsent />
        <PrivacySettings />
      </>,
    );
    expect(
      screen.getByRole('checkbox', { name: t('consent.inline.analyticsLabel') }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') }),
    ).toHaveAttribute('aria-checked', 'false');
    await screen.findByText('vtest');
  });

  it('requires explicit terms independently of optional refusal', async () => {
    const user = userEvent.setup();
    render(
      <UnifiedConsentWall>
        <button>Study</button>
      </UnifiedConsentWall>,
    );
    await user.click(
      await screen.findByRole('button', {
        name: t('consent.unified.buttons.rejectAll'),
      }),
    );
    expect(hasUnifiedConsent()).toBe(false);
    expect(getUnifiedConsent()?.cookies.analytics).toBe(false);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const accept = screen.getByRole('button', { name: t('consent.terms.modal.buttons.accept') });
    expect(accept).toBeDisabled();
    await user.click(
      screen.getByRole('checkbox', { name: t('consent.unified.tosCheckbox.label') }),
    );
    await user.click(accept);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(hasUnifiedConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(fetch).not.toHaveBeenCalledWith('/api/tos', expect.anything());
  });

  it('terms acceptance alone does not opt into or record an analytics choice', async () => {
    const user = userEvent.setup();
    render(
      <UnifiedConsentWall>
        <main>Study</main>
      </UnifiedConsentWall>,
    );
    await user.click(
      await screen.findByRole('checkbox', {
        name: t('consent.unified.tosCheckbox.label'),
      }),
    );
    await user.click(screen.getByRole('button', { name: t('consent.terms.modal.buttons.accept') }));
    expect(getUnifiedConsent()?.cookies.analytics).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retains the same mounted stateful child across delayed consent GET completion', async () => {
    saveTermsConsent(true);
    setConsentTestAccount(true);
    const transport = vi.mocked(fetch).getMockImplementation()!;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/user/consent' && init?.method === 'GET') await held;
      return transport(input, init);
    });
    let mounts = 0;
    let unmounts = 0;
    function Child() {
      const [open, setOpen] = useState(false);
      useEffect(() => {
        mounts++;
        return () => {
          unmounts++;
        };
      }, []);
      return <button onClick={() => setOpen(true)}>{open ? 'Menu open' : 'Open menu'}</button>;
    }
    const user = userEvent.setup();
    render(
      <UnifiedConsentWall>
        <Child />
        <span>Provider sibling</span>
      </UnifiedConsentWall>,
    );
    const original = screen.getByText('Open menu');
    await user.click(original);
    expect(original).toHaveTextContent('Menu open');
    await act(async () => {
      release();
      await held;
    });
    await waitFor(() =>
      expect(sessionStorage.getItem('mirrorbuddy-consent-loaded')).toBe('account'),
    );
    expect(screen.getByText('Menu open')).toBe(original);
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
  });

  it('distinguishes an eligible account opt-in from immediate revocation', async () => {
    installConsentUITransport(true);
    saveTermsConsent(true);
    setConsentTestAccount(true);
    const user = userEvent.setup();
    render(<PrivacySettings />);
    const toggle = screen.getByRole('switch', { name: t('settings.privacy.toggleAnalytics') });
    await user.click(toggle);
    await waitFor(() => expect(hasAnalyticsConsent()).toBe(true));
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(hasUnifiedConsent()).toBe(true);
  });

  it('renders missing historic dates without inventing an acceptance', async () => {
    sessionStorage.setItem('tos_accepted', 'true');
    sessionStorage.setItem('tos_accepted_version', '1.0');
    render(<PrivacySettings />);
    expect(
      screen.getByText(t('consent.sync.dateUnavailable'), { exact: false }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(getUnifiedConsent()?.tos.acceptedAt).toBe('');
    await screen.findByText('vtest');
  });

  it('does not turn an invalid historic date into a displayed acceptance', async () => {
    const recorded = saveTermsConsent(true);
    localStorage.setItem(
      'mirrorbuddy-unified-consent',
      JSON.stringify({
        ...recorded,
        tos: { ...recorded.tos, acceptedAt: 'not-a-date' },
      }),
    );
    render(<PrivacySettings />);
    expect(screen.getByText(t('consent.sync.termsRequired'))).toBeInTheDocument();
    expect(screen.queryByText(t('consent.sync.termsAccepted'))).not.toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(getUnifiedConsent()?.tos.acceptedAt).toBe('');
    await screen.findByText('vtest');
  });
});
