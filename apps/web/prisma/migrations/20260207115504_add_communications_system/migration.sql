-- CreateEnum
CREATE TYPE "EmailCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailRecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('DELIVERED', 'OPENED', 'BOUNCED', 'COMPLAINED');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "status" "EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "adminId" TEXT NOT NULL,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" "EmailRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "resendMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),

    CONSTRAINT "email_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productUpdates" BOOLEAN NOT NULL DEFAULT true,
    "educationalNewsletter" BOOLEAN NOT NULL DEFAULT true,
    "announcements" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_events" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "eventType" "EmailEventType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "email_templates"("name");

-- CreateIndex
CREATE INDEX "email_templates_category_idx" ON "email_templates"("category");

-- CreateIndex
CREATE INDEX "email_templates_isActive_idx" ON "email_templates"("isActive");

-- CreateIndex
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns"("status");

-- CreateIndex
CREATE INDEX "email_campaigns_adminId_idx" ON "email_campaigns"("adminId");

-- CreateIndex
CREATE INDEX "email_campaigns_createdAt_idx" ON "email_campaigns"("createdAt");

-- CreateIndex
CREATE INDEX "email_recipients_campaignId_idx" ON "email_recipients"("campaignId");

-- CreateIndex
CREATE INDEX "email_recipients_userId_idx" ON "email_recipients"("userId");

-- CreateIndex
CREATE INDEX "email_recipients_status_idx" ON "email_recipients"("status");

-- CreateIndex
CREATE INDEX "email_recipients_resendMessageId_idx" ON "email_recipients"("resendMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "email_preferences_userId_key" ON "email_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_preferences_unsubscribeToken_key" ON "email_preferences"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "email_preferences_userId_idx" ON "email_preferences"("userId");

-- CreateIndex
CREATE INDEX "email_preferences_unsubscribeToken_idx" ON "email_preferences"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "email_events_recipientId_idx" ON "email_events"("recipientId");

-- CreateIndex
CREATE INDEX "email_events_eventType_idx" ON "email_events"("eventType");

-- CreateIndex
CREATE INDEX "email_events_receivedAt_idx" ON "email_events"("receivedAt");

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_recipients" ADD CONSTRAINT "email_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "email_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
