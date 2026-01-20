/**
 * GDPR Data Portability helpers
 *
 * Implements GDPR Article 20 - Right to Data Portability
 * Exports all user data in machine-readable JSON format
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "gdpr-export" });

export interface UserDataExport {
  exportedAt: string;
  userId: string;
  profile: {
    username?: string;
    email?: string;
    name?: string;
    age?: number;
    schoolYear?: number;
    schoolLevel?: string;
    preferredCoach?: string;
    preferredBuddy?: string;
    createdAt: string;
  };
  settings: {
    theme?: string;
    language?: string;
    accentColor?: string;
    fontSize?: string;
  };
  conversations: Array<{
    id: string;
    maestroId: string;
    title?: string;
    messageCount: number;
    lastMessageAt?: string;
    createdAt: string;
    isParentMode: boolean;
  }>;
  messages: Array<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    tokenCount?: number;
    createdAt: string;
  }>;
  learningProgress: {
    level: number;
    xp: number;
    totalStudyMinutes: number;
    streakCurrent: number;
    streakLongest: number;
    questionsAsked: number;
    lastStudyDate?: string;
  };
  flashcards: {
    totalCards: number;
    byState: Record<string, number>;
  };
  quizzes: Array<{
    id: string;
    subject?: string;
    topic?: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    completedAt: string;
  }>;
  studySessions: Array<{
    id: string;
    duration: number;
    subject: string;
    startedAt: string;
    endedAt?: string;
  }>;
  learnings: Array<{
    id: string;
    category: string;
    insight: string;
    confidence: number;
    createdAt: string;
  }>;
  accessibility: {
    dyslexiaFont?: boolean;
    highContrast?: boolean;
    largeText?: boolean;
    reducedMotion?: boolean;
    ttsEnabled?: boolean;
    adhdMode?: boolean;
    fontSize?: number;
  };
  gamification: {
    totalPoints?: number;
    level?: number;
    tier?: string;
    season?: string;
  };
  tosAcceptances: Array<{
    version: string;
    acceptedAt: string;
  }>;
  privacyPreferences: {
    pseudonymizedMode: boolean;
    customRetention?: Record<string, unknown>;
  };
}

export interface ExportStats {
  conversationCount: number;
  messageCount: number;
  flashcardCount: number;
  quizCount: number;
  sessionCount: number;
  learningCount: number;
}

/**
 * Check if user has exported data recently (rate limiting)
 * Returns true if user can export, false if rate-limited
 */
