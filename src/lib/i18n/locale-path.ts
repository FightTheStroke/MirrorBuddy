import { defaultLocale, locales } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

export function getLocaleFromPath(pathname: string): Locale {
  const cleanPath = pathname.split("?")[0].split("#")[0];
  const segments = cleanPath.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (maybeLocale && locales.includes(maybeLocale as Locale)) {
    return maybeLocale as Locale;
  }
  return defaultLocale;
}

export function withLocalePath(pathname: string, locale: Locale): string {
  const cleanPath = pathname.split("?")[0].split("#")[0];
  if (!cleanPath.startsWith("/")) {
    return `/${locale}/${cleanPath}`;
  }
  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return `/${locale}`;
  }
  if (locales.includes(segments[0] as Locale)) {
    segments[0] = locale;
    return `/${segments.join("/")}`;
  }
  return `/${locale}${cleanPath}`;
}
