-- AlterTable: Add video vision limit columns to TierDefinition (ADR 0122)
ALTER TABLE "TierDefinition" ADD COLUMN "videoVisionSecondsPerSession" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TierDefinition" ADD COLUMN "videoVisionMinutesMonthly" INTEGER NOT NULL DEFAULT 0;
