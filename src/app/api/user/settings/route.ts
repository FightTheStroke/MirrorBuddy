// ============================================================================
// API ROUTE: User settings
// GET: Get current settings
// PUT: Update settings
// #92: Added Zod validation for type safety
// F-14: Added ETag/If-Match support for optimistic concurrency
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestLogger, getRequestId } from "@/lib/tracing";
import { getOrCompute, del, CACHE_TTL } from "@/lib/cache";
import { SettingsUpdateSchema } from "@/lib/validation/schemas/user";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { createHash } from "crypto";

/**
 * Generate ETag from settings data (F-14)
 * Uses updatedAt timestamp for version tracking
 */
function generateETag(updatedAt: Date): string {
  const hash = createHash("md5").update(updatedAt.toISOString()).digest("hex");
  return `"${hash.substring(0, 16)}"`;
}

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      const response = NextResponse.json(
        { error: auth.error || "No user" },
        { status: 401 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }
    const userId = auth.userId;

    // WAVE 3: Cache user settings for performance
    const settings = await getOrCompute(
      `settings:${userId}`,
      async () => {
        let userSettings = await prisma.settings.findUnique({
          where: { userId },
        });

        if (!userSettings) {
          // Create default settings
          userSettings = await prisma.settings.create({
            data: { userId },
          });
        }

        return userSettings;
      },
      { ttl: CACHE_TTL.SETTINGS },
    );

    // F-14: Add ETag header for optimistic concurrency
    const etag = settings.updatedAt
      ? generateETag(settings.updatedAt)
      : undefined;
    const response = NextResponse.json(settings);
    if (etag) {
      response.headers.set("ETag", etag);
    }
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  } catch (error) {
    log.error("Settings GET error", { error: String(error) });
    const response = NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 },
    );
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  }
}

export async function PUT(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      const response = NextResponse.json(
        { error: auth.error || "No user" },
        { status: 401 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }
    const userId = auth.userId;

    // Validate CSRF token for mutation
    if (!requireCSRF(request)) {
      const response = NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    const body = await request.json();

    // #92: Validate with Zod before writing to DB
    const validation = SettingsUpdateSchema.safeParse(body);
    if (!validation.success) {
      const response = NextResponse.json(
        {
          error: "Invalid settings data",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    // F-14: Check If-Match header for optimistic concurrency
    const ifMatch = request.headers.get("If-Match");
    if (ifMatch) {
      const currentSettings = await prisma.settings.findUnique({
        where: { userId },
        select: { updatedAt: true },
      });

      if (currentSettings?.updatedAt) {
        const currentETag = generateETag(currentSettings.updatedAt);
        if (ifMatch !== currentETag) {
          log.warn("Settings update conflict (ETag mismatch)", { userId });
          const response = NextResponse.json(
            { error: "Conflict - settings were modified by another request" },
            { status: 412 },
          );
          response.headers.set("X-Request-ID", getRequestId(request));
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
    const etag = settings.updatedAt
      ? generateETag(settings.updatedAt)
      : undefined;
    const response = NextResponse.json(settings);
    if (etag) {
      response.headers.set("ETag", etag);
    }
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  } catch (error) {
    log.error("Settings PUT error", { error: String(error) });
    const response = NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  }
}
