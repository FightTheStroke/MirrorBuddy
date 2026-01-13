// ============================================================================
// API ROUTE: Version information
// Returns app version for display in UI and health checks
// ============================================================================

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getCacheControlHeader, CACHE_TTL } from '@/lib/cache';

// Cache version in memory
let cachedVersion: string = '';

function getVersion(): string {
  if (cachedVersion) return cachedVersion;

  try {
    // Try to read VERSION file
    const versionPath = join(process.cwd(), 'VERSION');
    cachedVersion = readFileSync(versionPath, 'utf-8').trim();
  } catch {
    // Fallback to package.json
    try {
      const pkgPath = join(process.cwd(), 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      cachedVersion = pkg.version || '0.0.0';
    } catch {
      cachedVersion = '0.0.0';
    }
  }

  return cachedVersion;
}

export async function GET() {
  const version = getVersion();
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();

  const response = NextResponse.json({
    version,
    buildTime,
    name: 'MirrorBuddy Web',
    environment: process.env.NODE_ENV || 'development',
  });

  // Add HTTP Cache-Control headers for static version data
  const cacheControl = getCacheControlHeader({
    ttl: CACHE_TTL.VERSION,
    visibility: 'public',
    cdnTtl: CACHE_TTL.VERSION,
  });
  response.headers.set('Cache-Control', cacheControl);

  return response;
}
