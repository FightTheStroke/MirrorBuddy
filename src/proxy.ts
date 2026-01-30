// ============================================================================
// PROXY: Route Protection + Provider Check + CSP Nonce + Observability + i18n
// 1. Protects MirrorBuddy from unauthorized access (ADR 0055, 0056)
// 2. Redirects to /landing if no AI provider is configured
// 3. Injects nonce-based CSP headers for XSS protection (F-03)
// 4. Tracks latency and errors for API routes (F-02, F-03)
// 5. Handles i18n locale detection and routing (ADR 0066)
//
// Next.js 16: middleware.ts renamed to proxy.ts (December 2025)
// - "Proxy" clarifies network boundary role (vs Express "middleware" confusion)
// - Runs on Node.js runtime (not Edge) - more secure after CVE-2025-29927
// See: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
// ============================================================================

import { NextResponse, NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { generateNonce, CSP_NONCE_HEADER } from "@/lib/security/csp-nonce";
import { metricsStore } from "@/lib/observability/metrics-store";
import {
  AUTH_COOKIE_NAME,
  VISITOR_COOKIE_NAME,
} from "@/lib/auth/cookie-constants";
import { routing } from "@/i18n/routing";
import {
  detectLocaleFromRequest,
  extractLocaleFromUrl,
} from "@/lib/i18n/locale-detection";

const REQUEST_ID_HEADER = "x-request-id";
const RESPONSE_TIME_HEADER = "x-response-time";

// ==========================================================================
// i18n MIDDLEWARE (next-intl)
// Handles locale detection and routing for localized pages
// CRITICAL: Only applies to pages inside [locale], NOT to /api or static files
// ==========================================================================
const intlMiddleware = createIntlMiddleware(routing);

// Paths that should NEVER be handled by i18n middleware
// These will bypass locale routing entirely
const I18N_EXCLUDE_PATHS = [
  "/api",
  "/admin",
  "/_next",
  "/monitoring",
  "/favicon",
  "/icon",
  "/apple-icon",
  "/manifest",
  "/robots",
  "/sitemap",
  "/maestri", // Static avatar images
  "/avatars", // Static avatar images
  "/logo", // Logo images
  "/contact",
];

// Public routes that don't require authentication (ADR 0055, 0056)
// CRITICAL: pathWithoutLocale strips /it, /en, etc. so /it becomes /
const AUTH_PUBLIC_ROUTES = [
  "/",
  "/home",
  "/welcome",
  "/login",
  "/landing",
  // Legal pages (GDPR, EU AI Act - legally required to be public)
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
  "/ai-transparency",
  "/ai-policy",
  "/compliance",
  "/contact",
  "/showcase",
  "/demo",
  // Invite and trial flow
  "/invite",
  "/trial",
  // Static assets (images)
  "/maestri",
  "/avatars",
];

// Admin routes require authenticated user (ADR 0055)
const ADMIN_PREFIX = "/admin";

// Routes that do NOT require a provider to be configured
const PUBLIC_ROUTES = [
  "/landing",
  "/api",
  "/_next",
  "/favicon",
  "/icon",
  "/apple-icon",
  "/manifest",
  "/robots",
  "/sitemap",
  "/monitoring", // Sentry tunnel route (ADR 0067)
];

// UUID v4 regex for visitor ID validation
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a visitor ID is a valid UUID v4 format
 * This prevents trivial cookie forgery (e.g., "fake123")
 */
function isValidVisitorId(visitorId: string | undefined): boolean {
  if (!visitorId) return false;
  return UUID_V4_REGEX.test(visitorId);
}

// Static file extensions to skip
const STATIC_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".gif",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".css",
  ".js",
];

/**
 * Normalize route path for metrics grouping
 */
function normalizeRoute(pathname: string): string {
  let normalized = pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "/[id]",
  );
  normalized = normalized.replace(/\/\d+(?=\/|$)/g, "/[id]");
  normalized = normalized.replace(/\/[a-zA-Z0-9_-]{8,}(?=\/|$)/g, "/[id]");
  return normalized;
}

/**
 * Check if request should be tracked for metrics
 */
