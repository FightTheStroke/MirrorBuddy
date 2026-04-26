/**
 * API ROUTE: User accessibility settings
 * GET: Get current accessibility settings
 * PUT: Update accessibility settings
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestId } from "@/lib/tracing";
import { getOrCompute, del, CACHE_TTL } from "@/lib/cache";
import { AccessibilitySettingsSchema } from "@/lib/validation/schemas/accessibility";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/user/accessibility"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

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
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});

export const PUT = pipe(
  withSentry("/api/user/accessibility"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();

  const validation = AccessibilitySettingsSchema.safeParse(body);
  if (!validation.success) {
    const response = NextResponse.json(
      {
        error: "Invalid accessibility settings",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
    response.headers.set("X-Request-ID", getRequestId(ctx.req));
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
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});
