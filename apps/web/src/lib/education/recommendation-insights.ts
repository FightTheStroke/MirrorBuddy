/**
 * Student Learning Insights Aggregation
 *
 * Gathers data from conversations, learning paths, and FSRS flashcards
 * Part of recommendation-engine module
 *
 * Plan 104 - Wave 4: Pro Features [T4-05]
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Student learning insights aggregated from multiple sources
 */
export interface StudentInsights {
  conversationCount: number;
  averageSessionLength: number;
  topSubjects: string[];
  learningPathProgress: number;
  fsrsAccuracy: number;
  totalReviews: number;
  strengthAreas: string[];
  weakAreas: string[];
}

/**
 * Gather student learning insights from all available sources
 */
export async function gatherStudentInsights(
  userId: string,
): Promise<StudentInsights> {
  const [conversations, learningPaths, flashcardProgress, quizResults] =
    await Promise.all([
      // Conversation history
      prisma.conversation.findMany({
        where: { userId },
        select: {
          id: true,
          maestroId: true,
          keyFacts: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),

      // Learning path progress
      prisma.learningPath.findMany({
        where: { userId },
        select: {
          id: true,
          subject: true,
          completedTopics: true,
          totalTopics: true,
          progressPercent: true,
          topics: {
            select: {
              title: true,
              status: true,
              difficulty: true,
              quizScore: true,
            },
          },
        },
      }),

      // FSRS flashcard progress (not reviews - using FlashcardProgress model)
      prisma.flashcardProgress.findMany({
        where: {
          userId,
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        select: {
          cardId: true,
          state: true,
          reps: true,
          lapses: true,
          retrievability: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),

      // Quiz results for performance analysis
      prisma.quizResult.findMany({
        where: {
          userId,
          completedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          subject: true,
          topic: true,
          percentage: true,
        },
        orderBy: { completedAt: "desc" },
        take: 50,
      }),
    ]);

  // Extract subjects from conversations
  const subjectCounts = new Map<string, number>();
  const learnedConcepts: string[] = [];

  for (const conv of conversations) {
    if (conv.keyFacts) {
      try {
        const facts = JSON.parse(conv.keyFacts);
        if (facts.learned && Array.isArray(facts.learned)) {
          learnedConcepts.push(...facts.learned);
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  // Count subject frequencies from learning paths
  for (const path of learningPaths) {
    const subject = path.subject || "unknown";
    const count = subjectCounts.get(subject) || 0;
    subjectCounts.set(subject, count + 1);
  }

  const topSubjects = Array.from(subjectCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([subject]) => subject);

  // Calculate FSRS accuracy from flashcard progress
  const totalReviews = flashcardProgress.length;
  const successfulReviews = flashcardProgress.filter(
    (p: { retrievability: number }) => p.retrievability >= 0.7,
  ).length;
  const fsrsAccuracy =
    totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 0;

  // Calculate average learning path progress
  const avgProgress =
    learningPaths.length > 0
      ? Math.round(
          learningPaths.reduce(
            (sum: number, p: { progressPercent: number }) =>
              sum + p.progressPercent,
            0,
          ) / learningPaths.length,
        )
      : 0;

  // Calculate average session length (minutes)
  const avgSessionLength =
    conversations.length > 0
      ? Math.round(
          conversations.reduce(
            (sum: number, c: { updatedAt: Date; createdAt: Date }) => {
              const duration = c.updatedAt.getTime() - c.createdAt.getTime();
              return sum + duration / (1000 * 60);
            },
            0,
          ) / conversations.length,
        )
      : 0;

  // Identify strength and weak areas from quiz results
  const subjectPerformance = new Map<
    string,
    { total: number; sumPercent: number }
  >();

  for (const quiz of quizResults) {
    const subject = quiz.subject || quiz.topic || "unknown";
    const perf = subjectPerformance.get(subject) || { total: 0, sumPercent: 0 };
    perf.total += 1;
    perf.sumPercent += quiz.percentage;
    subjectPerformance.set(subject, perf);
  }

  const strengthAreas: string[] = [];
  const weakAreas: string[] = [];

  for (const [subject, perf] of subjectPerformance.entries()) {
    if (perf.total < 2) continue; // Need at least 2 quizzes to judge
    const avgPercent = perf.sumPercent / perf.total;

    if (avgPercent >= 80) {
      strengthAreas.push(subject);
    } else if (avgPercent < 50) {
      weakAreas.push(subject);
    }
  }

  logger.debug("Student insights gathered", {
    userId,
    conversationCount: conversations.length,
    learningPathCount: learningPaths.length,
    reviewCount: flashcardProgress.length,
    strengthAreas: strengthAreas.length,
    weakAreas: weakAreas.length,
  });

  return {
    conversationCount: conversations.length,
    averageSessionLength: avgSessionLength,
    topSubjects,
    learningPathProgress: avgProgress,
    fsrsAccuracy,
    totalReviews,
    strengthAreas,
    weakAreas,
  };
}

/**
 * Check if insights are empty (no meaningful data)
 */
export function isEmptyInsights(insights: StudentInsights): boolean {
  return (
    insights.conversationCount === 0 &&
    insights.totalReviews === 0 &&
    insights.learningPathProgress === 0
  );
}

/**
 * Identify knowledge gaps from incomplete learning paths
 */
export async function identifyKnowledgeGaps(userId: string): Promise<string[]> {
  const learningPaths = await prisma.learningPath.findMany({
    where: { userId },
    include: {
      topics: {
        where: { status: "locked" },
        select: { title: true },
      },
    },
  });

  const gaps: string[] = [];

  for (const path of learningPaths) {
    gaps.push(...path.topics.map((t) => t.title));
  }

  return gaps;
}

/**
 * Suggest focus areas based on quiz and flashcard performance
 */
export async function suggestFocusAreas(userId: string): Promise<string[]> {
  // Get low-performing quiz subjects
  const lowQuizzes = await prisma.quizResult.findMany({
    where: {
      userId,
      percentage: { lt: 60 },
    },
    select: {
      subject: true,
      topic: true,
    },
    orderBy: { completedAt: "desc" },
    take: 20,
  });

  const subjectCounts = new Map<string, number>();

  for (const quiz of lowQuizzes) {
    const subject = quiz.subject || quiz.topic || "unknown";
    subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
  }

  return Array.from(subjectCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subject]) => `Rivedere concetti di ${subject}`);
}
