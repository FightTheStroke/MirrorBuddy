/**
 * Compare Experiments - Side-by-side benchmark comparison
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { compareExperiments } from "@/lib/research/experiment-service";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/research/compare"),
  withAdmin,
)(async (ctx) => {
  const url = new URL(ctx.req.url);
  const ids = url.searchParams.get("ids");

  if (!ids) {
    return NextResponse.json(
      { error: "Missing ids query parameter (comma-separated)" },
      { status: 400 },
    );
  }

  const experimentIds = ids.split(",").filter(Boolean);
  if (experimentIds.length < 2) {
    return NextResponse.json(
      { error: "At least 2 experiment IDs required for comparison" },
      { status: 400 },
    );
  }

  const result = await compareExperiments(experimentIds);
  return NextResponse.json(result);
});
