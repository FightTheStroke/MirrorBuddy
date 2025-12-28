// ============================================================================
// API ROUTE: User settings
// GET: Get current settings
// PUT: Update settings
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

    let settings = await prisma.settings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.settings.create({
        data: { userId },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Settings GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const data = await request.json();

    // Remove fields that shouldn't be updated directly
    delete data.id;
    delete data.userId;
    delete data.createdAt;
    delete data.updatedAt;

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Settings PUT error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
