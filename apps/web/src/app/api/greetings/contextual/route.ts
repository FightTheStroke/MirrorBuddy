/**
 * API Route: Contextual Greeting
 *
 * GET /api/greetings/contextual?characterId=xxx
 *
 * Generates a contextual greeting based on previous conversation with this character.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import { getGreetingForCharacter } from "@/lib/conversation/contextual-greeting";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/greetings/contextual"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const characterId = searchParams.get("characterId");
  const studentName = searchParams.get("studentName");
  const maestroName = searchParams.get("maestroName");

  if (!characterId || !studentName || !maestroName) {
    return NextResponse.json(
      { error: "characterId, studentName, and maestroName are required" },
      { status: 400 },
    );
  }

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
