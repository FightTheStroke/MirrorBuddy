'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { extractLocaleFromUrl } from '@/lib/i18n/locale-detection';

/**
 * Keeps `document.documentElement.lang` aligned with the active locale route.
 *
 * The `<html lang>` attribute is produced by the root layout, which App Router
 * renders once per document and then keeps mounted across client-side
 * navigations. A soft navigation across locales (for example the welcome
 * language switcher calling `router.push('/welcome', { locale })`) therefore
 * swaps URL and content while the document language stays on the previous
 * locale, so screen readers keep applying the old pronunciation rules and
 * `document.documentElement.lang` consumers read a stale value.
 *
 * Mounted once in `Providers`, above the consent gate, so it covers every route
 * of both the localized and the unprefixed trees. It renders nothing and adds no
 * inline script, leaving CSP nonce handling untouched. When the pathname carries
 * no supported locale prefix the server-rendered value is left alone.
 */
export function DocumentLocaleSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const locale = extractLocaleFromUrl(pathname ?? '');
    if (!locale) return;
    if (document.documentElement.lang === locale) return;

    document.documentElement.lang = locale;
  }, [pathname]);

  return null;
}
