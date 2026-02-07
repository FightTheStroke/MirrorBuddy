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

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  getOrCreateTrialSession,
  getTrialStatus,
} from "@/lib/trial/trial-service";
import { validateAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { VISITOR_COOKIE_NAME } from "@/lib/auth";
import { pipe, withSentry } from "@/lib/api/middlewares";

const log = logger.child({ module: "api/user/usage" });

interface ResourceUsage {
  used: number;
  limit: number;
  percentage: number;
}

interface VoiceUsage extends ResourceUsage {
  unit: string;
}

interface UsageResponse {
  chat: ResourceUsage;
  voice: VoiceUsage;
  tools: ResourceUsage;
  docs: ResourceUsage;
  // Maestri restrictions removed - users can talk to any maestro
}

/**
 * GET /api/user/usage
 *
 * Returns trial usage with percentages for dashboard display
 */
export const GET = pipe(withSentry("/api/user/usage"))(
  async (): Promise<NextResponse> => {
    // Validate authentication
    const auth = await validateAuth();

    // Get IP from headers (for trial session tracking)
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

    // Get or create visitor ID from cookie
    const cookieStore = await cookies();
    let visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

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
      // Maestri restrictions removed - users can talk to any maestro
    };

    // Log successful retrieval
    log.info("Usage retrieved successfully", {
      sessionId: session.id,
      authenticated: auth.authenticated,
      userId: auth.userId || "trial-user",
    });

    return NextResponse.json(usageData, { status: 200 });
  },
);
