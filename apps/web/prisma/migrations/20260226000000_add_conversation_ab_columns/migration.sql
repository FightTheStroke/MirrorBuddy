-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "abBucketLabel" TEXT,
ADD COLUMN     "abExperimentId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_abExperimentId_idx" ON "Conversation"("abExperimentId");
