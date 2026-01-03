// ============================================================================
// API ROUTE: Autonomy Metrics (T-14) + Method Progress (Issue #28)
// GET: Calculate and return autonomy metrics for the student
// POST: Save method progress data
// Analyzes study patterns, tool usage, and learning independence
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DEFAULT_METHOD_PROGRESS } from '@/lib/method-progress/types';

/**
 * Autonomy metrics provide insights into how independently a student is learning.
 * These metrics are used for:
 * 1. Parent dashboard - showing learning progress
 * 2. Coach suggestions - identifying when student needs support
 * 3. Gamification - rewarding autonomous behavior
 */
interface AutonomyMetrics {
  // Overall independence score (0-100)
  independenceScore: number;

  // Self-regulation metrics
  selfRegulation: {
    streakConsistency: number; // How consistent their daily study is
    studyTimeDistribution: number; // Regular vs cramming (0 = cramming, 100 = regular)
    taskCompletionRate: number; // % of started tasks completed
  };

  // Tool usage patterns
  toolUsage: {
    flashcardsActive: boolean;
    flashcardRetention: number; // Average retrievability
    quizParticipation: number; // Quizzes taken in last 30 days
    averageQuizScore: number;
    mindMapsCreated: number;
  };

  // Learning patterns
  learningPatterns: {
    averageSessionDuration: number; // Minutes
    questionsPerSession: number;
    preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night' | 'varied';
    subjectsExplored: number;
    maestrosUsed: number;
  };

  // Growth indicators
  growth: {
    xpGrowthRate: number; // XP gained per week (avg)
    levelProgress: number; // Progress to next level (0-100)
    improvementTrend: 'improving' | 'stable' | 'declining';
  };

  // Time-based data for charts
  weeklyActivity: Array<{
    day: string;
    studyMinutes: number;
    xpEarned: number;
  }>;

  // Metadata
  lastCalculated: string;
  dataQuality: 'high' | 'medium' | 'low'; // Based on amount of data available
}

