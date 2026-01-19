/**
 * API endpoint for accessibility statistics
 * Aggregates telemetry events with category='accessibility'
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";

export interface A11yStatsData {
  period: { days: number; startDate: string };
  summary: {
    totalActivations: number;
    uniqueSessions: number;
    resetCount: number;
  };
  byProfile: Record<string, number>;
  byToggle: Record<string, number>;
  dailyActivations: Record<string, number>;
}

export async function GET(request: Request) {
  try {
    // Check admin access
    const auth = await validateAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "7", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Query accessibility events
    const events = await prisma.telemetryEvent.findMany({
      where: {
        category: "accessibility",
        timestamp: { gte: startDate },
      },
      select: {
        action: true,
        label: true,
        sessionId: true,
        timestamp: true,
        metadata: true,
      },
    });

    // Aggregate by profile
    const byProfile: Record<string, number> = {};
    // Aggregate by toggle
    const byToggle: Record<string, number> = {};
    // Daily activations
    const dailyActivations: Record<string, number> = {};
    // Counters
    let totalActivations = 0;
    let resetCount = 0;
    const uniqueSessions = new Set<string>();

    for (const event of events) {
      uniqueSessions.add(event.sessionId);

      if (event.action === "profile_activated" && event.label) {
        totalActivations++;
        byProfile[event.label] = (byProfile[event.label] ?? 0) + 1;

        // Daily breakdown
        const day = event.timestamp.toISOString().split("T")[0];
        dailyActivations[day] = (dailyActivations[day] ?? 0) + 1;
      }

      if (event.action === "setting_changed" && event.label) {
        byToggle[event.label] = (byToggle[event.label] ?? 0) + 1;
      }

      if (event.action === "reset_to_defaults") {
        resetCount++;
      }
    }

    const response: A11yStatsData = {
      period: {
        days,
        startDate: startDate.toISOString(),
      },
      summary: {
        totalActivations,
        uniqueSessions: uniqueSessions.size,
        resetCount,
      },
      byProfile,
      byToggle,
      dailyActivations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching a11y stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch accessibility stats" },
      { status: 500 },
    );
  }
}
