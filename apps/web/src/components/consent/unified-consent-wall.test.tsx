import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { UnifiedConsentWall } from './unified-consent-wall';
import { installConsentUITransport } from './__tests__/consent-ui-fixture';
import { setConsentTestAccount } from '@/lib/consent/__tests__/consent-test-transport';
import { resetConsentSnapshot } from '@/lib/consent/consent-store';
import { getTranslation as t } from '@/test/i18n-helpers';

describe('consent dialog uses real modal infrastructure', () => {
  beforeEach(() => {
    installConsentUITransport();
  });
  afterEach(() => {
    cleanup();
    resetConsentSnapshot();
    setConsentTestAccount(false);
    vi.restoreAllMocks();
  });

  it('has an accessible name and reachable reading preferences during loading', async () => {
    setConsentTestAccount(true);
    const transport = vi.mocked(fetch).getMockImplementation()!;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (input === '/api/tos') await held;
      return transport(input, init);
    });
    render(
      <UnifiedConsentWall>
        <main>Study</main>
      </UnifiedConsentWall>,
    );
    expect(screen.getByRole('dialog', { name: t('consent.unified.loading') })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t('settings.accessibility.panelTitle') }),
    ).toBeEnabled();
    await act(async () => {
      release();
      await held;
    });
    await screen.findByRole('checkbox', { name: t('consent.unified.tosCheckbox.label') });
  });

  it('keeps the bottom panel scrollable and excludes background controls', async () => {
    const view = render(
      <UnifiedConsentWall>
        <button>Background</button>
      </UnifiedConsentWall>,
    );
    const panel = await screen.findByTestId('consent-banner');
    expect(panel).toHaveClass('bottom-0', 'overflow-y-auto', 'max-h-[90dvh]');
    expect(view.container).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: 'Background' })).not.toBeInTheDocument();
  });

  it('locks essential cookies and starts optional analytics off', async () => {
    render(
      <UnifiedConsentWall>
        <main>Study</main>
      </UnifiedConsentWall>,
    );
    const essential = await screen.findByRole('switch', {
      name: t('consent.unified.categories.essential'),
    });
    expect(essential).toBeDisabled();
    expect(essential).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('switch', { name: t('consent.unified.categories.analytics') }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('contains keyboard focus and cannot dismiss mandatory terms with Escape', async () => {
    const user = userEvent.setup();
    render(
      <UnifiedConsentWall>
        <button>Background</button>
      </UnifiedConsentWall>,
    );
    const panel = await screen.findByRole('dialog', { name: t('consent.unified.titleWelcome') });
    await waitFor(() => expect(panel).toContainElement(document.activeElement as HTMLElement));
    for (let index = 0; index < 18; index++) {
      await user.tab({ shift: index > 9 });
      expect(panel).toContainElement(document.activeElement as HTMLElement);
    }
    await user.keyboard('{Escape}');
    expect(panel).toBeInTheDocument();
  });

  it('nests existing accessibility controls and restores focus to their opener', async () => {
    const user = userEvent.setup();
    render(
      <UnifiedConsentWall>
        <main>Study</main>
      </UnifiedConsentWall>,
    );
    const trigger = screen.getByRole('button', { name: t('settings.accessibility.panelTitle') });
    await user.click(trigger);
    const preferences = screen.getByRole('dialog', {
      name: t('settings.accessibility.panelTitle'),
    });
    expect(
      within(preferences).getByRole('button', { name: t('settings.accessibility.closeSettings') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: t('consent.unified.tosCheckbox.label') }),
    ).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(preferences).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('restores prior focus after mandatory terms acceptance', async () => {
    const user = userEvent.setup();
    render(<button>Previous</button>);
    const previous = screen.getByRole('button', { name: 'Previous' });
    previous.focus();
    render(
      <UnifiedConsentWall>
        <main>Study</main>
      </UnifiedConsentWall>,
    );
    await user.click(
      await screen.findByRole('checkbox', { name: t('consent.unified.tosCheckbox.label') }),
    );
    await user.click(screen.getByRole('button', { name: t('consent.terms.modal.buttons.accept') }));
    await waitFor(() => expect(previous).toHaveFocus());
  });
});
