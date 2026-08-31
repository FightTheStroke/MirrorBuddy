import { getRequestConfig } from 'next-intl/server';
import { logger } from '@/lib/logger';
import { locales, defaultLocale } from './config';
import type { Locale } from './config';

// Namespace files to load (ADR 0082)
const NAMESPACES = [
  'common',
  'auth',
  'admin',
  'chat',
  'home',
  'tools',
  'settings',
  'compliance',
  'consent',
  'education',
  'navigation',
  'errors',
  'welcome',
  'metadata',
  'pricing',
  'marketing',
  'achievements',
  'maintenance',
  'voice',
  'analytics',
  'waitlist',
  'pro',
  'research',
  'email',
  'loading',
  'safetyBlock',
] as const;

async function loadNamespace(locale: string, namespace: string): Promise<Record<string, unknown>> {
  try {
    // W2 app move (#362): messages/ relocated to apps/web/messages/.
    return (await import(`../../messages/${locale}/${namespace}.json`)).default;
  } catch (primaryError) {
    // Fallback to Italian if namespace missing
    try {
      return (await import(`../../messages/it/${namespace}.json`)).default;
    } catch (fallbackError) {
      // Both loads failed: this namespace resolves to {} and every
      // useTranslations(namespace) call downstream will throw
      // INSUFFICIENT_PATH. Without this log the only visible symptom is
      // that opaque error, with no indication of which namespace or why.
      logger.error('i18n namespace failed to load (locale + it fallback both failed)', {
        component: 'i18nRequestConfig',
        operation: 'loadNamespace',
        locale,
        namespace,
        primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
        fallbackError:
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      return {};
    }
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the request (next-intl 4.x API)
  let locale = await requestLocale;

  // Fallback to default locale if not provided or if it's an invalid locale
  // This handles routes outside [locale] directory (e.g., /admin, /archivio)
  // which may have path segments that look like locales but aren't
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Load all namespaces with individual failure isolation
  // Use Promise.allSettled to prevent a single namespace timeout from crashing
  // the entire page on Vercel serverless cold starts
  const namespaceResults = await Promise.allSettled(
    NAMESPACES.map((ns) => loadNamespace(locale!, ns)),
  );

  // Scope each namespace file under its namespace key
  // This eliminates cross-file collisions (compliance, tools, parentDashboard, navigation)
  // UNWRAP: JSON files have wrapper key matching filename, we need the inner content
  const messages: Record<string, unknown> = {};
  for (let i = 0; i < namespaceResults.length; i++) {
    const ns = NAMESPACES[i];
    const result = namespaceResults[i];
    const nsData = result.status === 'fulfilled' ? result.value : {};
    // If JSON has wrapper key matching namespace, unwrap it
    // e.g., compliance.json: { "compliance": {...} } -> use {...}
    messages[ns] = (nsData as Record<string, unknown>)[ns] || nsData;
  }

  return {
    locale,
    messages,
  };
});
