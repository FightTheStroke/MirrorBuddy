/**
 * Dunning Cron Job
 * Runs daily to:
 * 1. Send reminder emails (day 3, day 7)
 * 2. Downgrade expired grace periods
 */

import { NextRequest, NextResponse } from "next/server";
import { dunningService } from "@/lib/stripe/dunning-service";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dunningService.sendDunningReminders();
    await dunningService.processGracePeriodExpired();

    logger.info("Dunning cron completed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Dunning cron failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
