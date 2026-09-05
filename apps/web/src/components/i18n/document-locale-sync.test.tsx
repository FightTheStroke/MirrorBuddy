/**
 * Document language must follow soft locale navigation (R4).
 *
 * The root layout renders <html lang> once per full document load. App Router
 * keeps that layout mounted across client-side navigations, so moving from
 * /it/welcome to /fr/welcome updates the URL and the content while the document
 * language stays stale. Assistive technology then pronounces the new language
 * with the previous language rules.
 */

import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { locales } from '@/i18n/config';
import { DocumentLocaleSync } from './document-locale-sync';

const mockUsePathname = vi.fn<() => string | null>();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('DocumentLocaleSync', () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    document.documentElement.lang = 'it';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders no markup so it cannot alter layout or CSP-managed scripts', () => {
    mockUsePathname.mockReturnValue('/it/welcome');

    const { container } = render(<DocumentLocaleSync />);

    expect(container.innerHTML).toBe('');
  });

  it.each(locales)('adopts the "%s" locale prefix on first render', (locale) => {
    document.documentElement.lang = '';
    mockUsePathname.mockReturnValue(`/${locale}/welcome`);

    render(<DocumentLocaleSync />);

    expect(document.documentElement.lang).toBe(locale);
  });

  it.each(locales.filter((locale) => locale !== 'it'))(
    'follows a soft navigation from Italian to "%s" without a reload',
    (locale) => {
      mockUsePathname.mockReturnValue('/it/welcome');
      const { rerender } = render(<DocumentLocaleSync />);
      expect(document.documentElement.lang).toBe('it');

      // Soft navigation: same document, new pathname, no remount of the root layout.
      mockUsePathname.mockReturnValue(`/${locale}/welcome`);
      rerender(<DocumentLocaleSync />);

      expect(document.documentElement.lang).toBe(locale);
    },
  );

  it('follows repeated soft navigations between two non-default locales', () => {
    mockUsePathname.mockReturnValue('/fr/welcome');
    const { rerender } = render(<DocumentLocaleSync />);
    expect(document.documentElement.lang).toBe('fr');

    mockUsePathname.mockReturnValue('/de/astuccio');
    rerender(<DocumentLocaleSync />);
    expect(document.documentElement.lang).toBe('de');

    mockUsePathname.mockReturnValue('/es/');
    rerender(<DocumentLocaleSync />);
    expect(document.documentElement.lang).toBe('es');
  });

  it('ignores query strings and hashes in the pathname', () => {
    mockUsePathname.mockReturnValue('/en/welcome?from=it#main');

    render(<DocumentLocaleSync />);

    expect(document.documentElement.lang).toBe('en');
  });

  it('preserves the server-rendered language when the path has no locale prefix', () => {
    document.documentElement.lang = 'de';
    mockUsePathname.mockReturnValue('/api/health');

    render(<DocumentLocaleSync />);

    expect(document.documentElement.lang).toBe('de');
  });

  it('preserves the server-rendered language for an unsupported prefix', () => {
    document.documentElement.lang = 'fr';
    mockUsePathname.mockReturnValue('/ja/welcome');

    render(<DocumentLocaleSync />);

    expect(document.documentElement.lang).toBe('fr');
  });

  it('preserves the server-rendered language when the pathname is unavailable', () => {
    document.documentElement.lang = 'es';
    mockUsePathname.mockReturnValue(null);

    render(<DocumentLocaleSync />);

    expect(document.documentElement.lang).toBe('es');
  });

  it('does not rewrite the attribute when it already matches', () => {
    mockUsePathname.mockReturnValue('/it/welcome');
    const setAttribute = vi.spyOn(document.documentElement, 'setAttribute');

    render(<DocumentLocaleSync />);

    expect(setAttribute).not.toHaveBeenCalledWith('lang', expect.anything());
    setAttribute.mockRestore();
  });
});

describe('Providers wiring', () => {
  const providersSource = readFileSync(
    join(process.cwd(), 'apps/web/src/components/providers.tsx'),
    'utf-8',
  );

  it('imports the document locale sync component', () => {
    expect(providersSource).toContain('DocumentLocaleSync');
    expect(providersSource).toMatch(/from '@\/components\/i18n\/document-locale-sync'/);
  });

  it('mounts it outside the consent gate so it runs on every route', () => {
    const mountIndex = providersSource.indexOf('<DocumentLocaleSync />');
    const consentIndex = providersSource.indexOf('<ConditionalUnifiedConsent>');

    expect(mountIndex).toBeGreaterThan(-1);
    expect(consentIndex).toBeGreaterThan(-1);
    expect(mountIndex).toBeLessThan(consentIndex);
  });

  it('keeps the CSP nonce plumbed into the theme provider', () => {
    expect(providersSource).toContain('nonce={nonce}');
  });
});
