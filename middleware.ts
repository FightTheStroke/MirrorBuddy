import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";
import { isI18nEnabled } from "./src/lib/feature-flags/i18n-flags";
import { NextRequest } from "next/server";

/**
 * Internationalization Middleware
 *
 * F-63: i18n can be enabled/disabled per environment
 *
 * Handles locale detection and routing with the following priority:
 * 1. User preference (from NEXT_LOCALE cookie)
 * 2. Browser Accept-Language header
 * 3. Default locale (it)
 *
 * Supported locales: it, en, fr, de, es
 *
 * The middleware automatically:
 * - Detects user's preferred language from Accept-Language header
 * - Stores user's locale preference in NEXT_LOCALE cookie
 * - Redirects to localized URLs (e.g., /en/home, /it/chat)
 * - Provides locale information to all pages via next-intl
 *
 * Feature Flag (FEATURE_I18N_ENABLED):
 * - true: Apply full locale routing and detection
 * - false: Pass through without i18n middleware (default to single language)
 */
const intlMiddleware = createMiddleware(routing);

/**
 * Conditionally apply i18n middleware based on feature flag
 */
export default function middleware(request: NextRequest) {
  // Check if i18n is enabled via environment variable
  if (!isI18nEnabled()) {
    // If i18n is disabled, skip the middleware and let request pass through
    return undefined;
  }

  // Apply i18n middleware if enabled
  return intlMiddleware(request);
}

/**
 * Matcher configuration for Next.js middleware
 *
 * This middleware runs on all routes EXCEPT:
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
