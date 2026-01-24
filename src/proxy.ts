// ============================================================================
// PROXY: Route Protection + Provider Check + CSP Nonce + Observability
// 1. Protects MirrorBuddy from unauthorized access (ADR 0055, 0056)
// 2. Redirects to /landing if no AI provider is configured
// 3. Injects nonce-based CSP headers for XSS protection (F-03)
// 4. Tracks latency and errors for API routes (F-02, F-03)
//
// Next.js 16: middleware.ts renamed to proxy.ts
// See: https://nextjs.org/docs/messages/middleware-to-proxy
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateNonce, CSP_NONCE_HEADER } from "@/lib/security/csp-nonce";
import { metricsStore } from "@/lib/observability/metrics-store";

const REQUEST_ID_HEADER = "x-request-id";
const RESPONSE_TIME_HEADER = "x-response-time";

// Public routes that don't require authentication (ADR 0055, 0056)
const AUTH_PUBLIC_ROUTES = [
  "/welcome",
  "/login",
  "/privacy",
  "/terms",
  "/cookies",
  "/landing",
  "/showcase",
  "/invite",
  "/maestri", // Avatar images
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
 */
function buildCSPHeader(nonce: string): string {
  // Sentry DSN domain (supports US and EU regions)
  const sentryDomains = "*.ingest.us.sentry.io *.ingest.de.sentry.io";

  return [
    "default-src 'self'",
    // 'unsafe-inline' ignored when nonce present (fallback for old browsers)
    // 'strict-dynamic' allows dynamically loaded scripts from trusted scripts
    `script-src 'self' 'unsafe-inline' 'nonce-${nonce}' 'strict-dynamic' va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com fonts.cdnfonts.com",
    "font-src 'self' data: cdn.jsdelivr.net cdnjs.cloudflare.com fonts.cdnfonts.com",
    "img-src 'self' data: blob: cdn.jsdelivr.net cdnjs.cloudflare.com",
    "media-src 'self' data: blob:",
    `connect-src 'self' https://*.openai.azure.com wss://*.openai.azure.com https://*.realtimeapi-preview.ai.azure.com wss://*.realtimeapi-preview.ai.azure.com ws://localhost:* wss://localhost:* http://localhost:11434 https://va.vercel-scripts.com https://vitals.vercel-insights.com https://${sentryDomains}`,
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
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

  // Skip static files - no CSP needed, but add request ID
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Helper to finalize response with metrics
  const finalizeResponse = (response: NextResponse, statusCode?: number) => {
    response.headers.set(CSP_NONCE_HEADER, nonce);
    response.headers.set("Content-Security-Policy", buildCSPHeader(nonce));
    response.headers.set(REQUEST_ID_HEADER, requestId);

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
  const userCookie = request.cookies.get("mirrorbuddy-user-id");
  const visitorCookie = request.cookies.get("mirrorbuddy-visitor-id");
  const isAuthenticated = !!userCookie?.value;
  // Validate visitor ID is a proper UUID v4 (prevents trivial forgery)
  const hasTrialSession = isValidVisitorId(visitorCookie?.value);

  // Note: Real-time activity tracking moved to client-side (database-backed)
  // for serverless compatibility. See src/lib/telemetry/use-activity-tracker.ts

  // Auth public routes - allow without auth but add CSP
  if (AUTH_PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return finalizeResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // Admin routes - require authenticated user
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Admin check is done server-side in API handlers
    return finalizeResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // Protected routes - require EITHER authenticated user OR trial session
  if (!isAuthenticated && !hasTrialSession) {
    // No valid access - redirect to welcome to create trial session
    const welcomeUrl = new URL("/welcome", request.url);
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
