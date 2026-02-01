/**
 * API Route: Parent Dashboard Activity
 * GET /api/parent-dashboard/activity
 * Returns activity data for parent dashboard overview
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { getMaestroById, SUBJECT_NAMES } from "@/data/maestri";
import type { ParentDashboardActivity } from "@/types";

export const GET = pipe(
  withSentry("/api/parent-dashboard/activity"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Get dates for weekly stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Parallel fetch all required data
  const [weeklySessions, recentSessions, quizResults, progress, gamification] =
    await Promise.all([
      // Weekly sessions for stats
      prisma.studySession.findMany({
        where: { userId, startedAt: { gte: weekAgo } },
        select: { duration: true, xpEarned: true, questions: true },
      }),
      // Recent sessions (last 10) for display
      prisma.studySession.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          id: true,
          maestroId: true,
          subject: true,
          startedAt: true,
          duration: true,
          xpEarned: true,
        },
      }),
      // Quiz results for stats
      prisma.quizResult.findMany({
        where: { userId },
        select: { subject: true, percentage: true },
      }),
      // Progress for streak and totals
      prisma.progress.findUnique({
        where: { userId },
        select: {
          xp: true,
          level: true,
          seasonMirrorBucks: true,
          streakCurrent: true,
          streakLongest: true,
          lastStudyDate: true,
          totalStudyMinutes: true,
        },
      }),
      // Gamification for streak details
      prisma.userGamification.findUnique({
        where: { userId },
        include: { streak: true },
      }),
    ]);

  // Get sessions for subject breakdown (last 30 days)
  const subjectSessions = await prisma.studySession.findMany({
    where: { userId, startedAt: { gte: thirtyDaysAgo } },
    select: { subject: true, duration: true },
  });

  // Get active days for streak calendar (last 30 days)
  const activeDays = await getActiveDays(userId, thirtyDaysAgo);

  // Calculate weekly stats
  const weeklyStats = {
    totalMinutes: weeklySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
    sessionsCount: weeklySessions.length,
    xpEarned: weeklySessions.reduce((sum, s) => sum + s.xpEarned, 0),
    mirrorBucksEarned: progress?.seasonMirrorBucks || 0,
    questionsAsked: weeklySessions.reduce((sum, s) => sum + s.questions, 0),
  };

  // Map recent sessions with maestro names
  const mappedSessions = recentSessions.map((session) => {
    const maestro = getMaestroById(session.maestroId);
    return {
      id: session.id,
      maestroId: session.maestroId,
      maestroName: maestro?.displayName || session.maestroId,
      subject: session.subject,
      startedAt: session.startedAt.toISOString(),
      duration: session.duration,
      xpEarned: session.xpEarned,
    };
  });

  // Calculate subject breakdown
  const subjectMap = new Map<string, { minutes: number; count: number }>();
  let totalSubjectMinutes = 0;
  for (const s of subjectSessions) {
    const mins = s.duration || 0;
    const existing = subjectMap.get(s.subject) || { minutes: 0, count: 0 };
    subjectMap.set(s.subject, {
      minutes: existing.minutes + mins,
      count: existing.count + 1,
    });
    totalSubjectMinutes += mins;
  }

  const subjectBreakdown = Array.from(subjectMap.entries())
    .map(([subject, data]) => ({
      subject,
      subjectName: SUBJECT_NAMES[subject] || subject,
      minutes: data.minutes,
      percentage:
        totalSubjectMinutes > 0
          ? Math.round((data.minutes / totalSubjectMinutes) * 100)
          : 0,
      sessionsCount: data.count,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  // Calculate quiz stats
  const quizStats = calculateQuizStats(quizResults);

  // Build streak info
  const streakInfo = {
    currentStreak: progress?.streakCurrent || 0,
    longestStreak: progress?.streakLongest || 0,
    lastActivityDate: progress?.lastStudyDate?.toISOString() || null,
    todayMinutes: gamification?.streak?.todayMinutes || 0,
    dailyGoalMinutes: gamification?.streak?.dailyGoalMinutes || 30,
    goalMetToday: gamification?.streak?.goalMetToday || false,
    activeDays,
  };

  const response: ParentDashboardActivity = {
    weeklyStats,
    recentSessions: mappedSessions,
    subjectBreakdown,
    quizStats,
    streak: streakInfo,
    gamification: {
      totalXp: progress?.xp || 0,
      level: progress?.level || 1,
      mirrorBucks: progress?.seasonMirrorBucks || 0,
    },
  };

  return NextResponse.json(response);
});

function calculateQuizStats(
  results: { subject: string | null; percentage: number }[],
) {
  if (results.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      bestScore: 0,
      bySubject: [],
    };
  }

  const totalAttempts = results.length;
  const averageScore = Math.round(
    results.reduce((sum, r) => sum + r.percentage, 0) / totalAttempts,
  );
  const bestScore = Math.round(Math.max(...results.map((r) => r.percentage)));

  // Group by subject
  const subjectMap = new Map<string, number[]>();
  for (const r of results) {
    const subject = r.subject || "general";
    const scores = subjectMap.get(subject) || [];
    scores.push(r.percentage);
    subjectMap.set(subject, scores);
  }

  const bySubject = Array.from(subjectMap.entries()).map(
    ([subject, scores]) => ({
      subject,
      subjectName: SUBJECT_NAMES[subject] || subject,
      attempts: scores.length,
      averageScore: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length,
      ),
      bestScore: Math.round(Math.max(...scores)),
    }),
  );

  return { totalAttempts, averageScore, bestScore, bySubject };
}

async function getActiveDays(userId: string, since: Date): Promise<string[]> {
  const sessions = await prisma.studySession.findMany({
    where: { userId, startedAt: { gte: since } },
    select: { startedAt: true },
  });

  const daySet = new Set<string>();
  for (const s of sessions) {
    daySet.add(s.startedAt.toISOString().split("T")[0]);
  }

  return Array.from(daySet).sort();
}
