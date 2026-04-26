-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "TierAuditAction" AS ENUM ('TIER_CREATE', 'TIER_UPDATE', 'TIER_DELETE', 'SUBSCRIPTION_CREATE', 'SUBSCRIPTION_UPDATE', 'SUBSCRIPTION_DELETE', 'TIER_CHANGE', 'USER_FEATURE_CONFIG_SET', 'USER_FEATURE_CONFIG_DELETE');

-- CreateTable
CREATE TABLE "TierDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "chatLimitDaily" INTEGER NOT NULL DEFAULT 10,
    "voiceMinutesDaily" INTEGER NOT NULL DEFAULT 5,
    "toolsLimitDaily" INTEGER NOT NULL DEFAULT 10,
    "docsLimitTotal" INTEGER NOT NULL DEFAULT 1,
    "chatModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "realtimeModel" TEXT NOT NULL DEFAULT 'gpt-realtime-mini',
    "pdfModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "mindmapModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "quizModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "flashcardsModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "summaryModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "formulaModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "chartModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "homeworkModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "webcamModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "demoModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "featureConfigs" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '{}',
    "availableMaestri" JSONB NOT NULL DEFAULT '[]',
    "availableCoaches" JSONB NOT NULL DEFAULT '[]',
    "availableBuddies" JSONB NOT NULL DEFAULT '[]',
    "availableTools" JSONB NOT NULL DEFAULT '[]',
    "stripePriceId" TEXT,
    "monthlyPriceEur" DECIMAL(65,30),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TierDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'azure',
    "deploymentName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "inputCostPer1k" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "outputCostPer1k" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "contextWindow" INTEGER NOT NULL DEFAULT 128000,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsTools" BOOLEAN NOT NULL DEFAULT true,
    "supportsJson" BOOLEAN NOT NULL DEFAULT true,
    "qualityScore" INTEGER NOT NULL DEFAULT 3,
    "speedScore" INTEGER NOT NULL DEFAULT 3,
    "educationScore" INTEGER NOT NULL DEFAULT 3,
    "recommendedFor" JSONB NOT NULL DEFAULT '[]',
    "notRecommendedFor" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "overrideLimits" JSONB,
    "overrideFeatures" JSONB,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierAuditLog" (
    "id" TEXT NOT NULL,
    "tierId" TEXT,
    "userId" TEXT,
    "adminId" TEXT NOT NULL,
    "action" "TierAuditAction" NOT NULL,
    "changes" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TierAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeatureConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT,
    "temperature" DECIMAL(65,30),
    "maxTokens" INTEGER,
    "isEnabled" BOOLEAN,
    "setBy" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFeatureConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierConfigSnapshot" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "configSnapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TierConfigSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TierDefinition_code_key" ON "TierDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ModelCatalog_name_key" ON "ModelCatalog"("name");

-- CreateIndex
CREATE INDEX "ModelCatalog_category_idx" ON "ModelCatalog"("category");

-- CreateIndex
CREATE INDEX "ModelCatalog_isActive_idx" ON "ModelCatalog"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_userId_key" ON "UserSubscription"("userId");

-- CreateIndex
CREATE INDEX "UserSubscription_tierId_idx" ON "UserSubscription"("tierId");

-- CreateIndex
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");

-- CreateIndex
CREATE INDEX "TierAuditLog_tierId_idx" ON "TierAuditLog"("tierId");

-- CreateIndex
CREATE INDEX "TierAuditLog_userId_idx" ON "TierAuditLog"("userId");

-- CreateIndex
CREATE INDEX "TierAuditLog_adminId_idx" ON "TierAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "TierAuditLog_createdAt_idx" ON "TierAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserFeatureConfig_userId_idx" ON "UserFeatureConfig"("userId");

-- CreateIndex
CREATE INDEX "UserFeatureConfig_feature_idx" ON "UserFeatureConfig"("feature");

-- CreateIndex
CREATE INDEX "UserFeatureConfig_expiresAt_idx" ON "UserFeatureConfig"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserFeatureConfig_userId_feature_key" ON "UserFeatureConfig"("userId", "feature");

-- CreateIndex
CREATE INDEX "TierConfigSnapshot_tierId_idx" ON "TierConfigSnapshot"("tierId");

-- CreateIndex
CREATE INDEX "TierConfigSnapshot_isActive_idx" ON "TierConfigSnapshot"("isActive");

-- CreateIndex
CREATE INDEX "TierConfigSnapshot_createdAt_idx" ON "TierConfigSnapshot"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TierConfigSnapshot_tierId_version_key" ON "TierConfigSnapshot"("tierId", "version");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "TierDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeatureConfig" ADD CONSTRAINT "UserFeatureConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierConfigSnapshot" ADD CONSTRAINT "TierConfigSnapshot_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "TierDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
