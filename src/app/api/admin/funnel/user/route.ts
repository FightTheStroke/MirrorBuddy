/**
 * User Funnel Journey API
 * Returns complete funnel journey for a specific visitor/user
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";

export const dynamic = "force-dynamic";

interface JourneyEvent {
  stage: string;
  fromStage: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  timeSincePrevious: number | null; // milliseconds
}

interface UserJourneyResponse {
  identifier: {
    visitorId: string | null;
    userId: string | null;
  };
  journey: JourneyEvent[];
  summary: {
    firstSeen: string;
    lastSeen: string;
    currentStage: string;
    totalEvents: number;
    converted: boolean;
    churned: boolean;
    daysInFunnel: number;
  };
}

export async function GET(request: NextRequest) {
  const adminAuth = await validateAdminAuth();
  if (!adminAuth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visitorId = request.nextUrl.searchParams.get("visitorId");
  const userId = request.nextUrl.searchParams.get("userId");

  if (!visitorId && !userId) {
    return NextResponse.json(
      { error: "Either visitorId or userId required" },
      { status: 400 },
    );
  }

  try {
    const where = userId ? { userId } : { visitorId };

    const events = await prisma.funnelEvent.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: {
        stage: true,
        fromStage: true,
        createdAt: true,
        metadata: true,
      },
    });

    if (events.length === 0) {
      return NextResponse.json(
        { error: "No events found for this identifier" },
        { status: 404 },
      );
    }

    // Build journey with time differences
    const journey: JourneyEvent[] = events.map((event, idx) => {
      const prevEvent = idx > 0 ? events[idx - 1] : null;
      const timeSincePrevious = prevEvent
        ? event.createdAt.getTime() - prevEvent.createdAt.getTime()
        : null;

      return {
        stage: event.stage,
        fromStage: event.fromStage,
        createdAt: event.createdAt.toISOString(),
        metadata: event.metadata as Record<string, unknown> | null,
        timeSincePrevious,
      };
    });

    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const currentStage = lastEvent.stage;

    // Check if converted (reached ACTIVE or FIRST_LOGIN)
    const converted = events.some(
      (e) => e.stage === "ACTIVE" || e.stage === "FIRST_LOGIN",
    );

    // Check if churned (no activity in 14 days and not converted)
    const daysSinceLastActivity = Math.floor(
      (Date.now() - lastEvent.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const churned = !converted && daysSinceLastActivity > 14;

    const daysInFunnel = Math.floor(
      (lastEvent.createdAt.getTime() - firstEvent.createdAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const response: UserJourneyResponse = {
      identifier: {
        visitorId: visitorId || null,
        userId: userId || null,
      },
      journey,
      summary: {
        firstSeen: firstEvent.createdAt.toISOString(),
        lastSeen: lastEvent.createdAt.toISOString(),
        currentStage,
        totalEvents: events.length,
        converted,
        churned,
        daysInFunnel,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[funnel/user] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user journey" },
      { status: 500 },
    );
  }
}
