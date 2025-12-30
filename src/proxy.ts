// ============================================================================
// PROXY: Provider Check & Landing Redirect
// Redirects to /landing if no AI provider is configured
// Allows access to public routes (landing, showcase, api, static assets)
//
// Next.js 16: middleware.ts renamed to proxy.ts
// See: https://nextjs.org/docs/messages/middleware-to-proxy
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that do NOT require a provider to be configured
const PUBLIC_ROUTES = [
  '/landing',
  '/showcase',
  '/api',
  '/_next',
  '/favicon',
  '/icon',
  '/apple-icon',
  '/manifest',
  '/robots',
  '/sitemap',
];

// Static file extensions to skip
const STATIC_EXTENSIONS = [
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.css',
  '.js',
];

/**
 * Check if Azure OpenAI is configured (proxy-safe, uses env vars directly)
 */
function hasAzureProvider(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY
  );
}

/**
 * Check if Ollama is explicitly configured
 */
function hasOllamaProvider(): boolean {
  return !!(
    process.env.OLLAMA_URL ||
    process.env.NEXT_PUBLIC_OLLAMA_ENABLED === 'true'
  );
}

/**
 * Check if ANY provider is configured
 */
function hasAnyProvider(): boolean {
  return hasAzureProvider() || hasOllamaProvider();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if any provider is configured
  if (!hasAnyProvider()) {
    // Redirect to landing page if no provider
    const url = request.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.redirect(url);
  }

  // Provider configured, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except _next/static, _next/image, and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
