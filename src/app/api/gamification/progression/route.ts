/**
 * API Route: Gamification Progression
 * GET /api/gamification/progression
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getProgression } from '@/lib/gamification/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
