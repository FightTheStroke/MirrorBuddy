/**
 * MIRRORBUDDY - Consent API
 *
 * Stores user consent preferences in the database.
 * Backup for localStorage, also enables server-side consent checks.
 *
 * Plan 052: Trial mode consent system
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";

const log = logger.child({ module: "api/user/consent" });

interface ConsentPayload {
  version: string;
  acceptedAt: string;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Use proper auth validation (handles signed cookies correctly)
    const auth = await validateAuth();
    const userId = auth.authenticated ? auth.userId : null;

    // Parse consent data
    const consent: ConsentPayload = await request.json();

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
  } catch (error) {
    log.error("Failed to save consent", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to save consent" },
      { status: 500 },
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
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
  } catch (error) {
    log.error("Failed to get consent", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get consent" },
      { status: 500 },
    );
  }
}
