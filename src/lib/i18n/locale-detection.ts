import { locales, defaultLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

/**
 * Type guard to check if a value is a valid locale
 */
export function isValidLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

/**
 * Parse Accept-Language header and return the most preferred supported locale
 * Respects quality weights (q parameter) in the header
 *
 * Examples:
 * - "en" → "en"
 * - "en-US" → "en"
 * - "it,en;q=0.9" → "it"
 * - "fr;q=0.8,en;q=0.9" → "en"
 * - "ja,ko;q=0.9" → "it" (falls back to default)
 *
 * @param header Accept-Language header value
 * @returns Supported locale or default locale
 */
export function parseAcceptLanguageHeader(
  header: string | null | undefined,
): Locale {
  if (!header || typeof header !== "string") {
    return defaultLocale;
  }

  try {
    // Split by comma to get language preferences
    const preferences = header
      .split(",")
      .map((pref) => {
        const parts = pref.trim().split(";");
        const language = parts[0].toLowerCase().split("-")[0]; // Get base language code
        const quality = parseFloat(
          parts.find((p) => p.startsWith("q="))?.substring(2) || "1",
        );

        return { language, quality: isNaN(quality) ? 0 : quality };
      })
      .filter((pref) => pref.quality > 0)
      .sort((a, b) => b.quality - a.quality);

    // Find first preference that matches supported locales
    for (const pref of preferences) {
      if (isValidLocale(pref.language)) {
        return pref.language;
      }
    }

    // No match found, use default
    return defaultLocale;
  } catch {
    return defaultLocale;
  }
}

/**
 * Extract NEXT_LOCALE cookie value from cookie header string
 *
 * Examples:
 * - "NEXT_LOCALE=en; Path=/" → "en"
 * - "sessionId=abc; NEXT_LOCALE=fr" → "fr"
 * - "sessionId=abc" → null
 *
 * @param cookieHeader Cookie header string (usually from request.headers.get('cookie'))
 * @returns Locale value from cookie or null if not found/invalid
 */
export function getLocaleFromCookie(
  cookieHeader: string | null | undefined,
): Locale | null {
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return null;
  }

  try {
    // Find NEXT_LOCALE cookie
    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [key, value] = cookie.split("=").map((s) => s.trim());
      if (key === "NEXT_LOCALE" && value) {
        if (isValidLocale(value)) {
          return value;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract locale from URL path prefix (e.g., /en/dashboard → 'en')
 *
 * Examples:
 * - "/en/dashboard" → "en"
 * - "/it/chat" → "it"
 * - "/dashboard" → null
 * - "/ja/page" → null (invalid locale)
 * - "/" → null
 *
 * @param pathname URL pathname
 * @returns Locale from URL prefix or null
 */
export function extractLocaleFromUrl(pathname: string): Locale | null {
  if (!pathname || typeof pathname !== "string") {
    return null;
  }

  try {
    // Remove query and hash
    const cleanPath = pathname.split("?")[0].split("#")[0];

    // Extract first segment after /
    const segments = cleanPath.split("/").filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    const potentialLocale = segments[0].toLowerCase();
    if (isValidLocale(potentialLocale)) {
      return potentialLocale;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect locale from request headers following priority chain:
 * 1. NEXT_LOCALE cookie (highest priority)
 * 2. Accept-Language header
 * 3. Default locale (fallback)
 *
 * This implements the middleware locale detection strategy documented in middleware.ts
 *
 * @param options Object containing cookie and Accept-Language headers
 * @returns Detected locale
 */
export function detectLocaleFromRequest(options: {
  cookieHeader?: string | null;
  acceptLanguageHeader?: string | null;
}): Locale {
  // Priority 1: NEXT_LOCALE cookie
  if (options.cookieHeader) {
    const cookieLocale = getLocaleFromCookie(options.cookieHeader);
    if (cookieLocale) {
      return cookieLocale;
    }
  }

  // Priority 2: Accept-Language header
  if (options.acceptLanguageHeader) {
    const parsedLocale = parseAcceptLanguageHeader(
      options.acceptLanguageHeader,
    );
    if (
      parsedLocale !== defaultLocale ||
      isValidLocale(options.acceptLanguageHeader)
    ) {
      // Return parsed locale if it found something or if the raw header is already valid
      return parsedLocale;
    }
  }

  // Priority 3: Default locale
  return defaultLocale;
}

/**
 * Extract locale from Next.js request object (convenience helper)
 * Use this in API routes that have access to NextRequest
 *
 * @param request Next.js NextRequest object
 * @returns Detected locale
 */
export function detectLocaleFromNextRequest(request: {
  headers: {
    get: (key: string) => string | null;
  };
}): Locale {
  return detectLocaleFromRequest({
    cookieHeader: request.headers.get("cookie"),
    acceptLanguageHeader: request.headers.get("accept-language"),
  });
}
