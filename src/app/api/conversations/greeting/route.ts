// ============================================================================
// API ROUTE: Contextual Greeting
// GET: Fetch personalized greeting based on previous conversation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/session-auth';
import { logger } from '@/lib/logger';
import { getGreetingForCharacter } from '@/lib/conversation/contextual-greeting';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ greeting: null, hasContext: false });
    }
    const userId = auth.userId!;

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');
    const studentName = searchParams.get('studentName');
    const maestroName = searchParams.get('maestroName');

    if (!characterId || !studentName || !maestroName) {
      return NextResponse.json(
        { error: 'Missing required parameters: characterId, studentName, maestroName' },
        { status: 400 }
      );
    }

    // Get contextual greeting (returns null if no previous conversation)
    const result = await getGreetingForCharacter(
      userId,
      characterId,
      studentName,
      maestroName
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
    logger.error('Contextual greeting error', { error: String(error) });
    // Return null greeting on error - client will use default
    return NextResponse.json({ greeting: null, hasContext: false });
  }
}
