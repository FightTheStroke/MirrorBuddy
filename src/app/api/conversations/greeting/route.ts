// ============================================================================
// API ROUTE: Contextual Greeting
// POST: Generate a contextual greeting based on previous conversation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGreetingForCharacter } from '@/lib/conversation/contextual-greeting';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('mirrorbuddy-user-id')?.value;
    const body = await request.json();
    const { userId, characterId, studentName, maestroName } = body;

    // Use cookie userId if not provided in body
    const effectiveUserId = userId || cookieUserId;

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    if (!characterId || !studentName || !maestroName) {
      return NextResponse.json(
        { error: 'characterId, studentName, and maestroName are required' },
        { status: 400 }
      );
    }

    const result = await getGreetingForCharacter(
      effectiveUserId,
      characterId,
      studentName,
      maestroName
    );

    if (!result) {
      return NextResponse.json({
        success: true,
        hasContext: false,
        greeting: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasContext: result.hasContext,
      greeting: result.greeting,
      topics: result.topics,
    });
  } catch (error) {
    console.error('Greeting API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate greeting' },
      { status: 500 }
    );
  }
}
