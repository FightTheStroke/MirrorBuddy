import createMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";
import { NextRequest } from "next/server";

/**
 * Internationalization Proxy (Next.js 16+)
 *
 * F-63: i18n can be enabled/disabled per environment
 *
 * NOTE: In Next.js 16, middleware.ts was renamed to proxy.ts to clarify
 * the network boundary. This file runs on Node.js runtime (not Edge).
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * Handles locale detection and routing with the following priority:
 * 1. User preference (from NEXT_LOCALE cookie)
 * 2. Browser Accept-Language header
 * 3. Default locale (it)
 *
 * Supported locales: it, en, fr, de, es
 *
 * The proxy automatically:
 * - Detects user's preferred language from Accept-Language header
 * - Stores user's locale preference in NEXT_LOCALE cookie
 * - Redirects to localized URLs (e.g., /en/home, /it/chat)
 * - Provides locale information to all pages via next-intl
 *
 * Feature Flag (FEATURE_I18N_ENABLED):
 * - true: Apply full locale routing and detection
 * - false: Pass through without i18n proxy (default to single language)
 */

// Routing configuration for next-intl
// Inlined to avoid potential file tracing issues
const routing = defineRouting({
  locales: ["it", "en", "fr", "de", "es"],
  defaultLocale: "it",
  localePrefix: "always",
  pathnames: {},
});

const intlMiddleware = createMiddleware(routing);

/**
 * Check if i18n feature is enabled
 */
function isI18nEnabled(): boolean {
  const envValue = process.env.FEATURE_I18N_ENABLED;
  if (envValue === undefined) return true;
  const normalized = envValue.toLowerCase().trim();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Proxy function for Next.js 16+
 * Conditionally applies i18n routing based on feature flag
 */
export default function proxy(request: NextRequest) {
  // Check if i18n is enabled via environment variable
  if (!isI18nEnabled()) {
    // If i18n is disabled, skip the proxy and let request pass through
    return undefined;
  }

  // Apply i18n middleware if enabled
  return intlMiddleware(request);
}

/**
 * Matcher configuration for Next.js proxy
 *
 * This proxy runs on all routes EXCEPT:
 * - API routes (/api/*)
 * - Static files (_next/static/*)
 * - Internal Next.js routes (_next/*)
 * - Monitoring routes (/monitoring)
 * - Public assets that don't need localization
 */
export const config = {
  matcher: [
    // Match all pathnames except:
    // - API routes
    // - Admin routes (not localized)
    // - Next.js internals
    // - Static files (images, fonts, etc.)
    "/((?!api|admin|_next|_vercel|monitoring|.*\\..*).*)",
  ],
};
