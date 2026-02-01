// ============================================================================
// API ROUTE: Parent-Professor Chat Consent (Issue #63)
// GET: Check if user has consented
// POST: Record consent
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const GET = pipe(
  withSentry("/api/parent-professor/consent"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: { parentChatConsentAt: true },
  });

  return NextResponse.json({
    hasConsented: !!settings?.parentChatConsentAt,
    consentedAt: settings?.parentChatConsentAt || null,
  });
});

export const POST = pipe(
  withSentry("/api/parent-professor/consent"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

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
});
