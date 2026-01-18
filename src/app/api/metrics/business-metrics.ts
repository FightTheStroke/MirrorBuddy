/**
 * Business Metrics for Product Analytics
 *
 * Metrics for understanding user engagement and product adoption:
 * - Active Users (DAU/WAU/MAU)
 * - Conversion & Retention (onboarding, voice adoption, D1/D7/D30)
 * - Maestri & Learning (sessions per maestro, XP, streaks)
 * - Feature Adoption (quizzes, flashcards, mind maps)
 */

import { prisma } from "@/lib/db";

interface MetricLine {
  name: string;
  type: "counter" | "gauge";
  help: string;
  labels: Record<string, string>;
  value: number;
}

/**
 * Generate business metrics from database
 */
export async function generateBusinessMetrics(): Promise<MetricLine[]> {
  const metrics: MetricLine[] = [];
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // User Engagement (DAU/WAU/MAU)
  const userMetrics = await getUserEngagementMetrics(dayAgo, weekAgo, monthAgo);
  metrics.push(...userMetrics);

  // Conversion & Retention
  const conversionMetrics = await getConversionMetrics();
  metrics.push(...conversionMetrics);

  // Maestri Usage
  const maestriMetrics = await getMaestriUsageMetrics(dayAgo, now);
  metrics.push(...maestriMetrics);

  // Learning Progress
  const learningMetrics = await getLearningMetrics(dayAgo, now);
  metrics.push(...learningMetrics);

  return metrics;
}

/**
 * Calculate active users (DAU/WAU/MAU)
 */
async function getUserEngagementMetrics(
  dayAgo: Date,
  weekAgo: Date,
  monthAgo: Date
): Promise<MetricLine[]> {
  // DAU: Users with sessions in last 24h
  const dau = await prisma.studySession.groupBy({
    by: ["userId"],
    where: { startedAt: { gte: dayAgo } },
  });

  // WAU: Users with sessions in last 7 days
  const wau = await prisma.studySession.groupBy({
    by: ["userId"],
    where: { startedAt: { gte: weekAgo } },
  });

  // MAU: Users with sessions in last 30 days
  const mau = await prisma.studySession.groupBy({
    by: ["userId"],
    where: { startedAt: { gte: monthAgo } },
  });

  // New users today
  const newUsersToday = await prisma.user.count({
    where: { createdAt: { gte: dayAgo } },
  });

  return [
    {
      name: "mirrorbuddy_active_users",
      type: "gauge",
      help: "Active users by period",
      labels: { period: "24h" },
      value: dau.length,
    },
    {
      name: "mirrorbuddy_active_users",
      type: "gauge",
      help: "Active users by period",
      labels: { period: "7d" },
      value: wau.length,
    },
    {
      name: "mirrorbuddy_active_users",
      type: "gauge",
      help: "Active users by period",
      labels: { period: "30d" },
      value: mau.length,
    },
    {
      name: "mirrorbuddy_new_users",
      type: "gauge",
      help: "New user registrations",
      labels: { period: "24h" },
      value: newUsersToday,
    },
  ];
}

/**
 * Calculate conversion and retention metrics
 */
async function getConversionMetrics(): Promise<MetricLine[]> {
  // Onboarding completion rate
  const totalUsers = await prisma.user.count();
  const completedOnboarding = await prisma.onboardingState.count({
    where: { hasCompletedOnboarding: true },
  });
  const onboardingRate = totalUsers > 0 ? completedOnboarding / totalUsers : 0;

  // Voice adoption: users who had at least one voice session
  const usersWithVoice = await prisma.telemetryEvent.groupBy({
    by: ["userId"],
    where: { category: "voice", action: "session_start" },
  });
  const voiceAdoptionRate =
    totalUsers > 0 ? usersWithVoice.length / totalUsers : 0;

  // Retention cohorts (simplified calculation)
  const retention = await calculateRetentionCohorts();

  return [
    {
      name: "mirrorbuddy_onboarding_completion_rate",
      type: "gauge",
      help: "Users completing onboarding",
      labels: {},
      value: onboardingRate,
    },
    {
      name: "mirrorbuddy_voice_adoption_rate",
      type: "gauge",
      help: "Users who tried voice sessions",
      labels: {},
      value: voiceAdoptionRate,
    },
    {
      name: "mirrorbuddy_retention_rate",
      type: "gauge",
      help: "User retention by cohort",
      labels: { cohort: "D1" },
      value: retention.d1,
    },
    {
      name: "mirrorbuddy_retention_rate",
      type: "gauge",
      help: "User retention by cohort",
      labels: { cohort: "D7" },
      value: retention.d7,
    },
    {
      name: "mirrorbuddy_retention_rate",
      type: "gauge",
      help: "User retention by cohort",
      labels: { cohort: "D30" },
      value: retention.d30,
    },
  ];
}

/**
 * Calculate retention cohorts (D1, D7, D30)
 */
