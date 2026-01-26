import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./config";
import type { Locale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the request (next-intl 4.x API)
  let locale = await requestLocale;

  // Fallback to default locale if not provided or if it's an invalid locale
  // This handles routes outside [locale] directory (e.g., /admin, /archivio)
  // which may have path segments that look like locales but aren't
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
