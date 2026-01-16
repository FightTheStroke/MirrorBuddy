import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/session-auth';
import { AdaptiveContextQuerySchema } from '@/lib/validation/schemas/adaptive';
import {
  buildAdaptiveInstruction,
  getAdaptiveContextForUser,
} from '@/lib/education/adaptive-difficulty';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: auth.error || 'No user' }, { status: 401 });
    }
    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const queryValidation = AdaptiveContextQuerySchema.safeParse({
      subject: searchParams.get('subject') || undefined,
      baselineDifficulty: searchParams.get('baselineDifficulty') || undefined,
      pragmatic: searchParams.get('pragmatic') || undefined,
      source: searchParams.get('source') || undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid adaptive context query',
          details: queryValidation.error.issues.map((issue) => issue.message),
        },
        { status: 400 }
      );
    }

    const pragmatic = queryValidation.data.pragmatic === 'true';
    const context = await getAdaptiveContextForUser(userId, {
      subject: queryValidation.data.subject,
      baselineDifficulty: queryValidation.data.baselineDifficulty,
      pragmatic,
    });

    return NextResponse.json({
      context,
      instruction: buildAdaptiveInstruction(context),
    });
  } catch (error) {
    logger.error('[AdaptiveDifficulty] Context GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to load adaptive context' },
      { status: 500 }
    );
  }
}