async function calculateRetentionCohorts(): Promise<{
  d1: number;
  d7: number;
  d30: number;
}> {
  const now = new Date();

  // D1: Users who signed up 2-3 days ago and came back on day 2
  const d1CohortStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const d1CohortEnd = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const d1Users = await prisma.user.findMany({
    where: { createdAt: { gte: d1CohortStart, lte: d1CohortEnd } },
    select: { id: true },
  });

  let d1Returned = 0;
  for (const user of d1Users) {
    const returnSession = await prisma.studySession.findFirst({
      where: {
        userId: user.id,
        startedAt: {
          gte: new Date(d1CohortEnd.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    if (returnSession) d1Returned++;
  }
  const d1Rate = d1Users.length > 0 ? d1Returned / d1Users.length : 0;

  // D7: Users who signed up 8-14 days ago and came back on day 8+
  const d7CohortStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const d7CohortEnd = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

  const d7Users = await prisma.user.findMany({
    where: { createdAt: { gte: d7CohortStart, lte: d7CohortEnd } },
    select: { id: true },
  });

  let d7Returned = 0;
  for (const user of d7Users) {
    const returnSession = await prisma.studySession.findFirst({
      where: {
        userId: user.id,
        startedAt: {
          gte: new Date(d7CohortEnd.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    if (returnSession) d7Returned++;
  }
  const d7Rate = d7Users.length > 0 ? d7Returned / d7Users.length : 0;

  // D30: Users who signed up 31-60 days ago and came back on day 31+
  const d30CohortStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const d30CohortEnd = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

  const d30Users = await prisma.user.findMany({
    where: { createdAt: { gte: d30CohortStart, lte: d30CohortEnd } },
    select: { id: true },
  });

  let d30Returned = 0;
  for (const user of d30Users) {
    const returnSession = await prisma.studySession.findFirst({
      where: {
        userId: user.id,
        startedAt: {
          gte: new Date(d30CohortEnd.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });
    if (returnSession) d30Returned++;
  }
  const d30Rate = d30Users.length > 0 ? d30Returned / d30Users.length : 0;

  return { d1: d1Rate, d7: d7Rate, d30: d30Rate };
}

/**
 * Calculate maestri usage metrics
 */
async function getMaestriUsageMetrics(
  from: Date,
  to: Date
): Promise<MetricLine[]> {
  const sessionsByMaestro = await prisma.studySession.groupBy({
    by: ["maestroId"],
    where: { startedAt: { gte: from, lte: to } },
    _count: true,
  });

  return sessionsByMaestro.map((m) => ({
    name: "mirrorbuddy_maestro_sessions",
    type: "gauge" as const,
    help: "Sessions per maestro",
    labels: { period: "24h", maestro: m.maestroId },
    value: m._count,
  }));
}

/**
 * Calculate learning progress metrics
 */
async function getLearningMetrics(
  from: Date,
  to: Date
): Promise<MetricLine[]> {
  // XP earned today
  const xpToday = await prisma.studySession.aggregate({
    where: { startedAt: { gte: from, lte: to } },
    _sum: { xpEarned: true },
  });

  // Active streaks
  const activeStreaks = await prisma.dailyStreak.count({
    where: { currentStreak: { gt: 0 } },
  });

  // Max level
  const maxLevel = await prisma.progress.aggregate({
    _max: { level: true },
  });

  // Quizzes completed today
  const quizzesToday = await prisma.quizResult.count({
    where: { completedAt: { gte: from, lte: to } },
  });

  // Flashcards reviewed today
  const flashcardsToday = await prisma.flashcardProgress.count({
    where: { lastReview: { gte: from, lte: to } },
  });

  // Mind maps created today (from materials)
  const mindmapsToday = await prisma.material.count({
    where: { createdAt: { gte: from, lte: to }, toolType: "mindmap" },
  });

  return [
    {
      name: "mirrorbuddy_xp_earned",
      type: "gauge",
      help: "Total XP earned",
      labels: { period: "24h" },
      value: xpToday._sum.xpEarned || 0,
    },
    {
      name: "mirrorbuddy_active_streaks",
      type: "gauge",
      help: "Users with active streaks",
      labels: {},
      value: activeStreaks,
    },
    {
      name: "mirrorbuddy_max_level",
      type: "gauge",
      help: "Highest level achieved by any user",
      labels: {},
      value: maxLevel._max.level || 1,
    },
    {
      name: "mirrorbuddy_quizzes_completed",
      type: "gauge",
      help: "Quizzes completed",
      labels: { period: "24h" },
      value: quizzesToday,
    },
    {
      name: "mirrorbuddy_flashcards_reviewed",
      type: "gauge",
      help: "Flashcards reviewed",
      labels: { period: "24h" },
      value: flashcardsToday,
    },
    {
      name: "mirrorbuddy_mindmaps_created",
      type: "gauge",
      help: "Mind maps created",
      labels: { period: "24h" },
      value: mindmapsToday,
    },
  ];
}
