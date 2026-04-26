-- CreateEnum
CREATE TYPE "ABExperimentStatus" AS ENUM ('draft', 'active', 'completed');

-- CreateEnum
CREATE TYPE "CommunityContributionType" AS ENUM ('feedback', 'tip', 'resource', 'question');

-- CreateEnum
CREATE TYPE "CommunityContributionStatus" AS ENUM ('pending', 'approved', 'rejected', 'flagged');

-- CreateTable
CREATE TABLE "ABExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ABExperimentStatus" NOT NULL DEFAULT 'draft',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ABExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ABBucketConfig" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "bucketLabel" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "extraConfig" JSONB NOT NULL,

    CONSTRAINT "ABBucketConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommunityContributionType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CommunityContributionStatus" NOT NULL DEFAULT 'pending',
    "moderationNote" TEXT,
    "mirrorBucksReward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionVote" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContributionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkTrend" (
    "id" TEXT NOT NULL,
    "maestroId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "experimentId" TEXT NOT NULL,

    CONSTRAINT "BenchmarkTrend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ABExperiment_status_idx" ON "ABExperiment"("status");

-- CreateIndex
CREATE INDEX "ABExperiment_startDate_idx" ON "ABExperiment"("startDate");

-- CreateIndex
CREATE INDEX "ABBucketConfig_experimentId_idx" ON "ABBucketConfig"("experimentId");

-- CreateIndex
CREATE INDEX "CommunityContribution_userId_idx" ON "CommunityContribution"("userId");

-- CreateIndex
CREATE INDEX "CommunityContribution_type_idx" ON "CommunityContribution"("type");

-- CreateIndex
CREATE INDEX "CommunityContribution_status_idx" ON "CommunityContribution"("status");

-- CreateIndex
CREATE INDEX "CommunityContribution_createdAt_idx" ON "CommunityContribution"("createdAt");

-- CreateIndex
CREATE INDEX "ContributionVote_contributionId_idx" ON "ContributionVote"("contributionId");

-- CreateIndex
CREATE INDEX "ContributionVote_userId_idx" ON "ContributionVote"("userId");

-- CreateIndex
CREATE INDEX "ContributionVote_value_idx" ON "ContributionVote"("value");

-- CreateIndex
CREATE UNIQUE INDEX "ContributionVote_contributionId_userId_key" ON "ContributionVote"("contributionId", "userId");

-- CreateIndex
CREATE INDEX "BenchmarkTrend_maestroId_dimension_runDate_idx" ON "BenchmarkTrend"("maestroId", "dimension", "runDate");

-- AddForeignKey
ALTER TABLE "ABBucketConfig" ADD CONSTRAINT "ABBucketConfig_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ABExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityContribution" ADD CONSTRAINT "CommunityContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionVote" ADD CONSTRAINT "ContributionVote_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "CommunityContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionVote" ADD CONSTRAINT "ContributionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
