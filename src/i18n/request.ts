import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./config";
import type { Locale } from "./config";

// Namespace files to load (ADR 0082)
const NAMESPACES = [
  "common",
  "auth",
  "admin",
  "chat",
  "home",
  "tools",
  "settings",
  "compliance",
  "consent",
  "education",
  "navigation",
  "errors",
  "welcome",
  "metadata",
] as const;

async function loadNamespace(
  locale: string,
  namespace: string,
): Promise<Record<string, unknown>> {
  try {
    return (await import(`../../messages/${locale}/${namespace}.json`)).default;
  } catch {
    // Fallback to Italian if namespace missing
    try {
      return (await import(`../../messages/it/${namespace}.json`)).default;
    } catch {
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

  // Load all namespaces and merge into single messages object
  const namespacePromises = NAMESPACES.map(async (ns) => {
    const data = await loadNamespace(locale!, ns);
    return data;
  });

  const namespaceResults = await Promise.all(namespacePromises);

  // Scope each namespace file under its namespace key
  // This eliminates cross-file collisions (compliance, tools, parentDashboard, navigation)
  // UNWRAP: JSON files have wrapper key matching filename, we need the inner content
  const messages: Record<string, unknown> = {};
  for (let i = 0; i < namespaceResults.length; i++) {
    const ns = NAMESPACES[i];
    const nsData = namespaceResults[i];
    // If JSON has wrapper key matching namespace, unwrap it
    // e.g., compliance.json: { "compliance": {...} } -> use {...}
    messages[ns] = (nsData as Record<string, unknown>)[ns] || nsData;
  }

  return {
    locale,
    messages,
  };
});
