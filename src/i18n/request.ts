import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./config";
import type { Locale } from "./config";

// Namespace files to load (ADR 0082)
const NAMESPACES = [
  "common",
  "auth",
  "admin",
  "chat",
  "tools",
  "settings",
  "compliance",
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

  // Merge all namespace data into single messages object
  // Each namespace file contains original top-level keys that map to that namespace
  const messages: Record<string, unknown> = {};
  for (const nsData of namespaceResults) {
    Object.assign(messages, nsData);
  }

  return {
    locale,
    messages,
  };
});
