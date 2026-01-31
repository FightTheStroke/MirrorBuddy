import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkRateLimitAsync,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { calculateAndPublishAdminCounts } from "@/lib/helpers/publish-admin-counts";
import * as Sentry from "@sentry/nextjs";

interface InviteRequestBody {
  name: string;
  email: string;
  motivation: string;
  visitorId?: string;
  trialSessionId?: string;
}

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- Public beta request form; no cookie auth
export async function POST(request: NextRequest) {
  try {
    // Rate limit invite requests (3 per hour - public endpoint, strict)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(
      `invite:request:${clientId}`,
      RATE_LIMITS.INVITE_REQUEST,
    );
    if (!rateLimitResult.success) {
      logger.warn("Invite request rate limited", { clientId });
      return rateLimitResponse(rateLimitResult);
    }

    const body = (await request.json()) as InviteRequestBody;
    const { name, email, motivation, trialSessionId } = body;

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome richiesto (minimo 2 caratteri)" },
        { status: 400 },
      );
    }

    // Simple email validation - avoid complex regex for ReDoS safety
    const emailParts = email.split("@");
    const isValidEmail =
      emailParts.length === 2 &&
      emailParts[0].length > 0 &&
      emailParts[1].includes(".") &&
      !email.includes(" ");
    if (!email || !isValidEmail) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    }

    if (!motivation || motivation.trim().length < 20) {
      return NextResponse.json(
        { error: "Motivazione richiesta (minimo 20 caratteri)" },
        { status: 400 },
      );
    }

    // Use upsert to prevent race condition (ADR 0105)
    // If request exists, return conflict. Otherwise create atomically.
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.inviteRequest.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Questa email ha gia una richiesta in corso" },
        { status: 409 },
      );
    }

    let inviteRequest;
    try {
      inviteRequest = await prisma.inviteRequest.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          motivation: motivation.trim(),
          trialSessionId: trialSessionId || null,
        },
      });
    } catch (err) {
      // Handle race condition: concurrent request created the same email
      if (err instanceof Error && err.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "Questa email ha gia una richiesta in corso" },
          { status: 409 },
        );
      }
      throw err;
    }

    logger.info("Beta request created", {
      inviteId: inviteRequest.id,
      email: inviteRequest.email,
      hasTrialSession: !!trialSessionId,
    });

    // Trigger admin counts push (F-06, F-27, F-32: non-blocking, rate-limited per event type)
    calculateAndPublishAdminCounts("invite").catch((err) =>
      logger.warn("Failed to publish admin counts on invite request", {
        error: String(err),
      }),
    );

    // Send notifications (await to ensure delivery in serverless)
    const { notifyAdminNewRequest, sendRequestConfirmation } =
      await import("@/lib/invite/invite-service");
    await Promise.all([
      notifyAdminNewRequest(inviteRequest.id),
      sendRequestConfirmation(inviteRequest.id),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Richiesta inviata con successo",
        id: inviteRequest.id,
      },
      { status: 201 },
    );
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/invites/request" },
    });

    logger.error("Failed to create beta request", undefined, error as Error);
    return NextResponse.json(
      { error: "Errore durante la creazione della richiesta" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
