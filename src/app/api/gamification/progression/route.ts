/**
 * API Route: Gamification Progression
 * GET /api/gamification/progression
 */

import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/session-auth';
import { getProgression } from '@/lib/gamification/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const progression = await getProgression(userId);

    return NextResponse.json({
      success: true,
      ...progression,
    });
  } catch (error) {
    logger.error('Failed to get progression', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get progression' },
      { status: 500 }
    );
  }
}
