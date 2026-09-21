-- Restore the foreign keys the Prisma schema has always declared but that were
-- never created in SQL. Without them PostgreSQL never cascaded deletes, so
-- removing a user left their materials, collections, tags, study kits,
-- notifications and consent records behind (GDPR erasure gap, ADR 0067 family).
--
-- Each block first removes the rows that can no longer be attached to a parent,
-- then installs the constraint declared in apps/web/prisma/schema/.

-- EmailCampaign.templateId -> EmailTemplate.id (Restrict)
DELETE FROM "email_campaigns"
 WHERE NOT EXISTS (SELECT 1 FROM "email_templates" p WHERE p."id" = "email_campaigns"."templateId");
ALTER TABLE "email_campaigns" DROP CONSTRAINT IF EXISTS "EmailCampaign_templateId_fkey";
ALTER TABLE "email_campaigns" ADD CONSTRAINT "EmailCampaign_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "email_templates"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- EmailRecipient.campaignId -> EmailCampaign.id (Cascade)
DELETE FROM "email_recipients"
 WHERE NOT EXISTS (SELECT 1 FROM "email_campaigns" p WHERE p."id" = "email_recipients"."campaignId");
ALTER TABLE "email_recipients" DROP CONSTRAINT IF EXISTS "EmailRecipient_campaignId_fkey";
ALTER TABLE "email_recipients" ADD CONSTRAINT "EmailRecipient_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- EmailEvent.recipientId -> EmailRecipient.id (Cascade)
DELETE FROM "email_events"
 WHERE NOT EXISTS (SELECT 1 FROM "email_recipients" p WHERE p."id" = "email_events"."recipientId");
ALTER TABLE "email_events" DROP CONSTRAINT IF EXISTS "EmailEvent_recipientId_fkey";
ALTER TABLE "email_events" ADD CONSTRAINT "EmailEvent_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "email_recipients"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ComplianceAuditEntry.userId -> User.id (SetNull)
UPDATE "compliance_audit_entries" SET "userId" = NULL
 WHERE "userId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "compliance_audit_entries"."userId");
ALTER TABLE "compliance_audit_entries" DROP CONSTRAINT IF EXISTS "ComplianceAuditEntry_userId_fkey";
ALTER TABLE "compliance_audit_entries" ADD CONSTRAINT "ComplianceAuditEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Material.userId -> User.id (Cascade)
DELETE FROM "Material"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "Material"."userId");
ALTER TABLE "Material" DROP CONSTRAINT IF EXISTS "Material_userId_fkey";
ALTER TABLE "Material" ADD CONSTRAINT "Material_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Collection.userId -> User.id (Cascade)
DELETE FROM "Collection"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "Collection"."userId");
ALTER TABLE "Collection" DROP CONSTRAINT IF EXISTS "Collection_userId_fkey";
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Tag.userId -> User.id (Cascade)
DELETE FROM "Tag"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "Tag"."userId");
ALTER TABLE "Tag" DROP CONSTRAINT IF EXISTS "Tag_userId_fkey";
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- StudyKit.userId -> User.id (Cascade)
DELETE FROM "StudyKit"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "StudyKit"."userId");
ALTER TABLE "StudyKit" DROP CONSTRAINT IF EXISTS "StudyKit_userId_fkey";
ALTER TABLE "StudyKit" ADD CONSTRAINT "StudyKit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- UsagePattern.userId -> User.id (Cascade)
DELETE FROM "usage_patterns"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "usage_patterns"."userId");
ALTER TABLE "usage_patterns" DROP CONSTRAINT IF EXISTS "UsagePattern_userId_fkey";
ALTER TABLE "usage_patterns" ADD CONSTRAINT "UsagePattern_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- DependencyAlert.userId -> User.id (Cascade)
DELETE FROM "dependency_alerts"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "dependency_alerts"."userId");
ALTER TABLE "dependency_alerts" DROP CONSTRAINT IF EXISTS "DependencyAlert_userId_fkey";
ALTER TABLE "dependency_alerts" ADD CONSTRAINT "DependencyAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- SessionMetrics.userId -> User.id (Cascade)
DELETE FROM "session_metrics"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "session_metrics"."userId");
ALTER TABLE "session_metrics" DROP CONSTRAINT IF EXISTS "SessionMetrics_userId_fkey";
ALTER TABLE "session_metrics" ADD CONSTRAINT "SessionMetrics_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- MethodProgress.userId -> User.id (Cascade)
DELETE FROM "MethodProgress"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "MethodProgress"."userId");
ALTER TABLE "MethodProgress" DROP CONSTRAINT IF EXISTS "MethodProgress_userId_fkey";
ALTER TABLE "MethodProgress" ADD CONSTRAINT "MethodProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ParentNote.userId -> User.id (Cascade)
DELETE FROM "ParentNote"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "ParentNote"."userId");
ALTER TABLE "ParentNote" DROP CONSTRAINT IF EXISTS "ParentNote_userId_fkey";
ALTER TABLE "ParentNote" ADD CONSTRAINT "ParentNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- LearningPath.userId -> User.id (Cascade)
DELETE FROM "LearningPath"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "LearningPath"."userId");
ALTER TABLE "LearningPath" DROP CONSTRAINT IF EXISTS "LearningPath_userId_fkey";
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- TopicAttempt.userId -> User.id (Cascade)
DELETE FROM "TopicAttempt"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "TopicAttempt"."userId");
ALTER TABLE "TopicAttempt" DROP CONSTRAINT IF EXISTS "TopicAttempt_userId_fkey";
ALTER TABLE "TopicAttempt" ADD CONSTRAINT "TopicAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- TosAcceptance.userId -> User.id (Cascade)
DELETE FROM "tos_acceptances"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "tos_acceptances"."userId");
ALTER TABLE "tos_acceptances" DROP CONSTRAINT IF EXISTS "TosAcceptance_userId_fkey";
ALTER TABLE "tos_acceptances" ADD CONSTRAINT "TosAcceptance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ContentEmbedding.userId -> User.id (Cascade)
DELETE FROM "ContentEmbedding"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "ContentEmbedding"."userId");
ALTER TABLE "ContentEmbedding" DROP CONSTRAINT IF EXISTS "ContentEmbedding_userId_fkey";
ALTER TABLE "ContentEmbedding" ADD CONSTRAINT "ContentEmbedding_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification.userId -> User.id (Cascade)
DELETE FROM "Notification"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "Notification"."userId");
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- StudySchedule.userId -> User.id (Cascade)
DELETE FROM "StudySchedule"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "StudySchedule"."userId");
ALTER TABLE "StudySchedule" DROP CONSTRAINT IF EXISTS "StudySchedule_userId_fkey";
ALTER TABLE "StudySchedule" ADD CONSTRAINT "StudySchedule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ScheduledSession.userId -> User.id (Cascade)
DELETE FROM "ScheduledSession"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "ScheduledSession"."userId");
ALTER TABLE "ScheduledSession" DROP CONSTRAINT IF EXISTS "ScheduledSession_userId_fkey";
ALTER TABLE "ScheduledSession" ADD CONSTRAINT "ScheduledSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CustomReminder.userId -> User.id (Cascade)
DELETE FROM "CustomReminder"
 WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "CustomReminder"."userId");
ALTER TABLE "CustomReminder" DROP CONSTRAINT IF EXISTS "CustomReminder_userId_fkey";
ALTER TABLE "CustomReminder" ADD CONSTRAINT "CustomReminder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
