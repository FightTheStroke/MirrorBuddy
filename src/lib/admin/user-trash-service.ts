import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { hashPII } from "@/lib/security/pii-encryption";

const GRACE_PERIOD_DAYS = 30;

export interface UserBackupPayload {
  user: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  progress: Record<string, unknown> | null;
  accessibility: Record<string, unknown> | null;
  onboarding: Record<string, unknown> | null;
  pomodoroStats: Record<string, unknown> | null;
  methodProgress: Record<string, unknown> | null;
  privacyPreferences: Record<string, unknown> | null;
  coppaConsent: Record<string, unknown> | null;
  googleAccount: Record<string, unknown> | null;
  subscription: Record<string, unknown> | null;
  gamification: Record<string, unknown> | null;
  userAchievements: Record<string, unknown>[];
  dailyStreak: Record<string, unknown> | null;
  pointsHistory: Record<string, unknown>[];
  tosAcceptances: Record<string, unknown>[];
  studySessions: Record<string, unknown>[];
  flashcards: Record<string, unknown>[];
  quizResults: Record<string, unknown>[];
  learnings: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  toolOutputs: Record<string, unknown>[];
  materials: Record<string, unknown>[];
  materialTags: Record<string, unknown>[];
  materialEdges: Record<string, unknown>[];
  materialConcepts: Record<string, unknown>[];
  collections: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  studyKits: Record<string, unknown>[];
  learningPaths: Record<string, unknown>[];
  learningPathTopics: Record<string, unknown>[];
  topicSteps: Record<string, unknown>[];
  topicAttempts: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  studySchedules: Record<string, unknown>[];
  scheduledSessions: Record<string, unknown>[];
  customReminders: Record<string, unknown>[];
  calendarEvents: Record<string, unknown>[];
  htmlSnippets: Record<string, unknown>[];
  homeworkSessions: Record<string, unknown>[];
  pushSubscriptions: Record<string, unknown>[];
  parentNotes: Record<string, unknown>[];
  sessionMetrics: Record<string, unknown>[];
  contentEmbeddings: Record<string, unknown>[];
  concepts: Record<string, unknown>[];
  studentInsightProfile: Record<string, unknown> | null;
  profileAccessLogs: Record<string, unknown>[];
  telemetryEvents: Record<string, unknown>[];
  rateLimitEvents: Record<string, unknown>[];
  safetyEvents: Record<string, unknown>[];
  userActivity: Record<string, unknown>[];
}

const log = logger.child({ module: "admin-user-trash" });

