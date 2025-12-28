// ============================================================================
// API ROUTE: User progress (gamification)
// GET: Get current progress
// PUT: Update progress
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

    let progress = await prisma.progress.findUnique({
      where: { userId },
    });

    if (!progress) {
      // Create default progress
      progress = await prisma.progress.create({
        data: { userId },
      });
    }

    // Parse JSON fields
    return NextResponse.json({
      ...progress,
      achievements: JSON.parse(progress.achievements || '[]'),
      masteries: JSON.parse(progress.masteries || '[]'),
      streak: {
        current: progress.streakCurrent,
        longest: progress.streakLongest,
        lastStudyDate: progress.lastStudyDate,
      },
    });
  } catch (error) {
    logger.error('Progress GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get progress' },
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

    // Map from frontend format to database format
    const updateData: Record<string, unknown> = {};

    if (data.xp !== undefined) updateData.xp = data.xp;
    if (data.level !== undefined) updateData.level = data.level;
    if (data.totalStudyMinutes !== undefined) updateData.totalStudyMinutes = data.totalStudyMinutes;
    if (data.questionsAsked !== undefined) updateData.questionsAsked = data.questionsAsked;
    if (data.sessionsThisWeek !== undefined) updateData.sessionsThisWeek = data.sessionsThisWeek;

    // Handle streak object
    if (data.streak) {
      if (data.streak.current !== undefined) updateData.streakCurrent = data.streak.current;
      if (data.streak.longest !== undefined) updateData.streakLongest = data.streak.longest;
      if (data.streak.lastStudyDate !== undefined) {
        updateData.lastStudyDate = new Date(data.streak.lastStudyDate);
      }
    }

    // Handle JSON arrays
    if (data.achievements !== undefined) {
      updateData.achievements = JSON.stringify(data.achievements);
    }
    if (data.masteries !== undefined) {
      updateData.masteries = JSON.stringify(data.masteries);
    }

    const progress = await prisma.progress.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });

    return NextResponse.json({
      ...progress,
      achievements: JSON.parse(progress.achievements || '[]'),
      masteries: JSON.parse(progress.masteries || '[]'),
      streak: {
        current: progress.streakCurrent,
        longest: progress.streakLongest,
        lastStudyDate: progress.lastStudyDate,
      },
    });
  } catch (error) {
    logger.error('Progress PUT error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
