/**
 * Experiment Results - Get detailed results for an experiment
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { getExperimentResults } from "@/lib/research/experiment-service";

export const GET = pipe(
  withSentry("/api/admin/research/experiments/[id]/results"),
  withAdmin,
)(async (ctx) => {
  const url = new URL(ctx.req.url);
  const id = url.pathname.split("/").at(-2);

  if (!id) {
    return NextResponse.json(
      { error: "Missing experiment ID" },
      { status: 400 },
    );
  }

  const result = await getExperimentResults(id);
  if (!result) {
    return NextResponse.json(
      { error: "Experiment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
});
