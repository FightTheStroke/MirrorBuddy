// ============================================================================
// API ROUTE: Parent-Professor Chat Consent (Issue #63)
// GET: Check if user has consented
// POST: Record consent
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { parentChatConsentAt: true },
    });

    return NextResponse.json({
      hasConsented: !!settings?.parentChatConsentAt,
      consentedAt: settings?.parentChatConsentAt || null,
    });
  } catch (error) {
    logger.error('Parent consent GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to check consent' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    // Upsert settings with consent timestamp
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: { parentChatConsentAt: new Date() },
      create: {
        userId,
        parentChatConsentAt: new Date(),
      },
    });

    logger.info('Parent chat consent recorded', { userId });

    return NextResponse.json({
      success: true,
      consentedAt: settings.parentChatConsentAt,
    });
  } catch (error) {
    logger.error('Parent consent POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    );
  }
}
