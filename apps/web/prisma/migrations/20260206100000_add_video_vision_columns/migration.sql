-- AlterTable: Add video vision columns (ADR 0122)
ALTER TABLE "TierDefinition" ADD COLUMN "videoVisionSecondsPerSession" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TierDefinition" ADD COLUMN "videoVisionMinutesMonthly" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add video vision usage tracking to TrialSession
ALTER TABLE "TrialSession" ADD COLUMN "videoVisionSecondsUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: VideoVisionUsage - per-session and monthly tracking
CREATE TABLE "VideoVisionUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceSessionId" TEXT NOT NULL,
    "framesUsed" INTEGER NOT NULL DEFAULT 0,
    "secondsUsed" INTEGER NOT NULL DEFAULT 0,
    "periodMonth" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoVisionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoVisionUsage_userId_periodMonth_idx" ON "VideoVisionUsage"("userId", "periodMonth");
CREATE INDEX "VideoVisionUsage_voiceSessionId_idx" ON "VideoVisionUsage"("voiceSessionId");
CREATE INDEX "VideoVisionUsage_createdAt_idx" ON "VideoVisionUsage"("createdAt");

-- AddForeignKey
ALTER TABLE "VideoVisionUsage" ADD CONSTRAINT "VideoVisionUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
