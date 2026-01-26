/**
 * API ROUTE: User accessibility settings
 * GET: Get current accessibility settings
 * PUT: Update accessibility settings
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestLogger, getRequestId } from "@/lib/tracing";
import { getOrCompute, del, CACHE_TTL } from "@/lib/cache";
import { AccessibilitySettingsSchema } from "@/lib/validation/schemas/accessibility";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      const response = NextResponse.json(
        { error: auth.error || "Not authenticated" },
        { status: 401 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }
    const userId = auth.userId;

    const settings = await getOrCompute(
      `a11y:${userId}`,
      async () => {
        // Use upsert with retry to handle race condition when multiple requests
        // try to create settings for the same user simultaneously.
        // Even upsert can fail under extreme concurrency due to non-atomic check.
        try {
          const a11ySettings = await prisma.accessibilitySettings.upsert({
            where: { userId },
            update: {}, // No update needed, just return existing
            create: { userId },
          });
          return a11ySettings;
        } catch (error) {
          // If unique constraint violation (Prisma or PostgreSQL error), fetch existing
          if (
            error instanceof Error &&
            (error.message.includes("Unique constraint") ||
              error.message.includes("duplicate key"))
          ) {
            const existing = await prisma.accessibilitySettings.findUnique({
              where: { userId },
            });
            if (existing) return existing;
          }
          throw error;
        }
      },
      { ttl: CACHE_TTL.SETTINGS },
    );

    const response = NextResponse.json(settings);
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  } catch (error) {
    log.error("Accessibility GET error", { error: String(error) });
    const response = NextResponse.json(
      { error: "Failed to get accessibility settings" },
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
        { error: auth.error || "Not authenticated" },
        { status: 401 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }
    const userId = auth.userId;

    if (!requireCSRF(request)) {
      const response = NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    const body = await request.json();

    const validation = AccessibilitySettingsSchema.safeParse(body);
    if (!validation.success) {
      const response = NextResponse.json(
        {
          error: "Invalid accessibility settings",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    const settings = await prisma.accessibilitySettings.upsert({
      where: { userId },
      update: validation.data,
      create: { userId, ...validation.data },
    });

    // Invalidate cache
    del(`a11y:${userId}`);

    const response = NextResponse.json(settings);
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  } catch (error) {
    log.error("Accessibility PUT error", { error: String(error) });
    const response = NextResponse.json(
      { error: "Failed to update accessibility settings" },
      { status: 500 },
    );
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  }
}