export async function buildUserBackup(
  userId: string,
): Promise<UserBackupPayload> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const [
    profile,
    settings,
    progress,
    accessibility,
    onboarding,
    pomodoroStats,
    methodProgress,
    privacyPreferences,
    coppaConsent,
    googleAccount,
    subscription,
    gamification,
    userAchievements,
    dailyStreak,
    pointsHistory,
    tosAcceptances,
    studySessions,
    flashcards,
    quizResults,
    learnings,
    conversations,
    messages,
    toolOutputs,
    materials,
    materialTags,
    materialEdges,
    materialConcepts,
    collections,
    tags,
    studyKits,
    learningPaths,
    learningPathTopics,
    topicSteps,
    topicAttempts,
    notifications,
    studySchedules,
    scheduledSessions,
    customReminders,
    calendarEvents,
    htmlSnippets,
    homeworkSessions,
    pushSubscriptions,
    parentNotes,
    sessionMetrics,
    contentEmbeddings,
    concepts,
    studentInsightProfile,
    profileAccessLogs,
    telemetryEvents,
    rateLimitEvents,
    safetyEvents,
    userActivity,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.settings.findUnique({ where: { userId } }),
    prisma.progress.findUnique({ where: { userId } }),
    prisma.accessibilitySettings.findUnique({ where: { userId } }),
    prisma.onboardingState.findUnique({ where: { userId } }),
    prisma.pomodoroStats.findUnique({ where: { userId } }),
    prisma.methodProgress.findUnique({ where: { userId } }),
    prisma.userPrivacyPreferences.findUnique({ where: { userId } }),
    prisma.coppaConsent.findUnique({ where: { userId } }),
    prisma.googleAccount.findUnique({ where: { userId } }),
    prisma.userSubscription.findUnique({ where: { userId } }),
    prisma.userGamification.findUnique({ where: { userId } }),
    prisma.userAchievement.findMany({
      where: { gamification: { userId } },
    }),
    prisma.dailyStreak.findFirst({
      where: { gamification: { userId } },
    }),
    prisma.pointsTransaction.findMany({
      where: { gamification: { userId } },
    }),
    prisma.tosAcceptance.findMany({ where: { userId } }),
    prisma.studySession.findMany({ where: { userId } }),
    prisma.flashcardProgress.findMany({ where: { userId } }),
    prisma.quizResult.findMany({ where: { userId } }),
    prisma.learning.findMany({ where: { userId } }),
    prisma.conversation.findMany({ where: { userId } }),
    prisma.message.findMany({ where: { conversation: { userId } } }),
    prisma.toolOutput.findMany({ where: { conversation: { userId } } }),
    prisma.material.findMany({ where: { userId } }),
    prisma.materialTag.findMany({ where: { material: { userId } } }),
    prisma.materialEdge.findMany({
      where: {
        OR: [{ from: { userId } }, { to: { userId } }],
      },
    }),
    prisma.materialConcept.findMany({
      where: { material: { userId } },
    }),
    prisma.collection.findMany({ where: { userId } }),
    prisma.tag.findMany({ where: { userId } }),
    prisma.studyKit.findMany({ where: { userId } }),
    prisma.learningPath.findMany({ where: { userId } }),
    prisma.learningPathTopic.findMany({
      where: { path: { userId } },
    }),
    prisma.topicStep.findMany({
      where: { topic: { path: { userId } } },
    }),
    prisma.topicAttempt.findMany({ where: { userId } }),
    prisma.notification.findMany({ where: { userId } }),
    prisma.studySchedule.findMany({ where: { userId } }),
    prisma.scheduledSession.findMany({ where: { userId } }),
    prisma.customReminder.findMany({ where: { userId } }),
    prisma.calendarEvent.findMany({ where: { userId } }),
    prisma.htmlSnippet.findMany({ where: { userId } }),
    prisma.homeworkSession.findMany({ where: { userId } }),
    prisma.pushSubscription.findMany({ where: { userId } }),
    prisma.parentNote.findMany({ where: { userId } }),
    prisma.sessionMetrics.findMany({ where: { userId } }),
    prisma.contentEmbedding.findMany({ where: { userId } }),
    prisma.concept.findMany({ where: { userId } }),
    prisma.studentInsightProfile.findUnique({ where: { userId } }),
    prisma.profileAccessLog.findMany({
      where: { profile: { userId } },
    }),
    prisma.telemetryEvent.findMany({ where: { userId } }),
    prisma.rateLimitEvent.findMany({ where: { userId } }),
    prisma.safetyEvent.findMany({ where: { userId } }),
    prisma.userActivity.findMany({ where: { identifier: userId } }),
  ]);

  const toJson = <T>(value: T): T =>
    value === undefined
      ? (null as T)
      : (JSON.parse(JSON.stringify(value)) as T);

  return {
    user: toJson(user),
    profile: toJson(profile),
    settings: toJson(settings),
    progress: toJson(progress),
    accessibility: toJson(accessibility),
    onboarding: toJson(onboarding),
    pomodoroStats: toJson(pomodoroStats),
    methodProgress: toJson(methodProgress),
    privacyPreferences: toJson(privacyPreferences),
    coppaConsent: toJson(coppaConsent),
    googleAccount: toJson(googleAccount),
    subscription: toJson(subscription),
    gamification: toJson(gamification),
    userAchievements: toJson(userAchievements),
    dailyStreak: toJson(dailyStreak),
    pointsHistory: toJson(pointsHistory),
    tosAcceptances: toJson(tosAcceptances),
    studySessions: toJson(studySessions),
    flashcards: toJson(flashcards),
    quizResults: toJson(quizResults),
    learnings: toJson(learnings),
    conversations: toJson(conversations),
    messages: toJson(messages),
    toolOutputs: toJson(toolOutputs),
    materials: toJson(materials),
    materialTags: toJson(materialTags),
    materialEdges: toJson(materialEdges),
    materialConcepts: toJson(materialConcepts),
    collections: toJson(collections),
    tags: toJson(tags),
    studyKits: toJson(studyKits),
    learningPaths: toJson(learningPaths),
    learningPathTopics: toJson(learningPathTopics),
    topicSteps: toJson(topicSteps),
    topicAttempts: toJson(topicAttempts),
    notifications: toJson(notifications),
    studySchedules: toJson(studySchedules),
    scheduledSessions: toJson(scheduledSessions),
    customReminders: toJson(customReminders),
    calendarEvents: toJson(calendarEvents),
    htmlSnippets: toJson(htmlSnippets),
    homeworkSessions: toJson(homeworkSessions),
    pushSubscriptions: toJson(pushSubscriptions),
    parentNotes: toJson(parentNotes),
    sessionMetrics: toJson(sessionMetrics),
    contentEmbeddings: toJson(contentEmbeddings),
    concepts: toJson(concepts),
    studentInsightProfile: toJson(studentInsightProfile),
    profileAccessLogs: toJson(profileAccessLogs),
    telemetryEvents: toJson(telemetryEvents),
    rateLimitEvents: toJson(rateLimitEvents),
    safetyEvents: toJson(safetyEvents),
    userActivity: toJson(userActivity),
  };
}

