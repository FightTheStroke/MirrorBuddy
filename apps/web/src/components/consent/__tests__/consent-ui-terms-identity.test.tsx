import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AUTH_COOKIE_CLIENT } from '@/lib/auth';
import { getUnifiedConsent, hasUnifiedConsent } from '@/lib/consent/unified-consent-storage';
import { resetConsentSnapshot } from '@/lib/consent/consent-store';
import { setConsentTestAccount } from '@/lib/consent/__tests__/consent-test-transport';
import { TrialEmailForm } from '@/app/[locale]/welcome/components/trial-email-form';
import { UnifiedConsentWall } from '../unified-consent-wall';
import { installConsentUITransport } from './consent-ui-fixture';
import { getTranslation as t } from '@/test/i18n-helpers';

describe('superseded mandatory terms are not replayed for another identity', () => {
  beforeEach(() => {
    installConsentUITransport();
    setConsentTestAccount(true);
  });
  afterEach(() => {
    cleanup();
    resetConsentSnapshot();
    setConsentTestAccount(false);
    vi.restoreAllMocks();
  });

  it.each(['wall', 'welcome'] as const)(
    '%s requires a new unchecked terms action',
    async (surface) => {
      let release!: () => void;
      let requested!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const started = new Promise<void>((resolve) => {
        requested = resolve;
      });
      const transport = vi.mocked(fetch).getMockImplementation()!;
      let posts = 0;
      vi.mocked(fetch).mockImplementation(async (input, init) => {
        const response = await transport(input, init);
        if (input === '/api/tos' && init?.method === 'POST') {
          posts++;
          if (posts === 1) {
            requested();
            await held;
          }
        }
        return response;
      });
      const user = userEvent.setup();
      const complete = vi.fn();
      if (surface === 'wall') {
        render(
          <UnifiedConsentWall>
            <main>Study</main>
          </UnifiedConsentWall>,
        );
        await user.click(
          await screen.findByRole('checkbox', { name: t('consent.unified.tosCheckbox.label') }),
        );
        await user.click(
          screen.getByRole('button', { name: t('consent.terms.modal.buttons.accept') }),
        );
      } else {
        render(<TrialEmailForm onComplete={complete} />);
        await user.type(screen.getByRole('textbox'), 'student@example.com');
        await user.click(screen.getByRole('checkbox'));
        await user.click(
          screen.getByRole('button', { name: t('welcome.quickStart.trial.startTrial') }),
        );
      }
      await started;
      document.cookie = `${AUTH_COOKIE_CLIENT}=different-account; path=/`;
      await act(async () => {
        release();
        await held;
      });
      const fresh = within(await screen.findByTestId('consent-reanswer-terms'));
      expect(fresh.getByRole('checkbox')).not.toBeChecked();
      const accept = fresh.getByRole('button', { name: t('consent.terms.modal.buttons.accept') });
      expect(accept).toBeDisabled();
      expect(posts).toBe(1);
      expect(hasUnifiedConsent()).toBe(false);
      expect(complete).not.toHaveBeenCalled();
      await user.click(fresh.getByRole('checkbox'));
      await user.click(accept);
      await waitFor(() => expect(getUnifiedConsent()?.pending).toBeUndefined());
      expect(posts).toBe(2);
      expect(hasUnifiedConsent()).toBe(true);
      expect(getUnifiedConsent()?.cookies.analytics).toBeNull();
      if (surface === 'welcome') expect(complete).toHaveBeenCalledOnce();
    },
  );
});
