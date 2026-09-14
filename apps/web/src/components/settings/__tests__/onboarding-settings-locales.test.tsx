import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { OnboardingSettings } from '../onboarding-settings';
import itMessages from '../../../../messages/it/settings.json';
import enMessages from '../../../../messages/en/settings.json';
import frMessages from '../../../../messages/fr/settings.json';
import deMessages from '../../../../messages/de/settings.json';
import esMessages from '../../../../messages/es/settings.json';

vi.unmock('next-intl');
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('Privacy view onboarding warning with real locale messages', () => {
  afterEach(cleanup);

  it.each([
    ['it', itMessages],
    ['en', enMessages],
    ['fr', frMessages],
    ['de', deMessages],
    ['es', esMessages],
  ] as const)(
    'renders closed and opens the warning without crashing in %s',
    async (locale, messages) => {
      const user = userEvent.setup();
      render(
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Rome">
          <OnboardingSettings />
        </NextIntlClientProvider>,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await user.click(
        screen.getByRole('button', {
          name: messages.settings.onboarding.resetComplete.button,
        }),
      );
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getAllByRole('listitem')).toHaveLength(4);
      expect(dialog).not.toHaveTextContent('settings.onboarding.confirmDialog');
      await user.click(
        within(dialog).getByRole('button', {
          name: messages.settings.onboarding.confirmDialog.buttons.cancel,
        }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );
});