export async function createDeletedUserBackup(
  userId: string,
  adminId: string,
  reason?: string,
) {
  const existing = await prisma.deletedUserBackup.findUnique({
    where: { userId },
  });
  if (existing) {
    throw new Error("Backup already exists for user");
  }

  const payload = await buildUserBackup(userId);
  const purgeAt = new Date();
  purgeAt.setDate(purgeAt.getDate() + GRACE_PERIOD_DAYS);

  const backup = await prisma.deletedUserBackup.create({
    data: {
      userId,
      email: (payload.user.email as string | null) || null,
      username: (payload.user.username as string | null) || null,
      role: payload.user.role as "USER" | "ADMIN",
      backup: payload as unknown as Prisma.InputJsonValue,
      deletedAt: new Date(),
      purgeAt,
      deletedBy: adminId,
      reason: reason || null,
    },
  });

  log.info("User backup stored", { userId, adminId });
  return backup;
}

export async function restoreUserFromBackup(userId: string, adminId: string) {
  const backup = await prisma.deletedUserBackup.findUnique({
    where: { userId },
  });
  if (!backup) {
    throw new Error("Backup not found");
  }

  const payload = backup.backup as unknown as UserBackupPayload;
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (existingUser) {
    throw new Error("User already exists");
  }

  if (payload.user.email) {
    const emailHashValue = await hashPII(payload.user.email as string);
    const emailOwner = await prisma.user.findFirst({
      where: {
        OR: [
          { emailHash: emailHashValue },
          { email: payload.user.email as string },
        ],
      },
      select: { id: true },
    });
    if (emailOwner) {
      throw new Error("Email already in use");
    }
  }

  if (payload.user.username) {
    const usernameOwner = await prisma.user.findUnique({
      where: { username: payload.user.username as string },
      select: { id: true },
    });
    if (usernameOwner) {
      throw new Error("Username already in use");
    }
  }

  // Type assertion helper for backup restore (data was originally from Prisma)
  const asData = <T>(d: Record<string, unknown>): T => d as unknown as T;

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: asData<Prisma.UserUncheckedCreateInput>(payload.user),
    });

    if (payload.profile) {
      await tx.profile.create({
        data: asData<Prisma.ProfileUncheckedCreateInput>(payload.profile),
      });
    }
    if (payload.settings) {
      await tx.settings.create({
        data: asData<Prisma.SettingsUncheckedCreateInput>(payload.settings),
      });
    }
    if (payload.progress) {
      await tx.progress.create({
        data: asData<Prisma.ProgressUncheckedCreateInput>(payload.progress),
      });
    }
    if (payload.accessibility) {
      await tx.accessibilitySettings.create({
        data: asData<Prisma.AccessibilitySettingsUncheckedCreateInput>(
          payload.accessibility,
        ),
      });
    }
    if (payload.onboarding) {
      await tx.onboardingState.create({
        data: asData<Prisma.OnboardingStateUncheckedCreateInput>(
          payload.onboarding,
        ),
      });
    }
    if (payload.pomodoroStats) {
      await tx.pomodoroStats.create({
        data: asData<Prisma.PomodoroStatsUncheckedCreateInput>(
          payload.pomodoroStats,
        ),
      });
    }
    if (payload.methodProgress) {
      await tx.methodProgress.create({
        data: asData<Prisma.MethodProgressUncheckedCreateInput>(
          payload.methodProgress,
        ),
      });
    }
    if (payload.privacyPreferences) {
      await tx.userPrivacyPreferences.create({
        data: asData<Prisma.UserPrivacyPreferencesUncheckedCreateInput>(
          payload.privacyPreferences,
        ),
      });
    }
    if (payload.coppaConsent) {
      await tx.coppaConsent.create({
        data: asData<Prisma.CoppaConsentUncheckedCreateInput>(
          payload.coppaConsent,
        ),
      });
    }
    if (payload.googleAccount) {
      await tx.googleAccount.create({
        data: asData<Prisma.GoogleAccountUncheckedCreateInput>(
          payload.googleAccount,
        ),
      });
    }
    if (payload.subscription) {
      await tx.userSubscription.create({
        data: asData<Prisma.UserSubscriptionUncheckedCreateInput>(
          payload.subscription,
        ),
      });
    }
    if (payload.gamification) {
      await tx.userGamification.create({
        data: asData<Prisma.UserGamificationUncheckedCreateInput>(
          payload.gamification,
        ),
      });
    }
    if (payload.dailyStreak) {
      await tx.dailyStreak.create({
        data: asData<Prisma.DailyStreakUncheckedCreateInput>(
          payload.dailyStreak,
        ),
      });
    }

    // Type helper for array data
    const asArr = <T>(d: Record<string, unknown>[]): T[] => d as unknown as T[];

    if (payload.userAchievements.length) {
      await tx.userAchievement.createMany({
        data: asArr<Prisma.UserAchievementUncheckedCreateInput>(
          payload.userAchievements,
        ),
      });
    }
    if (payload.pointsHistory.length) {
      await tx.pointsTransaction.createMany({
        data: asArr<Prisma.PointsTransactionUncheckedCreateInput>(
          payload.pointsHistory,
        ),
      });
    }
    if (payload.tosAcceptances.length) {
      await tx.tosAcceptance.createMany({
        data: asArr<Prisma.TosAcceptanceUncheckedCreateInput>(
          payload.tosAcceptances,
        ),
      });
    }
    if (payload.studySessions.length) {
      await tx.studySession.createMany({
        data: asArr<Prisma.StudySessionUncheckedCreateInput>(
          payload.studySessions,
        ),
      });
    }
    if (payload.flashcards.length) {
      await tx.flashcardProgress.createMany({
        data: asArr<Prisma.FlashcardProgressUncheckedCreateInput>(
          payload.flashcards,
        ),
      });
    }
    if (payload.quizResults.length) {
      await tx.quizResult.createMany({
        data: asArr<Prisma.QuizResultUncheckedCreateInput>(payload.quizResults),
      });
    }
    if (payload.learnings.length) {
      await tx.learning.createMany({
        data: asArr<Prisma.LearningUncheckedCreateInput>(payload.learnings),
      });
    }
    if (payload.studyKits.length) {
      await tx.studyKit.createMany({
        data: asArr<Prisma.StudyKitUncheckedCreateInput>(payload.studyKits),
      });
    }
    if (payload.learningPaths.length) {
      await tx.learningPath.createMany({
        data: asArr<Prisma.LearningPathUncheckedCreateInput>(
          payload.learningPaths,
        ),
      });
    }
    if (payload.learningPathTopics.length) {
      await tx.learningPathTopic.createMany({
        data: asArr<Prisma.LearningPathTopicUncheckedCreateInput>(
          payload.learningPathTopics,
        ),
      });
    }
    if (payload.topicSteps.length) {
      await tx.topicStep.createMany({
        data: asArr<Prisma.TopicStepUncheckedCreateInput>(payload.topicSteps),
      });
    }
    if (payload.topicAttempts.length) {
      await tx.topicAttempt.createMany({
        data: asArr<Prisma.TopicAttemptUncheckedCreateInput>(
          payload.topicAttempts,
        ),
      });
    }
    if (payload.studySchedules.length) {
      await tx.studySchedule.createMany({
        data: asArr<Prisma.StudyScheduleUncheckedCreateInput>(
          payload.studySchedules,
        ),
      });
    }
    if (payload.scheduledSessions.length) {
      await tx.scheduledSession.createMany({
        data: asArr<Prisma.ScheduledSessionUncheckedCreateInput>(
          payload.scheduledSessions,
        ),
      });
    }
    if (payload.customReminders.length) {
      await tx.customReminder.createMany({
        data: asArr<Prisma.CustomReminderUncheckedCreateInput>(
          payload.customReminders,
        ),
      });
    }
    if (payload.collections.length) {
      await tx.collection.createMany({
        data: asArr<Prisma.CollectionUncheckedCreateInput>(payload.collections),
      });
    }
    if (payload.tags.length) {
      await tx.tag.createMany({
        data: asArr<Prisma.TagUncheckedCreateInput>(payload.tags),
      });
    }
    if (payload.materials.length) {
      await tx.material.createMany({
        data: asArr<Prisma.MaterialUncheckedCreateInput>(payload.materials),
      });
    }
    if (payload.concepts.length) {
      await tx.concept.createMany({
        data: asArr<Prisma.ConceptUncheckedCreateInput>(payload.concepts),
      });
    }
    if (payload.materialTags.length) {
      await tx.materialTag.createMany({
        data: asArr<Prisma.MaterialTagUncheckedCreateInput>(
          payload.materialTags,
        ),
      });
    }
    if (payload.materialEdges.length) {
      await tx.materialEdge.createMany({
        data: asArr<Prisma.MaterialEdgeUncheckedCreateInput>(
          payload.materialEdges,
        ),
      });
    }
    if (payload.materialConcepts.length) {
      await tx.materialConcept.createMany({
        data: asArr<Prisma.MaterialConceptUncheckedCreateInput>(
          payload.materialConcepts,
        ),
      });
    }
    if (payload.conversations.length) {
      await tx.conversation.createMany({
        data: asArr<Prisma.ConversationUncheckedCreateInput>(
          payload.conversations,
        ),
      });
    }
    if (payload.messages.length) {
      await tx.message.createMany({
        data: asArr<Prisma.MessageUncheckedCreateInput>(payload.messages),
      });
    }
    if (payload.toolOutputs.length) {
      await tx.toolOutput.createMany({
        data: asArr<Prisma.ToolOutputUncheckedCreateInput>(payload.toolOutputs),
      });
    }
    if (payload.notifications.length) {
      await tx.notification.createMany({
        data: asArr<Prisma.NotificationUncheckedCreateInput>(
          payload.notifications,
        ),
      });
    }
    if (payload.calendarEvents.length) {
      await tx.calendarEvent.createMany({
        data: asArr<Prisma.CalendarEventUncheckedCreateInput>(
          payload.calendarEvents,
        ),
      });
    }
    if (payload.htmlSnippets.length) {
      await tx.htmlSnippet.createMany({
        data: asArr<Prisma.HtmlSnippetUncheckedCreateInput>(
          payload.htmlSnippets,
        ),
      });
    }
    if (payload.homeworkSessions.length) {
      await tx.homeworkSession.createMany({
        data: asArr<Prisma.HomeworkSessionUncheckedCreateInput>(
          payload.homeworkSessions,
        ),
      });
    }
    if (payload.pushSubscriptions.length) {
      await tx.pushSubscription.createMany({
        data: asArr<Prisma.PushSubscriptionUncheckedCreateInput>(
          payload.pushSubscriptions,
        ),
      });
    }
    if (payload.parentNotes.length) {
      await tx.parentNote.createMany({
        data: asArr<Prisma.ParentNoteUncheckedCreateInput>(payload.parentNotes),
      });
    }
    if (payload.sessionMetrics.length) {
      await tx.sessionMetrics.createMany({
        data: asArr<Prisma.SessionMetricsUncheckedCreateInput>(
          payload.sessionMetrics,
        ),
      });
    }
    if (payload.contentEmbeddings.length) {
      await tx.contentEmbedding.createMany({
        data: asArr<Prisma.ContentEmbeddingUncheckedCreateInput>(
          payload.contentEmbeddings,
        ),
      });
    }
    if (payload.studentInsightProfile) {
      await tx.studentInsightProfile.create({
        data: asData<Prisma.StudentInsightProfileUncheckedCreateInput>(
          payload.studentInsightProfile,
        ),
      });
    }
    if (payload.profileAccessLogs.length) {
      await tx.profileAccessLog.createMany({
        data: asArr<Prisma.ProfileAccessLogUncheckedCreateInput>(
          payload.profileAccessLogs,
        ),
      });
    }
    if (payload.telemetryEvents.length) {
      await tx.telemetryEvent.createMany({
        data: asArr<Prisma.TelemetryEventUncheckedCreateInput>(
          payload.telemetryEvents,
        ),
      });
    }
    if (payload.rateLimitEvents.length) {
      await tx.rateLimitEvent.createMany({
        data: asArr<Prisma.RateLimitEventUncheckedCreateInput>(
          payload.rateLimitEvents,
        ),
      });
    }
    if (payload.safetyEvents.length) {
      await tx.safetyEvent.createMany({
        data: asArr<Prisma.SafetyEventUncheckedCreateInput>(
          payload.safetyEvents,
        ),
      });
    }
    if (payload.userActivity.length) {
      await tx.userActivity.createMany({
        data: asArr<Prisma.UserActivityUncheckedCreateInput>(
          payload.userActivity,
        ),
      });
    }
  });

  await prisma.deletedUserBackup.delete({ where: { userId } });

  log.info("User restored from backup", { userId, adminId });
}

export async function purgeExpiredUserBackups() {
  const now = new Date();
  const result = await prisma.deletedUserBackup.deleteMany({
    where: { purgeAt: { lte: now } },
  });
  if (result.count > 0) {
    log.info("Expired user backups purged", { count: result.count });
  }
  return result.count;
}