export async function canUserExport(userId: string): Promise<boolean> {
  try {
    // Check if there's an export audit entry from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentExport = await prisma.complianceAuditEntry.findFirst({
      where: {
        userId,
        eventType: "data_export",
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    return !recentExport;
  } catch (err) {
    log.warn("Rate limit check failed, allowing export", {
      error: String(err),
    });
    return true;
  }
}

/**
 * Export complete user data
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const exportedAt = new Date().toISOString();

  try {
    // Fetch all user data in parallel
    const [
      user,
      profile,
      settings,
      conversations,
      messages,
      progress,
      flashcards,
      quizResults,
      studySessions,
      learnings,
      accessibility,
      gamification,
      tosAcceptances,
      privacyPreferences,
    ] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.settings.findUnique({ where: { userId } }),
      prisma.conversation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.findMany({
        where: { conversation: { userId } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.progress.findUnique({ where: { userId } }),
      prisma.flashcardProgress.findMany({
        where: { userId },
      }),
      prisma.quizResult.findMany({
        where: { userId },
        orderBy: { completedAt: "desc" },
      }),
      prisma.studySession.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
      }),
      prisma.learning.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.accessibilitySettings.findUnique({ where: { userId } }),
      prisma.userGamification.findUnique({ where: { userId } }),
      prisma.tosAcceptance.findMany({
        where: { userId },
        orderBy: { acceptedAt: "desc" },
      }),
      prisma.userPrivacyPreferences.findUnique({ where: { userId } }),
    ]);

    // Build flashcard summary
    const flashcardByState: Record<string, number> = {};
    for (const card of flashcards) {
      flashcardByState[card.state] = (flashcardByState[card.state] || 0) + 1;
    }

    // Parse JSON fields safely
    const parseJSON = (val: string | null | undefined) => {
      if (!val) return {};
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    };

    const export_data: UserDataExport = {
      exportedAt,
      userId,
      profile: {
        username: user.username || undefined,
        email: user.email || undefined,
        name: profile?.name || undefined,
        age: profile?.age || undefined,
        schoolYear: profile?.schoolYear || undefined,
        schoolLevel: profile?.schoolLevel,
        preferredCoach: profile?.preferredCoach || undefined,
        preferredBuddy: profile?.preferredBuddy || undefined,
        createdAt: user.createdAt.toISOString(),
      },
      settings: {
        theme: settings?.theme,
        language: settings?.language,
        accentColor: settings?.accentColor,
        fontSize: settings?.fontSize,
      },
      conversations: conversations.map((c) => ({
        id: c.id,
        maestroId: c.maestroId,
        title: c.title || undefined,
        messageCount: c.messageCount,
        lastMessageAt: c.lastMessageAt?.toISOString(),
        createdAt: c.createdAt.toISOString(),
        isParentMode: c.isParentMode,
      })),
      messages: messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        tokenCount: m.tokenCount || undefined,
        createdAt: m.createdAt.toISOString(),
      })),
      learningProgress: {
        level: progress?.level || 1,
        xp: progress?.xp || 0,
        totalStudyMinutes: progress?.totalStudyMinutes || 0,
        streakCurrent: progress?.streakCurrent || 0,
        streakLongest: progress?.streakLongest || 0,
        questionsAsked: progress?.questionsAsked || 0,
        lastStudyDate: progress?.lastStudyDate?.toISOString(),
      },
      flashcards: {
        totalCards: flashcards.length,
        byState: flashcardByState,
      },
      quizzes: quizResults.map((q) => ({
        id: q.id,
        subject: q.subject || undefined,
        topic: q.topic || undefined,
        score: q.score,
        totalQuestions: q.totalQuestions,
        percentage: q.percentage,
        completedAt: q.completedAt.toISOString(),
      })),
      studySessions: studySessions.map((s) => ({
        id: s.id,
        duration: s.duration || 0,
        subject: s.subject,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString(),
      })),
      learnings: learnings.map((l) => ({
        id: l.id,
        category: l.category,
        insight: l.insight,
        confidence: l.confidence,
        createdAt: l.createdAt.toISOString(),
      })),
      accessibility: {
        dyslexiaFont: accessibility?.dyslexiaFont,
        highContrast: accessibility?.highContrast,
        largeText: accessibility?.largeText,
        reducedMotion: accessibility?.reducedMotion,
        ttsEnabled: accessibility?.ttsEnabled,
        adhdMode: accessibility?.adhdMode,
        fontSize: accessibility?.fontSize,
      },
      gamification: {
        totalPoints: gamification?.totalPoints,
        level: gamification?.level,
        tier: gamification?.tier,
        season: gamification?.currentSeason,
      },
      tosAcceptances: tosAcceptances.map((t) => ({
        version: t.version,
        acceptedAt: t.acceptedAt.toISOString(),
      })),
      privacyPreferences: {
        pseudonymizedMode: privacyPreferences?.pseudonymizedMode || false,
        customRetention: parseJSON(privacyPreferences?.customRetention),
      },
    };

    log.info("User data exported successfully", {
      userId: userId.slice(0, 8),
      messageCount: messages.length,
      conversationCount: conversations.length,
    });

    return export_data;
  } catch (err) {
    log.error("Failed to export user data", {
      error: String(err),
      userId: userId.slice(0, 8),
    });
    throw err;
  }
}

/**
 * Log data export for audit trail
 */
export async function logExportAudit(userId: string): Promise<void> {
  try {
    await prisma.complianceAuditEntry.create({
      data: {
        userId,
        eventType: "data_export",
        severity: "info",
        description: "User requested complete data export (GDPR Art. 20)",
        details: JSON.stringify({
          exportedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (err) {
    log.error("Failed to log export audit", {
      error: String(err),
      userId: userId.slice(0, 8),
    });
    // Don't throw - audit failure shouldn't block export
  }
}

/**
 * Get export statistics
 */
export async function getExportStats(userId: string): Promise<ExportStats> {
  try {
    const [
      conversationCount,
      messageCount,
      flashcardCount,
      quizCount,
      sessionCount,
      learningCount,
    ] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.message.count({ where: { conversation: { userId } } }),
      prisma.flashcardProgress.count({ where: { userId } }),
      prisma.quizResult.count({ where: { userId } }),
      prisma.studySession.count({ where: { userId } }),
      prisma.learning.count({ where: { userId } }),
    ]);

    return {
      conversationCount,
      messageCount,
      flashcardCount,
      quizCount,
      sessionCount,
      learningCount,
    };
  } catch (err) {
    log.error("Failed to get export stats", {
      error: String(err),
      userId: userId.slice(0, 8),
    });
    return {
      conversationCount: 0,
      messageCount: 0,
      flashcardCount: 0,
      quizCount: 0,
      sessionCount: 0,
      learningCount: 0,
    };
  }
}
