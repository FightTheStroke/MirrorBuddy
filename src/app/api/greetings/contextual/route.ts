/**
 * API Route: Contextual Greeting
 *
 * GET /api/greetings/contextual?characterId=xxx
 *
 * Generates a contextual greeting based on previous conversation with this character.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { getGreetingForCharacter } from "@/lib/conversation/contextual-greeting";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
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
  } catch (error) {
    logger.error("Failed to get contextual greeting", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get greeting" },
      { status: 500 },
    );
  }
}
