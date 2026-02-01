import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import {
  getGrafanaConfig,
  getGrafanaPanels,
} from "@/lib/admin/grafana-embed-service";

/**
 * GET /api/admin/grafana
 * Returns Grafana configuration and panel list
 * Admin-only endpoint
 */
export const GET = pipe(
  withSentry("/api/admin/grafana"),
  withAdmin,
)(async (_ctx) => {
  // Fetch Grafana configuration and panels
  const config = await getGrafanaConfig();
  const panels = config.configured ? await getGrafanaPanels() : [];

  return NextResponse.json({
    data: {
      config,
      panels,
    },
  });
});
