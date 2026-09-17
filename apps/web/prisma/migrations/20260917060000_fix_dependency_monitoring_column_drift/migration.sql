-- Dependency monitoring column drift (usage_patterns, dependency_alerts).
--
-- 20260204120000_add_dependency_monitoring was hand-written with snake_case
-- columns while the Prisma models declare camelCase fields and no @map, so
-- every query against these two tables failed at runtime with
-- "column ... does not exist". The nightly /api/cron/dependency-analysis job
-- has returned HTTP 500 since February and both tables are still empty.
--
-- Columns are renamed rather than dropped and recreated, so no row would be
-- lost if these tables were populated before this migration runs. Every
-- environment builds its schema with `prisma migrate deploy`, so every
-- database reaches this migration in the same snake_case state.

ALTER TABLE "usage_patterns" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "usage_patterns" RENAME COLUMN "session_count" TO "sessionCount";
ALTER TABLE "usage_patterns" RENAME COLUMN "total_minutes" TO "totalMinutes";
ALTER TABLE "usage_patterns" RENAME COLUMN "message_count" TO "messageCount";
ALTER TABLE "usage_patterns" RENAME COLUMN "emotional_vent_count" TO "emotionalVentCount";
ALTER TABLE "usage_patterns" RENAME COLUMN "ai_preference_count" TO "aiPreferenceCount";
ALTER TABLE "usage_patterns" RENAME COLUMN "night_minutes" TO "nightMinutes";
ALTER TABLE "usage_patterns" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "usage_patterns" RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "dependency_alerts" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "dependency_alerts" RENAME COLUMN "alert_type" TO "alertType";
ALTER TABLE "dependency_alerts" RENAME COLUMN "sigma_deviation" TO "sigmaDeviation";
ALTER TABLE "dependency_alerts" RENAME COLUMN "trigger_value" TO "triggerValue";
ALTER TABLE "dependency_alerts" RENAME COLUMN "resolved_at" TO "resolvedAt";
ALTER TABLE "dependency_alerts" RENAME COLUMN "resolved_by" TO "resolvedBy";
ALTER TABLE "dependency_alerts" RENAME COLUMN "parent_notified" TO "parentNotified";
ALTER TABLE "dependency_alerts" RENAME COLUMN "parent_notified_at" TO "parentNotifiedAt";
ALTER TABLE "dependency_alerts" RENAME COLUMN "created_at" TO "createdAt";

-- Fields the models declare that the hand-written migration never created.
ALTER TABLE "usage_patterns" ADD COLUMN "weekdayAverage" DOUBLE PRECISION;
ALTER TABLE "usage_patterns" ADD COLUMN "stdDeviation" DOUBLE PRECISION;
ALTER TABLE "usage_patterns" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dependency_alerts" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;

-- Constraint and index identifiers follow the renamed columns.
ALTER TABLE "usage_patterns" RENAME CONSTRAINT "usage_patterns_user_id_fkey" TO "usage_patterns_userId_fkey";
ALTER TABLE "dependency_alerts" RENAME CONSTRAINT "dependency_alerts_user_id_fkey" TO "dependency_alerts_userId_fkey";

ALTER INDEX "usage_patterns_user_id_date_key" RENAME TO "usage_patterns_userId_date_key";
ALTER INDEX "usage_patterns_user_id_idx" RENAME TO "usage_patterns_userId_idx";
ALTER INDEX IF EXISTS "dependency_alerts_user_id_idx" RENAME TO "dependency_alerts_userId_idx";

-- The models declare no index on parentNotified.
DROP INDEX IF EXISTS "dependency_alerts_parent_notified_idx";

CREATE INDEX IF NOT EXISTS "usage_patterns_isTestData_date_idx" ON "usage_patterns"("isTestData", "date");
CREATE INDEX IF NOT EXISTS "dependency_alerts_userId_idx" ON "dependency_alerts"("userId");
CREATE INDEX IF NOT EXISTS "dependency_alerts_alertType_idx" ON "dependency_alerts"("alertType");
CREATE INDEX IF NOT EXISTS "dependency_alerts_createdAt_idx" ON "dependency_alerts"("createdAt");
CREATE INDEX IF NOT EXISTS "dependency_alerts_isTestData_createdAt_idx" ON "dependency_alerts"("isTestData", "createdAt");

-- FunnelEvent.locale reached production without a migration, so a freshly
-- built environment (CI, a new checkout, a restored backup) lacks a column the
-- model declares. IF NOT EXISTS keeps the production column and its 33 rows.
ALTER TABLE "FunnelEvent" ADD COLUMN IF NOT EXISTS "locale" TEXT;
CREATE INDEX IF NOT EXISTS "FunnelEvent_locale_createdAt_idx" ON "FunnelEvent"("locale", "createdAt");