function shouldTrackMetrics(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/api/health")) return false;
  return true;
}

/**
 * Check if Azure OpenAI is configured (proxy-safe, uses env vars directly)
 */
function hasAzureProvider(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY
  );
}

/**
 * Check if Ollama is explicitly configured
 */
function hasOllamaProvider(): boolean {
  return !!(
    process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_ENABLED === "true"
  );
}

/**
 * Check if ANY provider is configured
 */
function hasAnyProvider(): boolean {
  return hasAzureProvider() || hasOllamaProvider();
}

/**
 * Build CSP header with nonce for script security
 * Next.js automatically applies nonce to its inline scripts when it detects
 * 'nonce-{value}' in the CSP header during dynamic rendering.
 *
 * 'strict-dynamic' allows scripts loaded by trusted scripts to execute.
 * 'unsafe-inline' is ignored by browsers when nonce is present, but provides
 * fallback for older browsers.
 *
 * F-10: Includes Supabase, Grafana, Upstash domains
 * F-11: Excludes localhost in production
 */
export function buildCSPHeader(nonce: string): string {
  // F-11: Localhost sources only in development
  const isProduction = process.env.NODE_ENV === "production";
  const localhostSources = isProduction
    ? ""
    : "ws://localhost:* wss://localhost:* http://localhost:11434";

  // F-10: Required external service domains
  const externalDomains = [
    // Azure OpenAI
    "https://*.openai.azure.com",
    "wss://*.openai.azure.com",
    "https://*.realtimeapi-preview.ai.azure.com",
    "wss://*.realtimeapi-preview.ai.azure.com",
    // Supabase (database, realtime)
    "https://*.supabase.co",
    "wss://*.supabase.co",
    // Grafana Cloud (metrics)
    "https://*.grafana.net",
    // Upstash (Redis)
    "https://*.upstash.io",
    // Vercel (analytics)
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    // Sentry (error tracking) - US and EU regions
    "https://*.ingest.us.sentry.io",
    "https://*.ingest.de.sentry.io",
  ].join(" ");

  // Build connect-src with conditional localhost
  const connectSources = ["'self'", externalDomains, localhostSources]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    // 'unsafe-inline' ignored when nonce present (fallback for old browsers)
    // 'strict-dynamic' allows dynamically loaded scripts from trusted scripts
    `script-src 'self' 'unsafe-inline' 'nonce-${nonce}' 'strict-dynamic' va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com fonts.cdnfonts.com",
    "font-src 'self' data: cdn.jsdelivr.net cdnjs.cloudflare.com fonts.cdnfonts.com",
    "img-src 'self' data: blob: cdn.jsdelivr.net cdnjs.cloudflare.com",
    "media-src 'self' data: blob:",
    `connect-src ${connectSources}`,
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * Check if path should skip i18n middleware entirely
 * These paths are not localized and should not be redirected
 */
function shouldSkipI18n(pathname: string): boolean {
  // Skip paths that start with excluded prefixes
  if (I18N_EXCLUDE_PATHS.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  // Skip static files (images, fonts, etc.)
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }
  return false;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();

  // Generate request ID for tracing
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  // Track metrics for API routes
  const trackMetrics = shouldTrackMetrics(pathname);
  const route = trackMetrics ? normalizeRoute(pathname) : pathname;

  // Generate nonce for CSP - do this early so it's available for all paths
  // Next.js extracts nonce from request headers to apply to inline scripts
  const nonce = generateNonce();
  requestHeaders.set(CSP_NONCE_HEADER, nonce);

  // ==========================================================================
  // STATIC FILES - Skip all processing, just add request ID
  // ==========================================================================
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  const localeFromPath = extractLocaleFromUrl(pathname);
  const detectedLocale =
    localeFromPath ??
    detectLocaleFromRequest({
      cookieHeader: request.headers.get("cookie"),
      acceptLanguageHeader: request.headers.get("accept-language"),
    });
  requestHeaders.set("X-NEXT-INTL-LOCALE", detectedLocale);
  requestHeaders.set("x-locale-detected", detectedLocale);

  // ==========================================================================
  // LOCALE-PREFIXED ADMIN REDIRECT
  // Admin panel doesn't support locale prefixes. If someone accesses
  // /it/admin, /en/admin, etc., redirect to /admin without locale prefix.
  // ==========================================================================
  if (localeFromPath) {
    const pathWithoutLocale = pathname.replace(`/${localeFromPath}`, "") || "/";
    if (pathWithoutLocale.startsWith(ADMIN_PREFIX)) {
      const adminUrl = new URL(pathWithoutLocale, request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  // ==========================================================================
  // i18n ROUTING - Handle locale detection for localized pages ONLY
  // CRITICAL: Skip for /api, /admin, static files to prevent 307 redirects
  // ==========================================================================
  if (!shouldSkipI18n(pathname)) {
    const hasLocalePrefix = Boolean(localeFromPath);

    // Only apply i18n middleware if no locale prefix (needs redirect)
    if (!hasLocalePrefix) {
      const response = intlMiddleware(
        new NextRequest(request.url, { headers: requestHeaders }),
      );
      response.headers.set("X-NEXT-INTL-LOCALE", detectedLocale);
      response.headers.set("x-locale-detected", detectedLocale);
      return response;
    }
  }

  // Helper to finalize response with metrics
  const finalizeResponse = (response: NextResponse, statusCode?: number) => {
    response.headers.set(CSP_NONCE_HEADER, nonce);
    response.headers.set("Content-Security-Policy", buildCSPHeader(nonce));
    response.headers.set(REQUEST_ID_HEADER, requestId);
    response.headers.set("X-NEXT-INTL-LOCALE", detectedLocale);
    response.headers.set("x-locale-detected", detectedLocale);

    // Record metrics for API routes
    if (trackMetrics) {
      const latencyMs = Date.now() - startTime;
      response.headers.set(RESPONSE_TIME_HEADER, `${latencyMs}ms`);
      metricsStore.recordLatency(route, latencyMs);

      // Track errors (4xx and 5xx)
      const status = statusCode ?? response.status;
      if (status >= 400) {
        metricsStore.recordError(route, status);
      }
    }

    return response;
  };

  // Skip public routes but still add CSP and request ID
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return finalizeResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // ==========================================================================
  // ROUTE PROTECTION (ADR 0055, 0056)
  // ==========================================================================

  // Check for authentication cookies
  const userCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const visitorCookie = request.cookies.get(VISITOR_COOKIE_NAME);
  const isAuthenticated = !!userCookie?.value;
  // Validate visitor ID is a proper UUID v4 (prevents trivial forgery)
  const hasTrialSession = isValidVisitorId(visitorCookie?.value);

  // Admin routes - require authenticated user (check BEFORE public routes so
  // /admin is never matched by AUTH_PUBLIC_ROUTES["/"] via path.startsWith("/"))
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      return finalizeResponse(redirectResponse, 307);
    }
    return finalizeResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // Auth public routes - allow without auth but add CSP
  // Strip locale prefix for matching (e.g., /it/welcome → /welcome)
  const localePrefix = extractLocaleFromUrl(pathname);
  const pathWithoutLocale = localePrefix
    ? pathname.replace(`/${localePrefix}`, "") || "/"
    : pathname;

  if (AUTH_PUBLIC_ROUTES.some((r) => pathWithoutLocale.startsWith(r))) {
    return finalizeResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // Protected routes - require EITHER authenticated user OR trial session
  if (!isAuthenticated && !hasTrialSession) {
    // No valid access - redirect to welcome to create trial session
    const welcomeUrl = new URL(
      localePrefix ? `/${localePrefix}/welcome` : "/welcome",
      request.url,
    );
    return NextResponse.redirect(welcomeUrl);
  }

  // ==========================================================================
  // PROVIDER CHECK
  // ==========================================================================

  // Check if any provider is configured
  if (!hasAnyProvider()) {
    const url = request.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.redirect(url);
  }

  // Provider configured and user authorized - allow access
  return finalizeResponse(
    NextResponse.next({ request: { headers: requestHeaders } }),
  );
}

export const config = {
  matcher: [
    // Match all routes except static files, excluding prefetch requests
    // Prefetch requests don't need CSP nonce processing
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
