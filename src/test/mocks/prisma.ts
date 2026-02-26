/**
 * Centralized Prisma Mock
 *
 * Universal mock for `@/lib/db` — covers all 91 Prisma models.
 * Generated from prisma/schema/*.prisma.
 *
 * Usage:
 * ```ts
 * vi.mock('@/lib/db', async () => {
 *   const { createMockPrisma } = await import('@/test/mocks/prisma');
 *   return { prisma: createMockPrisma() };
 * });
 * ```
 */
import { vi } from 'vitest';

/** Standard CRUD methods available on every Prisma model */
function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

/** Creates a fresh Prisma mock with all 91 models and root methods */
export function createMockPrisma() {
  return {
    accessibilitySettings: createModelMock(),
    achievement: createModelMock(),
    adminAuditLog: createModelMock(),
    auditLog: createModelMock(),
    calendarEvent: createModelMock(),
    characterConfig: createModelMock(),
    collection: createModelMock(),
    complianceAuditEntry: createModelMock(),
    concept: createModelMock(),
    contactRequest: createModelMock(),
    communityContribution: createModelMock(),
    contributionVote: createModelMock(),
    contentEmbedding: createModelMock(),
    conversation: createModelMock(),
    coppaConsent: createModelMock(),
    customReminder: createModelMock(),
    dailyStreak: createModelMock(),
    deletedUserBackup: createModelMock(),
    dependencyAlert: createModelMock(),
    emailCampaign: createModelMock(),
    emailEvent: createModelMock(),
    emailPreference: createModelMock(),
    emailRecipient: createModelMock(),
    emailTemplate: createModelMock(),
    featureFlag: createModelMock(),
    flashcardProgress: createModelMock(),
    funnelEvent: createModelMock(),
    globalConfig: createModelMock(),
    googleAccount: createModelMock(),
    hierarchicalSummary: createModelMock(),
    homeworkSession: createModelMock(),
    htmlSnippet: createModelMock(),
    inviteRequest: createModelMock(),
    learning: createModelMock(),
    learningPath: createModelMock(),
    learningPathTopic: createModelMock(),
    localeAuditLog: createModelMock(),
    localeConfig: createModelMock(),
    maintenanceWindow: createModelMock(),
    material: createModelMock(),
    materialConcept: createModelMock(),
    materialEdge: createModelMock(),
    materialTag: createModelMock(),
    message: createModelMock(),
    methodProgress: createModelMock(),
    modelCatalog: createModelMock(),
    notification: createModelMock(),
    onboardingState: createModelMock(),
    parentNote: createModelMock(),
    passwordResetToken: createModelMock(),
    pointsTransaction: createModelMock(),
    pomodoroStats: createModelMock(),
    profile: createModelMock(),
    profileAccessLog: createModelMock(),
    progress: createModelMock(),
    pushSubscription: createModelMock(),
    quizResult: createModelMock(),
    rateLimitEvent: createModelMock(),
    researchExperiment: createModelMock(),
    researchResult: createModelMock(),
    sSOSession: createModelMock(),
    safetyEvent: createModelMock(),
    scheduledSession: createModelMock(),
    schoolSSOConfig: createModelMock(),
    secretVault: createModelMock(),
    sessionMetrics: createModelMock(),
    settings: createModelMock(),
    studentInsightProfile: createModelMock(),
    studyKit: createModelMock(),
    studySchedule: createModelMock(),
    studySession: createModelMock(),
    syntheticProfile: createModelMock(),
    tag: createModelMock(),
    taxConfig: createModelMock(),
    telemetryEvent: createModelMock(),
    tierAuditLog: createModelMock(),
    tierConfigSnapshot: createModelMock(),
    tierDefinition: createModelMock(),
    toolOutput: createModelMock(),
    topicAttempt: createModelMock(),
    topicStep: createModelMock(),
    tosAcceptance: createModelMock(),
    trialSession: createModelMock(),
    usagePattern: createModelMock(),
    user: createModelMock(),
    userAchievement: createModelMock(),
    userActivity: createModelMock(),
    userFeatureConfig: createModelMock(),
    userGamification: createModelMock(),
    userPrivacyPreferences: createModelMock(),
    userSubscription: createModelMock(),
    videoVisionUsage: createModelMock(),
    waitlistEntry: createModelMock(),

    // Root-level methods
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
