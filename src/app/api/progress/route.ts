// ============================================================================
// API ROUTE: User progress (gamification)
// GET: Get current progress
// PUT: Update progress
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { serverNotifications } from '@/lib/notifications/server-triggers';

// #92: Zod schema for progress validation
const ProgressUpdateSchema = z.object({
  xp: z.number().int().min(0).max(1000000).optional(),
  level: z.number().int().min(1).max(100).optional(),
  totalStudyMinutes: z.number().int().min(0).max(100000).optional(),
  questionsAsked: z.number().int().min(0).max(100000).optional(),
  sessionsThisWeek: z.number().int().min(0).max(1000).optional(),
  streak: z.object({
    current: z.number().int().min(0).max(10000).optional(),
    longest: z.number().int().min(0).max(10000).optional(),
    lastStudyDate: z.string().datetime().or(z.date()).optional(),
  }).optional(),
  achievements: z.array(z.object({
    id: z.string(),
    name: z.string().max(100),
    description: z.string().max(500).optional(),
    unlockedAt: z.string().datetime().or(z.date()).optional(),
  })).max(100).optional(),
  masteries: z.array(z.object({
    subject: z.string().max(50),
    level: z.number().int().min(0).max(100),
    xp: z.number().int().min(0).optional(),
  })).max(50).optional(),
}).strict();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

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
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const body = await request.json();

    // #92: Validate with Zod before processing
    const validation = ProgressUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid progress data',
          details: validation.error.issues.map(i => i.message),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get current progress for comparison (to detect level ups, streak milestones)
    const currentProgress = await prisma.progress.findUnique({
      where: { userId },
    });

    const oldLevel = currentProgress?.level ?? 1;
    const oldStreak = currentProgress?.streakCurrent ?? 0;
    const oldAchievements = currentProgress?.achievements
      ? JSON.parse(currentProgress.achievements)
      : [];

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

    // --- Trigger notifications for progress milestones ---

    // Level up notification
    const newLevel = data.level ?? oldLevel;
    if (newLevel > oldLevel) {
      serverNotifications.levelUp(userId, newLevel).catch((err) => {
        logger.error('Failed to send level up notification', { error: String(err) });
      });
    }

    // Streak milestone notification
    const newStreak = data.streak?.current ?? oldStreak;
    if (newStreak > oldStreak) {
      serverNotifications.streakMilestone(userId, newStreak).catch((err) => {
        logger.error('Failed to send streak notification', { error: String(err) });
      });
    }

    // New achievement notification
    if (data.achievements && Array.isArray(data.achievements)) {
      const oldAchievementIds = new Set(oldAchievements.map((a: { id: string }) => a.id));
      const newAchievements = data.achievements.filter(
        (a) => !oldAchievementIds.has(a.id)
      );

      for (const achievement of newAchievements) {
        serverNotifications
          .achievement(userId, achievement.id, achievement.name, achievement.description || '')
          .catch((err) => {
            logger.error('Failed to send achievement notification', { error: String(err) });
          });
      }
    }

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
