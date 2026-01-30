/**
 * Business KPI API endpoint for Mission Control
 */

import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { getBusinessKPIs } from "@/lib/admin/business-kpi-service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getBusinessKPIs();

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("Failed to fetch business KPIs", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
