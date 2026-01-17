// ============================================================================
// PROXY: Provider Check & Landing Redirect + CSP Nonce Injection
// 1. Redirects to /landing if no AI provider is configured
// 2. Injects nonce-based CSP headers for XSS protection (F-03)
//
// Next.js 16: middleware.ts renamed to proxy.ts
// See: https://nextjs.org/docs/messages/middleware-to-proxy
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateNonce, CSP_NONCE_HEADER } from "@/lib/security/csp-nonce";

const REQUEST_ID_HEADER = "x-request-id";

// Routes that do NOT require a provider to be configured
const PUBLIC_ROUTES = [
  "/landing",
  "/showcase",
  "/api",
  "/_next",
  "/favicon",
  "/icon",
  "/apple-icon",
  "/manifest",
  "/robots",
  "/sitemap",
];

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
 */
function buildCSPHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' cdn.jsdelivr.net cdnjs.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com fonts.cdnfonts.com",
    "font-src 'self' data: cdn.jsdelivr.net cdnjs.cloudflare.com fonts.cdnfonts.com",
    "img-src 'self' data: blob: cdn.jsdelivr.net cdnjs.cloudflare.com",
    "media-src 'self' data: blob:",
    "connect-src 'self' https://*.openai.azure.com wss://*.openai.azure.com https://*.realtimeapi-preview.ai.azure.com ws://localhost:* wss://localhost:* http://localhost:11434",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate request ID for tracing (merged from middleware.ts)
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  // Skip static files - no CSP needed, but add request ID
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Generate nonce for CSP
  const nonce = generateNonce();

  // Skip public routes but still add CSP and request ID
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(CSP_NONCE_HEADER, nonce);
    response.headers.set("Content-Security-Policy", buildCSPHeader(nonce));
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Check if any provider is configured
  if (!hasAnyProvider()) {
    // Redirect to landing page if no provider
    const url = request.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.redirect(url);
  }

  // Provider configured, allow access with CSP and request ID
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(CSP_NONCE_HEADER, nonce);
  response.headers.set("Content-Security-Policy", buildCSPHeader(nonce));
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: [
    // Match all routes except _next/static, _next/image, and static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
