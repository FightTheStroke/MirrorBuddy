// ============================================================================
// API ROUTE: User settings
// GET: Get current settings
// PUT: Update settings
// #92: Added Zod validation for type safety
// F-14: Added ETag/If-Match support for optimistic concurrency
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestId, getRequestLogger } from '@/lib/tracing';
import { getOrCompute, del, CACHE_TTL } from '@/lib/cache';
import { SettingsUpdateSchema } from '@/lib/validation/schemas/user';
import { pipe, withSentry, withAuth, withCSRF } from '@/lib/api/middlewares';
import { safeReadJson } from '@/lib/api/safe-json';
import { createHash } from 'crypto';

/**
 * Generate ETag from settings data (F-14)
 * Uses updatedAt timestamp for version tracking
 */
function generateETag(updatedAt: Date): string {
  const hash = createHash('md5').update(updatedAt.toISOString()).digest('hex');
  return `"${hash.substring(0, 16)}"`;
}

export const GET = pipe(
  withSentry('/api/user/settings'),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // WAVE 3: Cache user settings for performance
  const settings = await getOrCompute(
    `settings:${userId}`,
    async () => {
      return prisma.settings.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    },
    { ttl: CACHE_TTL.SETTINGS },
  );

  // F-14: Add ETag header for optimistic concurrency
  const etag = settings.updatedAt ? generateETag(settings.updatedAt) : undefined;
  const response = NextResponse.json(settings);
  if (etag) {
    response.headers.set('ETag', etag);
  }
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});

export const PUT = pipe(
  withSentry('/api/user/settings'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const log = getRequestLogger(ctx.req);

  const body = await safeReadJson(ctx.req);
  if (!body) {
    const response = NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    response.headers.set('X-Request-ID', getRequestId(ctx.req));
    return response;
  }

  // #92: Validate with Zod before writing to DB
  const validation = SettingsUpdateSchema.safeParse(body);
  if (!validation.success) {
    const response = NextResponse.json(
      {
        error: 'Invalid settings data',
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
    response.headers.set('X-Request-ID', getRequestId(ctx.req));
    return response;
  }

  // F-14: Check If-Match header for optimistic concurrency
  const ifMatch = ctx.req.headers.get('If-Match');
  if (ifMatch) {
    const currentSettings = await prisma.settings.findUnique({
      where: { userId },
      select: { updatedAt: true },
    });

    if (currentSettings?.updatedAt) {
      const currentETag = generateETag(currentSettings.updatedAt);
      if (ifMatch !== currentETag) {
        log.warn('Settings update conflict (ETag mismatch)', { userId });
        const response = NextResponse.json(
          { error: 'Conflict - settings were modified by another request' },
          { status: 412 },
        );
        response.headers.set('X-Request-ID', getRequestId(ctx.req));
        return response;
      }
    }
  }

  const settings = await prisma.settings.upsert({
    where: { userId },
    update: validation.data,
    create: { userId, ...validation.data },
  });

  // WAVE 3: Invalidate cache when settings are updated
  del(`settings:${userId}`);

  // F-14: Return ETag in response
  const etag = settings.updatedAt ? generateETag(settings.updatedAt) : undefined;
  const response = NextResponse.json(settings);
  if (etag) {
    response.headers.set('ETag', etag);
  }
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});
