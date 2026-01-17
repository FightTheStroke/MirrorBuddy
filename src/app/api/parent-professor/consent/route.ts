// ============================================================================
// API ROUTE: Parent-Professor Chat Consent (Issue #63)
// GET: Check if user has consented
// POST: Record consent
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireCSRF } from "@/lib/security/csrf";

export async function GET() {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { parentChatConsentAt: true },
    });

    return NextResponse.json({
      hasConsented: !!settings?.parentChatConsentAt,
      consentedAt: settings?.parentChatConsentAt || null,
    });
  } catch (error) {
    logger.error("Parent consent GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to check consent" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Upsert settings with consent timestamp
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: { parentChatConsentAt: new Date() },
      create: {
        userId,
        parentChatConsentAt: new Date(),
      },
    });

    logger.info("Parent chat consent recorded", { userId });

    return NextResponse.json({
      success: true,
      consentedAt: settings.parentChatConsentAt,
    });
  } catch (error) {
    logger.error("Parent consent POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to record consent" },
      { status: 500 },
    );
  }
}
