import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/session-auth';
import { AdaptiveSignalsPayloadSchema } from '@/lib/validation/schemas/adaptive';
import { normalizeAdaptiveDifficultyMode, recordAdaptiveSignal } from '@/lib/education/adaptive-difficulty';
import type { AdaptiveSignalInput } from '@/types/adaptive-difficulty';

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: auth.error || 'No user' }, { status: 401 });
    }
    const userId = auth.userId;

    const body = await request.json();
    const validation = AdaptiveSignalsPayloadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid adaptive signal payload',
          details: validation.error.issues.map((issue) => issue.message),
        },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { adaptiveDifficultyMode: true },
    });
    const mode = normalizeAdaptiveDifficultyMode(settings?.adaptiveDifficultyMode);

    let latestProfile = null;
    for (const signal of validation.data.signals) {
      const metadata = signal.metadata as AdaptiveSignalInput['metadata'];
      latestProfile = await recordAdaptiveSignal(userId, { ...signal, mode, metadata });
    }

    return NextResponse.json({ ok: true, profile: latestProfile });
  } catch (error) {
    logger.error('[AdaptiveDifficulty] Signals POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to record adaptive signals' },
      { status: 500 }
    );
  }
}
