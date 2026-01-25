import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, defaultLocale } from "./config";
import type { Locale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the request (next-intl 4.x API)
  let locale = await requestLocale;

  // Fallback to default locale if not provided
  if (!locale) {
    locale = defaultLocale;
  }

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
