// ============================================================================
// API ROUTE: Contextual Greeting
// GET: Fetch personalized greeting based on previous conversation
// ============================================================================

import { NextResponse } from "next/server";
import { getGreetingForCharacter } from "@/lib/conversation/contextual-greeting";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/conversations/greeting"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const characterId = searchParams.get("characterId");
  const studentName = searchParams.get("studentName");
  const maestroName = searchParams.get("maestroName");

  if (!characterId || !studentName || !maestroName) {
    return NextResponse.json(
      {
        error:
          "Missing required parameters: characterId, studentName, maestroName",
      },
      { status: 400 },
    );
  }

  // Get contextual greeting (returns null if no previous conversation)
  const result = await getGreetingForCharacter(
    userId,
    characterId,
    studentName,
    maestroName,
  );

  if (!result) {
    return NextResponse.json({ greeting: null, hasContext: false });
  }

  return NextResponse.json({
    greeting: result.greeting,
    hasContext: result.hasContext,
    topics: result.topics,
  });
});
