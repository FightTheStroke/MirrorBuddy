/**
 * Run Experiment - Trigger simulation + TutorBench scoring
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { runExperiment } from "@/lib/research/experiment-service";

export const POST = pipe(
  withSentry("/api/admin/research/experiments/[id]/run"),
  withCSRF,
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

  try {
    const result = await runExperiment(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
