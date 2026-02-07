/**
 * MIRRORBUDDY - Consent API
 *
 * Stores user consent preferences in the database.
 * Backup for localStorage, also enables server-side consent checks.
 *
 * Plan 052: Trial mode consent system
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth";
import { pipe, withSentry, withCSRF } from "@/lib/api/middlewares";

const log = logger.child({ module: "api/user/consent" });

interface ConsentPayload {
  version: string;
  acceptedAt: string;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const POST = pipe(
  withSentry("/api/user/consent"),
  withCSRF,
)(async (ctx) => {
  // Use proper auth validation (handles signed cookies correctly)
  const auth = await validateAuth();
  const userId = auth.authenticated ? auth.userId : null;

  // Parse consent data
  const consent: ConsentPayload = await ctx.req.json();

  if (!consent.version || !consent.acceptedAt) {
    return NextResponse.json(
      { error: "Invalid consent data" },
      { status: 400 },
    );
  }

  // If user is authenticated, store in database
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          upsert: {
            create: {
              // Store consent as part of azure cost config (JSON field)
              azureCostConfig: JSON.stringify({ consent }),
            },
            update: {
              azureCostConfig: JSON.stringify({ consent }),
            },
          },
        },
      },
    });

    log.info("Consent saved to database", {
      userId,
      analytics: consent.analytics,
    });
  }

  // Log consent event for analytics
  log.info("Consent recorded", {
    userId: userId || "anonymous",
    version: consent.version,
    analytics: consent.analytics,
    marketing: consent.marketing,
  });

  return NextResponse.json({ success: true });
});

export const GET = pipe(withSentry("/api/user/consent"))(async () => {
  // Use proper auth validation (handles signed cookies correctly)
  const auth = await validateAuth();
  const userId = auth.authenticated ? auth.userId : null;

  if (!userId) {
    return NextResponse.json({ consent: null });
  }

  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: { azureCostConfig: true },
  });

  if (!settings?.azureCostConfig) {
    return NextResponse.json({ consent: null });
  }

  try {
    const config = JSON.parse(settings.azureCostConfig);
    return NextResponse.json({ consent: config.consent || null });
  } catch {
    return NextResponse.json({ consent: null });
  }
});
