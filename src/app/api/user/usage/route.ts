/**
 * API Route: User Trial Usage Status
 *
 * GET /api/user/usage
 *
 * Returns trial usage statistics with percentages for each resource.
 * Wraps getTrialStatus() with percentage calculations.
 *
 * Covered by F-11: GET /api/user/usage returns trial status with percentages
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  getOrCreateTrialSession,
  getTrialStatus,
  TRIAL_LIMITS,
} from "@/lib/trial/trial-service";
import { validateAuth } from "@/lib/auth/session-auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/user/usage" });

interface ResourceUsage {
  used: number;
  limit: number;
  percentage: number;
}

interface VoiceUsage extends ResourceUsage {
  unit: string;
}

interface MaestriUsage {
  selected: number;
  limit: number;
}

interface UsageResponse {
  chat: ResourceUsage;
  voice: VoiceUsage;
  tools: ResourceUsage;
  docs: ResourceUsage;
  maestri: MaestriUsage;
}

/**
 * GET /api/user/usage
 *
 * Returns trial usage with percentages for dashboard display
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    // Validate authentication
    const auth = await validateAuth();

    // Get IP from headers (for trial session tracking)
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

    // Get or create visitor ID from cookie
    const cookieStore = await cookies();
    let visitorId = cookieStore.get("mirrorbuddy-visitor-id")?.value;

    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    // Get or create trial session
    const session = await getOrCreateTrialSession(ip, visitorId);

    if (!session) {
      log.error("Failed to get or create trial session");
      return NextResponse.json(
        { error: "Failed to retrieve session" },
        { status: 500 },
      );
    }

    // Get trial status
    const status = await getTrialStatus(session.id);

    if (!status) {
      log.error("Failed to get trial status", { sessionId: session.id });
      return NextResponse.json(
        { error: "Failed to retrieve usage status" },
        { status: 500 },
      );
    }

    // Calculate percentages
    const usageData: UsageResponse = {
      chat: {
        used: status.totalChatsUsed,
        limit: status.maxChats,
        percentage: (status.totalChatsUsed / status.maxChats) * 100,
      },
      voice: {
        used: status.voiceSecondsUsed,
        limit: status.maxVoiceSeconds,
        percentage: (status.voiceSecondsUsed / status.maxVoiceSeconds) * 100,
        unit: "seconds",
      },
      tools: {
        used: status.totalToolsUsed,
        limit: status.maxTools,
        percentage: (status.totalToolsUsed / status.maxTools) * 100,
      },
      docs: {
        used: status.totalDocsUsed,
        limit: status.maxDocs,
        percentage: (status.totalDocsUsed / status.maxDocs) * 100,
      },
      maestri: {
        selected: status.assignedMaestri.length,
        limit: TRIAL_LIMITS.MAESTRI_COUNT,
      },
    };

    // Log successful retrieval
    log.info("Usage retrieved successfully", {
      sessionId: session.id,
      authenticated: auth.authenticated,
      userId: auth.userId || "trial-user",
    });

    return NextResponse.json(usageData, { status: 200 });
  } catch (error) {
    log.error("Error retrieving usage", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to retrieve usage" },
      { status: 500 },
    );
  }
}
