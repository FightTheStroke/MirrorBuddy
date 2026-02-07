import { NextResponse } from "next/server";
import { AdaptiveContextQuerySchema } from "@/lib/validation/schemas/adaptive";
import { buildAdaptiveInstruction } from "@/lib/education";
import { getAdaptiveContextForUser } from "@/lib/education/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/adaptive/context"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const queryValidation = AdaptiveContextQuerySchema.safeParse({
    subject: searchParams.get("subject") || undefined,
    baselineDifficulty: searchParams.get("baselineDifficulty") || undefined,
    pragmatic: searchParams.get("pragmatic") || undefined,
    source: searchParams.get("source") || undefined,
  });

  if (!queryValidation.success) {
    return NextResponse.json(
      {
        error: "Invalid adaptive context query",
        details: queryValidation.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const pragmatic = queryValidation.data.pragmatic === "true";
  const context = await getAdaptiveContextForUser(userId, {
    subject: queryValidation.data.subject,
    baselineDifficulty: queryValidation.data.baselineDifficulty,
    pragmatic,
  });

  return NextResponse.json({
    context,
    instruction: buildAdaptiveInstruction(context),
  });
});
