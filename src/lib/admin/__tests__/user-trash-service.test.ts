/**
 * @jest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    profile: { findUnique: vi.fn() },
    settings: { findUnique: vi.fn() },
    progress: { findUnique: vi.fn() },
    accessibilitySettings: { findUnique: vi.fn() },
    onboardingState: { findUnique: vi.fn() },
    pomodoroStats: { findUnique: vi.fn() },
    methodProgress: { findUnique: vi.fn() },
    userPrivacyPreferences: { findUnique: vi.fn() },
    coppaConsent: { findUnique: vi.fn() },
    googleAccount: { findUnique: vi.fn() },
    userSubscription: { findUnique: vi.fn() },
    userGamification: { findUnique: vi.fn() },
    userAchievement: { findMany: vi.fn() },
    dailyStreak: { findFirst: vi.fn() },
    pointsTransaction: { findMany: vi.fn() },
    tosAcceptance: { findMany: vi.fn() },
    studySession: { findMany: vi.fn() },
    flashcardProgress: { findMany: vi.fn() },
    quizResult: { findMany: vi.fn() },
    learning: { findMany: vi.fn() },
    conversation: { findMany: vi.fn() },
    message: { findMany: vi.fn() },
    toolOutput: { findMany: vi.fn() },
    material: { findMany: vi.fn() },
    materialTag: { findMany: vi.fn() },
    materialEdge: { findMany: vi.fn() },
    materialConcept: { findMany: vi.fn() },
    collection: { findMany: vi.fn() },
    tag: { findMany: vi.fn() },
    createdTool: { findMany: vi.fn() },
    studyKit: { findMany: vi.fn() },
    learningPath: { findMany: vi.fn() },
    learningPathTopic: { findMany: vi.fn() },
    topicStep: { findMany: vi.fn() },
    topicAttempt: { findMany: vi.fn() },
    notification: { findMany: vi.fn() },
    studySchedule: { findMany: vi.fn() },
    scheduledSession: { findMany: vi.fn() },
    customReminder: { findMany: vi.fn() },
    calendarEvent: { findMany: vi.fn() },
    htmlSnippet: { findMany: vi.fn() },
    homeworkSession: { findMany: vi.fn() },
    pushSubscription: { findMany: vi.fn() },
    parentNote: { findMany: vi.fn() },
    sessionMetrics: { findMany: vi.fn() },
    contentEmbedding: { findMany: vi.fn() },
    concept: { findMany: vi.fn() },
    studentInsightProfile: { findUnique: vi.fn() },
    profileAccessLog: { findMany: vi.fn() },
    telemetryEvent: { findMany: vi.fn() },
    rateLimitEvent: { findMany: vi.fn() },
    safetyEvent: { findMany: vi.fn() },
    userActivity: { findMany: vi.fn() },
    deletedUserBackup: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import { prisma } from "@/lib/db";

describe("user-trash-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates backup with 30-day purge", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      username: "user1",
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
      disabled: false,
      passwordHash: "hash",
      mustChangePassword: false,
    } as never);

    vi.mocked(prisma.deletedUserBackup.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.deletedUserBackup.create).mockResolvedValue({
      id: "backup-1",
    } as never);

    const { createDeletedUserBackup } = await import("../user-trash-service");

    await createDeletedUserBackup("user-1", "admin-1", "test");

    expect(prisma.deletedUserBackup.create).toHaveBeenCalled();
  });

  it("purges expired backups", async () => {
    vi.mocked(prisma.deletedUserBackup.deleteMany).mockResolvedValue({
      count: 2,
    });

    const { purgeExpiredUserBackups } = await import("../user-trash-service");
    const count = await purgeExpiredUserBackups();

    expect(count).toBe(2);
  });
});
