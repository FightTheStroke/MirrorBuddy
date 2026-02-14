/**
 * Tests for LocalePreviewSelector component
 *
 * Admin-only component to preview the app in any locale without logout
 * Uses session storage to store preview locale preference
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalePreviewSelector } from '../locale-preview-selector';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      previewLabel: 'Preview Mode',
      resetButton: 'Reset',
    };
    return translations[key] || key;
  },
}));

// Mock useLocale hook
vi.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({
    locale: 'it',
    locales: ['it', 'en', 'fr', 'de', 'es'],
    localeNames: {
      it: 'Italiano',
      en: 'English',
      fr: 'Français',
      de: 'Deutsch',
      es: 'Español',
    },
    localeFlags: {
      it: '🇮🇹',
      en: '🇬🇧',
      fr: '🇫🇷',
      de: '🇩🇪',
      es: '🇪🇸',
    },
    switchLocale: vi.fn(),
  }),
}));

describe('LocalePreviewSelector', () => {
  beforeEach(() => {
    // Setup: ensure sessionStorage is available
    if (typeof sessionStorage === 'undefined') {
      const store: Record<string, string> = {};
      global.sessionStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          Object.keys(store).forEach((key) => {
            delete store[key];
          });
        },
      } as Storage;
    }
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a dropdown with all supported locales', () => {
    render(<LocalePreviewSelector />);

    const select = screen.getByRole('combobox', {
      name: /preview language|anteprima lingua/i,
    });
    expect(select).toBeInTheDocument();

    // Check that all locales are available as options
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5); // 5 locales
  });

  it('shows the current locale as selected by default', () => {
    render(<LocalePreviewSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('it'); // Default locale from mock
  });

  it('updates preview locale when user selects a different option', async () => {
    const user = userEvent.setup();
    render(<LocalePreviewSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Change to French
    await user.selectOptions(select, 'fr');

    // Session storage should be updated
    expect(sessionStorage.getItem('admin_preview_locale')).toBe('fr');
  });

  it('shows locale flag emoji next to locale names', () => {
    render(<LocalePreviewSelector />);

    // Check for flag emojis in the rendered output
    const select = screen.getByRole('combobox');
    const container = select.parentElement;
    expect(container?.textContent).toContain('🇮🇹'); // Italian flag
    expect(container?.textContent).toContain('🇬🇧'); // British flag
    expect(container?.textContent).toContain('🇫🇷'); // French flag
  });

  it('clears preview locale when returning to current locale', async () => {
    const user = userEvent.setup();

    // First, set a preview locale
    sessionStorage.setItem('admin_preview_locale', 'es');

    render(<LocalePreviewSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Switch back to current locale (it)
    await user.selectOptions(select, 'it');

    // Preview locale should be cleared
    expect(sessionStorage.getItem('admin_preview_locale')).toBeNull();
  });

  it('has a reset button to clear preview locale', async () => {
    const user = userEvent.setup();

    // Set a preview locale
    sessionStorage.setItem('admin_preview_locale', 'fr');

    render(<LocalePreviewSelector />);

    const resetButton = screen.getByRole('button', {
      name: /reset|clear/i,
    });

    await user.click(resetButton);

    // Preview locale should be cleared
    expect(sessionStorage.getItem('admin_preview_locale')).toBeNull();
  });

  it('displays a visual indicator when preview locale is active', () => {
    sessionStorage.setItem('admin_preview_locale', 'fr');

    render(<LocalePreviewSelector />);

    // Should show some indicator that we're in preview mode
    const indicator = screen.queryByText(/preview mode/i);
    expect(indicator).toBeInTheDocument();
  });

  it('includes an accessibility label for screen readers', () => {
    render(<LocalePreviewSelector />);

    const select = screen.getByRole('combobox', {
      name: /preview language/i,
    });
    expect(select).toBeInTheDocument();
  });

  it('dispatches custom event when preview locale changes', async () => {
    const user = userEvent.setup();
    const eventListener = vi.fn();

    window.addEventListener('admin_locale_preview_changed', eventListener as EventListener);

    render(<LocalePreviewSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    await user.selectOptions(select, 'de');

    expect(eventListener).toHaveBeenCalled();

    window.removeEventListener('admin_locale_preview_changed', eventListener as EventListener);
  });
});
