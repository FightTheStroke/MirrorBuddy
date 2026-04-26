-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "schoolYear" INTEGER,
    "schoolLevel" TEXT NOT NULL DEFAULT 'superiore',
    "gradeLevel" TEXT,
    "learningGoals" TEXT NOT NULL DEFAULT '[]',
    "preferredCoach" TEXT,
    "preferredBuddy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'it',
    "accentColor" TEXT NOT NULL DEFAULT 'blue',
    "fontSize" TEXT NOT NULL DEFAULT 'medium',
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "dyslexiaFont" BOOLEAN NOT NULL DEFAULT false,
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "simplifiedLanguage" BOOLEAN NOT NULL DEFAULT false,
    "adhdMode" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'azure',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "budgetLimit" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "parentChatConsentAt" TIMESTAMP(3),
    "parentDashboardLastViewed" TIMESTAMP(3),
    "azureCostConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "seasonMirrorBucks" INTEGER NOT NULL DEFAULT 0,
    "seasonLevel" INTEGER NOT NULL DEFAULT 1,
    "allTimeLevel" INTEGER NOT NULL DEFAULT 1,
    "currentSeason" TEXT,
    "seasonHistory" TEXT NOT NULL DEFAULT '[]',
    "streakCurrent" INTEGER NOT NULL DEFAULT 0,
    "streakLongest" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TIMESTAMP(3),
    "totalStudyMinutes" INTEGER NOT NULL DEFAULT 0,
    "questionsAsked" INTEGER NOT NULL DEFAULT 0,
    "sessionsThisWeek" INTEGER NOT NULL DEFAULT 0,
    "achievements" TEXT NOT NULL DEFAULT '[]',
    "masteries" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maestroId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "questions" INTEGER NOT NULL DEFAULT 0,
    "studentRating" INTEGER,
    "studentFeedback" TEXT,
    "maestroScore" INTEGER,
    "maestroFeedback" TEXT,
    "strengths" TEXT,
    "areasToImprove" TEXT,
    "topics" TEXT NOT NULL DEFAULT '[]',
    "conversationId" TEXT,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "deckId" TEXT,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "retrievability" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "state" TEXT NOT NULL DEFAULT 'new',
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastReview" TIMESTAMP(3),
    "nextReview" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "subject" TEXT,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '[]',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maestroId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "keyFacts" TEXT,
    "topics" TEXT NOT NULL DEFAULT '[]',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastMessageAt" TIMESTAMP(3),
    "isParentMode" BOOLEAN NOT NULL DEFAULT false,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" TEXT,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Learning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maestroId" TEXT,
    "subject" TEXT,
    "category" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Learning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentInsightProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "visibleTo" TEXT NOT NULL DEFAULT 'parents',
    "parentConsent" BOOLEAN NOT NULL DEFAULT false,
    "studentConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "deletionRequested" TIMESTAMP(3),
    "insights" TEXT NOT NULL DEFAULT '[]',
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "growthAreas" TEXT NOT NULL DEFAULT '[]',
    "learningStyle" TEXT NOT NULL DEFAULT '{}',
    "strategies" TEXT NOT NULL DEFAULT '[]',
    "progressHistory" TEXT NOT NULL DEFAULT '[]',
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "lastSessionId" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentInsightProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileAccessLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "metadata" TEXT,
    "priority" TEXT,
    "relatedId" TEXT,
    "melissaVoice" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "label" TEXT,
    "value" DOUBLE PRECISION,
    "metadata" TEXT,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MethodProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mindMaps" TEXT NOT NULL DEFAULT '{}',
    "flashcards" TEXT NOT NULL DEFAULT '{}',
    "selfAssessment" TEXT NOT NULL DEFAULT '{}',
    "helpBehavior" TEXT NOT NULL DEFAULT '{}',
    "methodTransfer" TEXT NOT NULL DEFAULT '{}',
    "events" TEXT NOT NULL DEFAULT '[]',
    "autonomyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MethodProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "maestroId" TEXT,
    "sessionId" TEXT,
    "subject" TEXT,
    "preview" TEXT,
    "messageId" TEXT,
    "topic" TEXT,
    "conversationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "userRating" INTEGER,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "searchableText" TEXT,
    "collectionId" TEXT,
    "sourceStudyKitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialTag" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "maestroId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "highlights" TEXT NOT NULL,
    "concerns" TEXT,
    "suggestions" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "ParentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatedTool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "content" TEXT NOT NULL DEFAULT '{}',
    "maestroId" TEXT,
    "conversationId" TEXT,
    "sessionId" TEXT,
    "userRating" INTEGER,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatedTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "subject" TEXT NOT NULL,
    "maestroId" TEXT,
    "topic" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reminderOffset" INTEGER NOT NULL DEFAULT 5,
    "repeat" TEXT NOT NULL DEFAULT 'weekly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "subject" TEXT,
    "maestroId" TEXT,
    "repeat" TEXT NOT NULL DEFAULT 'none',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessibilitySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dyslexiaFont" BOOLEAN NOT NULL DEFAULT false,
    "extraLetterSpacing" BOOLEAN NOT NULL DEFAULT false,
    "increasedLineHeight" BOOLEAN NOT NULL DEFAULT false,
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "largeText" BOOLEAN NOT NULL DEFAULT false,
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "ttsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ttsSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "ttsAutoRead" BOOLEAN NOT NULL DEFAULT false,
    "adhdMode" BOOLEAN NOT NULL DEFAULT false,
    "distractionFreeMode" BOOLEAN NOT NULL DEFAULT false,
    "breakReminders" BOOLEAN NOT NULL DEFAULT false,
    "lineSpacing" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "fontSize" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "colorBlindMode" BOOLEAN NOT NULL DEFAULT false,
    "keyboardNavigation" BOOLEAN NOT NULL DEFAULT true,
    "customBackgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "customTextColor" TEXT NOT NULL DEFAULT '#000000',
    "adhdConfig" TEXT NOT NULL DEFAULT '{}',
    "adhdStats" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessibilitySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "currentStep" TEXT NOT NULL DEFAULT 'welcome',
    "isReplayMode" BOOLEAN NOT NULL DEFAULT false,
    "isVoiceMuted" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PomodoroStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedPomodoros" INTEGER NOT NULL DEFAULT 0,
    "totalFocusTime" INTEGER NOT NULL DEFAULT 0,
    "todayPomodoros" INTEGER NOT NULL DEFAULT 0,
    "todayFocusMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT NOT NULL DEFAULT '',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PomodoroStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "maestroId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "duration" INTEGER,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "reminded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HtmlSnippet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snippetId" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "css" TEXT,
    "js" TEXT,
    "title" TEXT,
    "subject" TEXT,
    "maestroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HtmlSnippet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT,
    "topic" TEXT,
    "problemType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "messages" TEXT NOT NULL DEFAULT '[]',
    "steps" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyKit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "mindmap" TEXT,
    "demo" TEXT,
    "quiz" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "subject" TEXT,
    "pageCount" INTEGER,
    "wordCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "sourceStudyKitId" TEXT,
    "totalTopics" INTEGER NOT NULL DEFAULT 0,
    "completedTopics" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "visualOverview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPathTopic" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keyConcepts" TEXT NOT NULL DEFAULT '[]',
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "status" TEXT NOT NULL DEFAULT 'locked',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "quizScore" INTEGER,
    "relatedMaterials" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPathTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicStep" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '{}',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicAttempt" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'quiz',
    "score" INTEGER,
    "totalQuestions" INTEGER,
    "correctAnswers" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "answers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "window" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "conversationId" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGamification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "seasonPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "tier" TEXT NOT NULL DEFAULT 'principiante',
    "currentSeason" TEXT NOT NULL,
    "seasonStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mirrorBucks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGamification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "requirement" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "gamificationId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStreak" (
    "id" TEXT NOT NULL,
    "gamificationId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 30,
    "todayMinutes" INTEGER NOT NULL DEFAULT 0,
    "goalMetToday" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsTransaction" (
    "id" TEXT NOT NULL,
    "gamificationId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceType" TEXT,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEmbedding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "vector" TEXT,
    "vectorNative" vector(1536),
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "dimensions" INTEGER NOT NULL DEFAULT 1536,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialEdge" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialConcept" (
    "materialId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialConcept_pkey" PRIMARY KEY ("materialId","conceptId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_key" ON "Progress"("userId");

-- CreateIndex
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");

-- CreateIndex
CREATE INDEX "StudySession_startedAt_idx" ON "StudySession"("startedAt");

-- CreateIndex
CREATE INDEX "StudySession_conversationId_idx" ON "StudySession"("conversationId");

-- CreateIndex
CREATE INDEX "FlashcardProgress_userId_idx" ON "FlashcardProgress"("userId");

-- CreateIndex
CREATE INDEX "FlashcardProgress_nextReview_idx" ON "FlashcardProgress"("nextReview");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardProgress_userId_cardId_key" ON "FlashcardProgress"("userId", "cardId");

-- CreateIndex
CREATE INDEX "QuizResult_userId_idx" ON "QuizResult"("userId");

-- CreateIndex
CREATE INDEX "QuizResult_completedAt_idx" ON "QuizResult"("completedAt");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_maestroId_idx" ON "Conversation"("maestroId");

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_isParentMode_idx" ON "Conversation"("isParentMode");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Learning_userId_idx" ON "Learning"("userId");

-- CreateIndex
CREATE INDEX "Learning_category_idx" ON "Learning"("category");

-- CreateIndex
CREATE INDEX "Learning_confidence_idx" ON "Learning"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInsightProfile_userId_key" ON "StudentInsightProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentInsightProfile_userId_idx" ON "StudentInsightProfile"("userId");

-- CreateIndex
CREATE INDEX "ProfileAccessLog_profileId_idx" ON "ProfileAccessLog"("profileId");

-- CreateIndex
CREATE INDEX "ProfileAccessLog_timestamp_idx" ON "ProfileAccessLog"("timestamp");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_scheduledFor_idx" ON "Notification"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "TelemetryEvent_eventId_key" ON "TelemetryEvent"("eventId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_userId_idx" ON "TelemetryEvent"("userId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_sessionId_idx" ON "TelemetryEvent"("sessionId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_timestamp_idx" ON "TelemetryEvent"("timestamp");

-- CreateIndex
CREATE INDEX "TelemetryEvent_category_idx" ON "TelemetryEvent"("category");

-- CreateIndex
CREATE INDEX "TelemetryEvent_action_idx" ON "TelemetryEvent"("action");

-- CreateIndex
CREATE UNIQUE INDEX "MethodProgress_userId_key" ON "MethodProgress"("userId");

-- CreateIndex
CREATE INDEX "MethodProgress_userId_idx" ON "MethodProgress"("userId");

-- CreateIndex
CREATE INDEX "MethodProgress_autonomyScore_idx" ON "MethodProgress"("autonomyScore");

-- CreateIndex
CREATE UNIQUE INDEX "Material_toolId_key" ON "Material"("toolId");

-- CreateIndex
CREATE INDEX "Material_userId_idx" ON "Material"("userId");

-- CreateIndex
CREATE INDEX "Material_toolType_idx" ON "Material"("toolType");

-- CreateIndex
CREATE INDEX "Material_status_idx" ON "Material"("status");

-- CreateIndex
CREATE INDEX "Material_sessionId_idx" ON "Material"("sessionId");

-- CreateIndex
CREATE INDEX "Material_messageId_idx" ON "Material"("messageId");

-- CreateIndex
CREATE INDEX "Material_createdAt_idx" ON "Material"("createdAt");

-- CreateIndex
CREATE INDEX "Material_isBookmarked_idx" ON "Material"("isBookmarked");

-- CreateIndex
CREATE INDEX "Material_collectionId_idx" ON "Material"("collectionId");

-- CreateIndex
CREATE INDEX "Material_sourceStudyKitId_idx" ON "Material"("sourceStudyKitId");

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "Collection_parentId_idx" ON "Collection"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_name_parentId_key" ON "Collection"("userId", "name", "parentId");

-- CreateIndex
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE INDEX "MaterialTag_materialId_idx" ON "MaterialTag"("materialId");

-- CreateIndex
CREATE INDEX "MaterialTag_tagId_idx" ON "MaterialTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialTag_materialId_tagId_key" ON "MaterialTag"("materialId", "tagId");

-- CreateIndex
CREATE INDEX "ParentNote_userId_idx" ON "ParentNote"("userId");

-- CreateIndex
CREATE INDEX "ParentNote_sessionId_idx" ON "ParentNote"("sessionId");

-- CreateIndex
CREATE INDEX "ParentNote_generatedAt_idx" ON "ParentNote"("generatedAt");

-- CreateIndex
CREATE INDEX "CreatedTool_userId_idx" ON "CreatedTool"("userId");

-- CreateIndex
CREATE INDEX "CreatedTool_type_idx" ON "CreatedTool"("type");

-- CreateIndex
CREATE INDEX "CreatedTool_createdAt_idx" ON "CreatedTool"("createdAt");

-- CreateIndex
CREATE INDEX "CreatedTool_isBookmarked_idx" ON "CreatedTool"("isBookmarked");

-- CreateIndex
CREATE UNIQUE INDEX "StudySchedule_userId_key" ON "StudySchedule"("userId");

-- CreateIndex
CREATE INDEX "StudySchedule_userId_idx" ON "StudySchedule"("userId");

-- CreateIndex
CREATE INDEX "ScheduledSession_userId_idx" ON "ScheduledSession"("userId");

-- CreateIndex
CREATE INDEX "ScheduledSession_scheduleId_idx" ON "ScheduledSession"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduledSession_dayOfWeek_idx" ON "ScheduledSession"("dayOfWeek");

-- CreateIndex
CREATE INDEX "ScheduledSession_active_idx" ON "ScheduledSession"("active");

-- CreateIndex
CREATE INDEX "CustomReminder_userId_idx" ON "CustomReminder"("userId");

-- CreateIndex
CREATE INDEX "CustomReminder_scheduleId_idx" ON "CustomReminder"("scheduleId");

-- CreateIndex
CREATE INDEX "CustomReminder_datetime_idx" ON "CustomReminder"("datetime");

-- CreateIndex
CREATE INDEX "CustomReminder_active_idx" ON "CustomReminder"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessibilitySettings_userId_key" ON "AccessibilitySettings"("userId");

-- CreateIndex
CREATE INDEX "AccessibilitySettings_userId_idx" ON "AccessibilitySettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingState_userId_key" ON "OnboardingState"("userId");

-- CreateIndex
CREATE INDEX "OnboardingState_userId_idx" ON "OnboardingState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PomodoroStats_userId_key" ON "PomodoroStats"("userId");

-- CreateIndex
CREATE INDEX "PomodoroStats_userId_idx" ON "PomodoroStats"("userId");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");

-- CreateIndex
CREATE INDEX "CalendarEvent_date_idx" ON "CalendarEvent"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HtmlSnippet_snippetId_key" ON "HtmlSnippet"("snippetId");

-- CreateIndex
CREATE INDEX "HtmlSnippet_userId_idx" ON "HtmlSnippet"("userId");

-- CreateIndex
CREATE INDEX "HtmlSnippet_snippetId_idx" ON "HtmlSnippet"("snippetId");

-- CreateIndex
CREATE INDEX "HomeworkSession_userId_idx" ON "HomeworkSession"("userId");

-- CreateIndex
CREATE INDEX "HomeworkSession_status_idx" ON "HomeworkSession"("status");

-- CreateIndex
CREATE INDEX "StudyKit_userId_idx" ON "StudyKit"("userId");

-- CreateIndex
CREATE INDEX "StudyKit_status_idx" ON "StudyKit"("status");

-- CreateIndex
CREATE INDEX "StudyKit_createdAt_idx" ON "StudyKit"("createdAt");

-- CreateIndex
CREATE INDEX "LearningPath_userId_idx" ON "LearningPath"("userId");

-- CreateIndex
CREATE INDEX "LearningPath_status_idx" ON "LearningPath"("status");

-- CreateIndex
CREATE INDEX "LearningPath_sourceStudyKitId_idx" ON "LearningPath"("sourceStudyKitId");

-- CreateIndex
CREATE INDEX "LearningPath_createdAt_idx" ON "LearningPath"("createdAt");

-- CreateIndex
CREATE INDEX "LearningPath_userId_status_idx" ON "LearningPath"("userId", "status");

-- CreateIndex
CREATE INDEX "LearningPathTopic_pathId_idx" ON "LearningPathTopic"("pathId");

-- CreateIndex
CREATE INDEX "LearningPathTopic_order_idx" ON "LearningPathTopic"("order");

-- CreateIndex
CREATE INDEX "LearningPathTopic_status_idx" ON "LearningPathTopic"("status");

-- CreateIndex
CREATE INDEX "TopicStep_topicId_idx" ON "TopicStep"("topicId");

-- CreateIndex
CREATE INDEX "TopicStep_order_idx" ON "TopicStep"("order");

-- CreateIndex
CREATE INDEX "TopicStep_type_idx" ON "TopicStep"("type");

-- CreateIndex
CREATE INDEX "TopicAttempt_topicId_idx" ON "TopicAttempt"("topicId");

-- CreateIndex
CREATE INDEX "TopicAttempt_userId_idx" ON "TopicAttempt"("userId");

-- CreateIndex
CREATE INDEX "TopicAttempt_type_idx" ON "TopicAttempt"("type");

-- CreateIndex
CREATE INDEX "TopicAttempt_createdAt_idx" ON "TopicAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitEvent_userId_timestamp_idx" ON "RateLimitEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "RateLimitEvent_endpoint_timestamp_idx" ON "RateLimitEvent"("endpoint", "timestamp");

-- CreateIndex
CREATE INDEX "RateLimitEvent_timestamp_idx" ON "RateLimitEvent"("timestamp");

-- CreateIndex
CREATE INDEX "SafetyEvent_userId_timestamp_idx" ON "SafetyEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "SafetyEvent_severity_timestamp_idx" ON "SafetyEvent"("severity", "timestamp");

-- CreateIndex
CREATE INDEX "SafetyEvent_timestamp_idx" ON "SafetyEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UserGamification_userId_key" ON "UserGamification"("userId");

-- CreateIndex
CREATE INDEX "UserGamification_level_idx" ON "UserGamification"("level");

-- CreateIndex
CREATE INDEX "UserGamification_totalPoints_idx" ON "UserGamification"("totalPoints");

-- CreateIndex
CREATE INDEX "UserGamification_currentSeason_idx" ON "UserGamification"("currentSeason");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");

-- CreateIndex
CREATE INDEX "Achievement_tier_idx" ON "Achievement"("tier");

-- CreateIndex
CREATE INDEX "UserAchievement_gamificationId_idx" ON "UserAchievement"("gamificationId");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");

-- CreateIndex
CREATE INDEX "UserAchievement_unlockedAt_idx" ON "UserAchievement"("unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_gamificationId_achievementId_key" ON "UserAchievement"("gamificationId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStreak_gamificationId_key" ON "DailyStreak"("gamificationId");

-- CreateIndex
CREATE INDEX "DailyStreak_currentStreak_idx" ON "DailyStreak"("currentStreak");

-- CreateIndex
CREATE INDEX "DailyStreak_lastActivityAt_idx" ON "DailyStreak"("lastActivityAt");

-- CreateIndex
CREATE INDEX "PointsTransaction_gamificationId_idx" ON "PointsTransaction"("gamificationId");

-- CreateIndex
CREATE INDEX "PointsTransaction_createdAt_idx" ON "PointsTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "PointsTransaction_reason_idx" ON "PointsTransaction"("reason");

-- CreateIndex
CREATE INDEX "ContentEmbedding_userId_idx" ON "ContentEmbedding"("userId");

-- CreateIndex
CREATE INDEX "ContentEmbedding_sourceType_idx" ON "ContentEmbedding"("sourceType");

-- CreateIndex
CREATE INDEX "ContentEmbedding_sourceId_idx" ON "ContentEmbedding"("sourceId");

-- CreateIndex
CREATE INDEX "ContentEmbedding_subject_idx" ON "ContentEmbedding"("subject");

-- CreateIndex
CREATE INDEX "ContentEmbedding_createdAt_idx" ON "ContentEmbedding"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEmbedding_sourceType_sourceId_chunkIndex_key" ON "ContentEmbedding"("sourceType", "sourceId", "chunkIndex");

-- CreateIndex
CREATE INDEX "MaterialEdge_fromId_idx" ON "MaterialEdge"("fromId");

-- CreateIndex
CREATE INDEX "MaterialEdge_toId_idx" ON "MaterialEdge"("toId");

-- CreateIndex
CREATE INDEX "MaterialEdge_relationType_idx" ON "MaterialEdge"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialEdge_fromId_toId_relationType_key" ON "MaterialEdge"("fromId", "toId", "relationType");

-- CreateIndex
CREATE INDEX "Concept_userId_idx" ON "Concept"("userId");

-- CreateIndex
CREATE INDEX "Concept_subject_idx" ON "Concept"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_userId_name_key" ON "Concept"("userId", "name");

-- CreateIndex
CREATE INDEX "MaterialConcept_materialId_idx" ON "MaterialConcept"("materialId");

-- CreateIndex
CREATE INDEX "MaterialConcept_conceptId_idx" ON "MaterialConcept"("conceptId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Learning" ADD CONSTRAINT "Learning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAccessLog" ADD CONSTRAINT "ProfileAccessLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentInsightProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTag" ADD CONSTRAINT "MaterialTag_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTag" ADD CONSTRAINT "MaterialTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledSession" ADD CONSTRAINT "ScheduledSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "StudySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomReminder" ADD CONSTRAINT "CustomReminder_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "StudySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessibilitySettings" ADD CONSTRAINT "AccessibilitySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingState" ADD CONSTRAINT "OnboardingState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroStats" ADD CONSTRAINT "PomodoroStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HtmlSnippet" ADD CONSTRAINT "HtmlSnippet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSession" ADD CONSTRAINT "HomeworkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_sourceStudyKitId_fkey" FOREIGN KEY ("sourceStudyKitId") REFERENCES "StudyKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathTopic" ADD CONSTRAINT "LearningPathTopic_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicStep" ADD CONSTRAINT "TopicStep_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "LearningPathTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicAttempt" ADD CONSTRAINT "TopicAttempt_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "LearningPathTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGamification" ADD CONSTRAINT "UserGamification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_gamificationId_fkey" FOREIGN KEY ("gamificationId") REFERENCES "UserGamification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStreak" ADD CONSTRAINT "DailyStreak_gamificationId_fkey" FOREIGN KEY ("gamificationId") REFERENCES "UserGamification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_gamificationId_fkey" FOREIGN KEY ("gamificationId") REFERENCES "UserGamification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEdge" ADD CONSTRAINT "MaterialEdge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialEdge" ADD CONSTRAINT "MaterialEdge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConcept" ADD CONSTRAINT "MaterialConcept_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConcept" ADD CONSTRAINT "MaterialConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
