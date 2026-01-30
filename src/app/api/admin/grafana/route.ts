import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import {
  getGrafanaConfig,
  getGrafanaPanels,
} from "@/lib/admin/grafana-embed-service";

/**
 * GET /api/admin/grafana
 * Returns Grafana configuration and panel list
 * Admin-only endpoint
 */
export async function GET(_request: NextRequest) {
  try {
    // Validate admin authentication
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch Grafana configuration and panels
    const config = await getGrafanaConfig();
    const panels = config.configured ? await getGrafanaPanels() : [];

    return NextResponse.json({
      data: {
        config,
        panels,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
