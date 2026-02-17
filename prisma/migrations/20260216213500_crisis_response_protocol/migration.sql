-- AlterTable: Add crisis response fields to SafetyEvent
ALTER TABLE "SafetyEvent" ADD COLUMN "category" TEXT;
ALTER TABLE "SafetyEvent" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "SafetyEvent" ADD COLUMN "contentSnippet" TEXT;
ALTER TABLE "SafetyEvent" ADD COLUMN "locale" TEXT;
ALTER TABLE "SafetyEvent" ADD COLUMN "metadata" JSONB;
ALTER TABLE "SafetyEvent" ADD COLUMN "parentNotified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SafetyEvent" ADD COLUMN "parentNotifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SafetyEvent_category_timestamp_idx" ON "SafetyEvent"("category", "timestamp");

-- AlterTable: Add guardian contact fields to Settings
ALTER TABLE "Settings" ADD COLUMN "guardianEmail" TEXT;
ALTER TABLE "Settings" ADD COLUMN "guardianPhone" TEXT;
ALTER TABLE "Settings" ADD COLUMN "guardianName" TEXT;
