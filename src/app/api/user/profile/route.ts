// ============================================================================
// API ROUTE: User profile
// GET: Get current profile
// PUT: Update profile
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

    let profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create default profile
      profile = await prisma.profile.create({
        data: { userId },
      });
    }

    // Parse learningGoals from JSON string
    return NextResponse.json({
      ...profile,
      learningGoals: JSON.parse(profile.learningGoals || '[]'),
    });
  } catch (error) {
    logger.error('Profile GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get profile' },
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

    // Remove accessibility object - it belongs to Settings, not Profile
    delete data.accessibility;

    // Stringify learningGoals if it's an array
    if (Array.isArray(data.learningGoals)) {
      data.learningGoals = JSON.stringify(data.learningGoals);
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return NextResponse.json({
      ...profile,
      learningGoals: JSON.parse(profile.learningGoals || '[]'),
    });
  } catch (error) {
    logger.error('Profile PUT error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
