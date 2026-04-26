/**
 * API Route: Terms of Service Acceptance
 *
 * GET /api/tos - Check if user accepted current ToS version
 * POST /api/tos - Record ToS acceptance
 *
 * F-13: Terms of Service tracking with versioning and audit trail
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitResponse,
  getClientIdentifier,
} from "@/lib/rate-limit";
import { TOS_VERSION } from "@/lib/tos/constants";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";


export const revalidate = 0;
const log = logger.child({ module: "api/tos" });

/**
 * GET /api/tos
 * Check if user has accepted the current ToS version
 *
 * Returns:
 * - accepted: boolean (true if current version accepted)
 * - version: string (current ToS version)
 * - acceptedAt?: Date (when user accepted, if they have)
 */
export const GET = pipe(
  withSentry("/api/tos"),
  withAuth,
)(async (ctx) => {
  // Rate limit: 60 req/min (same as general API)
  const rateLimit = checkRateLimit(`tos:${ctx.userId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", {
      userId: ctx.userId,
      endpoint: "/api/tos",
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    // Check if user has accepted current version
    const acceptance = await prisma.tosAcceptance.findUnique({
      where: {
        userId_version: {
          userId: ctx.userId!,
          version: TOS_VERSION,
        },
      },
    });

    if (acceptance) {
      return NextResponse.json({
        accepted: true,
        version: TOS_VERSION,
        acceptedAt: acceptance.acceptedAt,
      });
    }

    // User hasn't accepted current version - check if they have any previous acceptance
    const previousAcceptance = await prisma.tosAcceptance.findFirst({
      where: {
        userId: ctx.userId,
        version: {
          not: TOS_VERSION,
        },
      },
      orderBy: {
        acceptedAt: "desc",
      },
    });

    // Return with previousVersion if user needs re-consent
    return NextResponse.json({
      accepted: false,
      version: TOS_VERSION,
      previousVersion: previousAcceptance?.version,
    });
  } catch (error) {
    log.error("ToS check error", {
      userId: ctx.userId,
      error: String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/tos
 * Record user acceptance of ToS
 *
 * Body:
 * - version: string (ToS version being accepted)
 *
 * Returns:
 * - success: boolean
 * - acceptedAt: Date
 */
export const POST = pipe(
  withSentry("/api/tos"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  // Rate limit: 10 req/min (prevent abuse, ToS acceptance is rare)
  const rateLimit = checkRateLimit(`tos:post:${ctx.userId}`, {
    maxRequests: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", {
      userId: ctx.userId,
      endpoint: "POST /api/tos",
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await ctx.req.json();
    const { version } = body;

    // Validate version
    if (!version || typeof version !== "string") {
      return NextResponse.json(
        { error: "Version is required" },
        { status: 400 },
      );
    }

    // Get client info for audit trail
    const ipAddress = getClientIdentifier(ctx.req);
    const userAgent = ctx.req.headers.get("user-agent") || undefined;

    // Extract only last segment of IP for privacy
    const ipLastSegment = ipAddress.split(".").pop() || undefined;

    // Upsert acceptance (idempotent - safe to call multiple times)
    const acceptance = await prisma.tosAcceptance.upsert({
      where: {
        userId_version: {
          userId: ctx.userId!,
          version,
        },
      },
      create: {
        userId: ctx.userId!,
        version,
        ipAddress: ipLastSegment,
        userAgent,
      },
      update: {
        // Update timestamp if re-accepting (edge case)
        acceptedAt: new Date(),
        ipAddress: ipLastSegment,
        userAgent,
      },
    });

    log.info("ToS accepted", {
      userId: ctx.userId,
      version,
      acceptedAt: acceptance.acceptedAt,
    });

    return NextResponse.json({
      success: true,
      acceptedAt: acceptance.acceptedAt,
    });
  } catch (error) {
    log.error("ToS acceptance error", {
      userId: ctx.userId,
      error: String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