export async function GET(request: NextRequest) {
  try {
    // Check for userId in query params (for method progress fetch)
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');

    // If userId is provided, return method progress data
    if (queryUserId) {
      const result = await getMethodProgress(queryUserId);
      return NextResponse.json(result);
    }

    // Otherwise, get userId from cookies for autonomy metrics
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    // Fetch all relevant data in parallel
    const [progress, sessions, flashcards, quizResults, _learnings, methodProgress] = await Promise.all([
      prisma.progress.findUnique({ where: { userId } }),
      prisma.studySession.findMany({
        where: { userId, startedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.flashcardProgress.findMany({ where: { userId } }),
      prisma.quizResult.findMany({
        where: { userId, completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.learning.findMany({ where: { userId } }),
      prisma.methodProgress.findUnique({ where: { userId } }),
    ]);

    // Calculate data quality based on available data
    const dataPoints = [sessions.length, flashcards.length, quizResults.length].filter(n => n > 0).length;
    const dataQuality: 'high' | 'medium' | 'low' = dataPoints >= 3 ? 'high' : dataPoints >= 2 ? 'medium' : 'low';

    // Calculate self-regulation metrics
    const streakConsistency = calculateStreakConsistency(progress);
    const studyTimeDistribution = calculateStudyTimeDistribution(sessions);
    const taskCompletionRate = calculateTaskCompletionRate(sessions);

    // Calculate tool usage
    const flashcardRetention = calculateFlashcardRetention(flashcards);
    const averageQuizScore = calculateAverageQuizScore(quizResults);
    const mindMapsCreated = calculateMindMapsCreated(methodProgress);

    // Calculate learning patterns
    const avgSessionDuration = calculateAverageSessionDuration(sessions);
    const questionsPerSession = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.questions, 0) / sessions.length)
      : 0;
    const preferredStudyTime = determinePreferredStudyTime(sessions);
    const uniqueSubjects = new Set(sessions.map(s => s.subject)).size;
    const uniqueMaestros = new Set(sessions.map(s => s.maestroId)).size;

    // Calculate growth indicators
    const xpGrowthRate = calculateXpGrowthRate(sessions);
    const levelProgress = progress ? ((progress.xp % 1000) / 1000) * 100 : 0;
    const improvementTrend = determineImprovementTrend(quizResults);

    // Calculate overall independence score (weighted average)
    const independenceScore = Math.round(
      (streakConsistency * 0.25) +
      (studyTimeDistribution * 0.2) +
      (taskCompletionRate * 0.15) +
      (flashcardRetention * 0.15) +
      (averageQuizScore * 0.15) +
      (Math.min(uniqueMaestros * 10, 100) * 0.1)
    );

    // Calculate weekly activity
    const weeklyActivity = calculateWeeklyActivity(sessions);

    const metrics: AutonomyMetrics = {
      independenceScore,
      selfRegulation: {
        streakConsistency,
        studyTimeDistribution,
        taskCompletionRate,
      },
      toolUsage: {
        flashcardsActive: flashcards.length > 0,
        flashcardRetention,
        quizParticipation: quizResults.length,
        averageQuizScore,
        mindMapsCreated,
      },
      learningPatterns: {
        averageSessionDuration: avgSessionDuration,
        questionsPerSession,
        preferredStudyTime,
        subjectsExplored: uniqueSubjects,
        maestrosUsed: uniqueMaestros,
      },
      growth: {
        xpGrowthRate,
        levelProgress: Math.round(levelProgress),
        improvementTrend,
      },
      weeklyActivity,
      lastCalculated: new Date().toISOString(),
      dataQuality,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Autonomy metrics GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to calculate autonomy metrics' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateStreakConsistency(progress: { streakCurrent: number; streakLongest: number } | null): number {
  if (!progress) return 0;
  if (progress.streakLongest === 0) return 0;
  // Score based on current streak relative to longest, capped at 100
  return Math.min(Math.round((progress.streakCurrent / Math.max(progress.streakLongest, 7)) * 100), 100);
}

function calculateStudyTimeDistribution(sessions: Array<{ startedAt: Date; duration: number | null }>): number {
  if (sessions.length < 7) return 50; // Not enough data

  // Group sessions by day of week
  const dayStudyMinutes: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  sessions.forEach(s => {
    const day = s.startedAt.getDay();
    dayStudyMinutes[day] += s.duration || 0;
  });

  const values = Object.values(dayStudyMinutes);
  const avg = values.reduce((a, b) => a + b, 0) / 7;

  // If study is evenly distributed, score is high
  // If cramming (high variance), score is low
  if (avg === 0) return 50;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / 7;
  const coefficient = Math.sqrt(variance) / avg;

  // Lower coefficient = more consistent = higher score
  return Math.max(0, Math.min(100, Math.round(100 - coefficient * 50)));
}

function calculateTaskCompletionRate(sessions: Array<{ endedAt: Date | null }>): number {
  if (sessions.length === 0) return 100; // No sessions = no incomplete tasks
  const completed = sessions.filter(s => s.endedAt !== null).length;
  return Math.round((completed / sessions.length) * 100);
}

function calculateFlashcardRetention(flashcards: Array<{ retrievability: number }>): number {
  if (flashcards.length === 0) return 0;
  const avgRetrievability = flashcards.reduce((sum, f) => sum + f.retrievability, 0) / flashcards.length;
  return Math.round(avgRetrievability * 100);
}

function calculateAverageQuizScore(quizResults: Array<{ percentage: number }>): number {
  if (quizResults.length === 0) return 0;
  return Math.round(quizResults.reduce((sum, q) => sum + q.percentage, 0) / quizResults.length);
}

function calculateMindMapsCreated(methodProgress: { mindMaps: string } | null): number {
  if (!methodProgress) return 0;
  try {
    const mindMaps = JSON.parse(methodProgress.mindMaps) as {
      createdAlone: number;
      createdWithHints: number;
      createdWithFullHelp: number;
    };
    return (mindMaps.createdAlone || 0) + (mindMaps.createdWithHints || 0) + (mindMaps.createdWithFullHelp || 0);
  } catch {
    return 0;
  }
}

function calculateAverageSessionDuration(sessions: Array<{ duration: number | null }>): number {
  const sessionsWithDuration = sessions.filter(s => s.duration !== null && s.duration > 0);
  if (sessionsWithDuration.length === 0) return 0;
  return Math.round(sessionsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsWithDuration.length);
}

function determinePreferredStudyTime(sessions: Array<{ startedAt: Date }>): 'morning' | 'afternoon' | 'evening' | 'night' | 'varied' {
  if (sessions.length < 3) return 'varied';

  const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  sessions.forEach(s => {
    const hour = s.startedAt.getHours();
    if (hour >= 5 && hour < 12) timeSlots.morning++;
    else if (hour >= 12 && hour < 17) timeSlots.afternoon++;
    else if (hour >= 17 && hour < 21) timeSlots.evening++;
    else timeSlots.night++;
  });

  const max = Math.max(...Object.values(timeSlots));
  const total = sessions.length;

  // If dominant slot has >50% of sessions, return that slot
  for (const [slot, count] of Object.entries(timeSlots)) {
    if (count === max && count / total > 0.5) {
      return slot as 'morning' | 'afternoon' | 'evening' | 'night';
    }
  }

  return 'varied';
}

function calculateXpGrowthRate(sessions: Array<{ xpEarned: number; startedAt: Date }>): number {
  if (sessions.length === 0) return 0;

  // Group XP by week
  const weeklyXp: Record<string, number> = {};
  sessions.forEach(s => {
    const week = getWeekKey(s.startedAt);
    weeklyXp[week] = (weeklyXp[week] || 0) + s.xpEarned;
  });

  const weeks = Object.values(weeklyXp);
  if (weeks.length === 0) return 0;

  return Math.round(weeks.reduce((a, b) => a + b, 0) / weeks.length);
}

function getWeekKey(date: Date): string {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return startOfWeek.toISOString().split('T')[0];
}

function determineImprovementTrend(quizResults: Array<{ percentage: number; completedAt: Date }>): 'improving' | 'stable' | 'declining' {
  if (quizResults.length < 3) return 'stable';

  // Sort by date (oldest first)
  const sorted = [...quizResults].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

  // Compare first half average to second half average
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, q) => sum + q.percentage, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, q) => sum + q.percentage, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

function calculateWeeklyActivity(sessions: Array<{ startedAt: Date; duration: number | null; xpEarned: number }>): Array<{ day: string; studyMinutes: number; xpEarned: number }> {
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const now = new Date();
  const result: Array<{ day: string; studyMinutes: number; xpEarned: number }> = [];

  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const daySessions = sessions.filter(s => s.startedAt >= date && s.startedAt < nextDate);
    const studyMinutes = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const xpEarned = daySessions.reduce((sum, s) => sum + s.xpEarned, 0);

    result.push({
      day: days[date.getDay()],
      studyMinutes,
      xpEarned,
    });
  }

  return result;
}

// ============================================================================
// POST: Save Method Progress (Issue #28)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, mindMaps, flashcards, selfAssessment, helpBehavior, methodTransfer, events, autonomyScore } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Upsert method progress
    const methodProgress = await prisma.methodProgress.upsert({
      where: { userId },
      create: {
        userId,
        mindMaps: JSON.stringify(mindMaps || DEFAULT_METHOD_PROGRESS.mindMaps),
        flashcards: JSON.stringify(flashcards || DEFAULT_METHOD_PROGRESS.flashcards),
        selfAssessment: JSON.stringify(selfAssessment || DEFAULT_METHOD_PROGRESS.selfAssessment),
        helpBehavior: JSON.stringify(helpBehavior || DEFAULT_METHOD_PROGRESS.helpBehavior),
        methodTransfer: JSON.stringify(methodTransfer || DEFAULT_METHOD_PROGRESS.methodTransfer),
        events: JSON.stringify(events || []),
        autonomyScore: autonomyScore || 0,
      },
      update: {
        mindMaps: JSON.stringify(mindMaps || DEFAULT_METHOD_PROGRESS.mindMaps),
        flashcards: JSON.stringify(flashcards || DEFAULT_METHOD_PROGRESS.flashcards),
        selfAssessment: JSON.stringify(selfAssessment || DEFAULT_METHOD_PROGRESS.selfAssessment),
        helpBehavior: JSON.stringify(helpBehavior || DEFAULT_METHOD_PROGRESS.helpBehavior),
        methodTransfer: JSON.stringify(methodTransfer || DEFAULT_METHOD_PROGRESS.methodTransfer),
        events: JSON.stringify(events || []),
        autonomyScore: autonomyScore || 0,
      },
    });

    logger.info('Method progress saved', { userId, autonomyScore: methodProgress.autonomyScore });

    return NextResponse.json({
      success: true,
      data: {
        id: methodProgress.id,
        autonomyScore: methodProgress.autonomyScore,
        updatedAt: methodProgress.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Method progress POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to save method progress' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET with userId query param: Fetch Method Progress for store sync
// ============================================================================

export async function getMethodProgress(userId: string) {
  try {
    const methodProgress = await prisma.methodProgress.findUnique({
      where: { userId },
    });

    if (!methodProgress) {
      return {
        success: true,
        data: {
          ...DEFAULT_METHOD_PROGRESS,
          userId,
        },
      };
    }

    return {
      success: true,
      data: {
        userId: methodProgress.userId,
        mindMaps: JSON.parse(methodProgress.mindMaps),
        flashcards: JSON.parse(methodProgress.flashcards),
        selfAssessment: JSON.parse(methodProgress.selfAssessment),
        helpBehavior: JSON.parse(methodProgress.helpBehavior),
        methodTransfer: JSON.parse(methodProgress.methodTransfer),
        events: JSON.parse(methodProgress.events),
        autonomyScore: methodProgress.autonomyScore,
        updatedAt: methodProgress.updatedAt,
      },
    };
  } catch (error) {
    logger.error('Get method progress error', { error: String(error), userId });
    return {
      success: false,
      error: 'Failed to fetch method progress',
    };
  }
}
