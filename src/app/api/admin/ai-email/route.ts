/**
 * AI/Email Monitoring API Route
 * GET /api/admin/ai-email
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { getAIEmailMetrics } from "@/lib/admin/ai-email-service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const adminUser = await validateAdminAuth();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getAIEmailMetrics();

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("Failed to fetch AI/Email metrics", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
