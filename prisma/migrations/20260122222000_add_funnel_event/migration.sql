-- FunnelEvent model for conversion funnel tracking (F-02)
CREATE TABLE IF NOT EXISTS "FunnelEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "visitorId" TEXT,
  "userId" TEXT,
  "stage" TEXT NOT NULL,
  "fromStage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isTestData" BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "FunnelEvent_visitorId_createdAt_idx" ON "FunnelEvent"("visitorId", "createdAt");
CREATE INDEX IF NOT EXISTS "FunnelEvent_userId_createdAt_idx" ON "FunnelEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "FunnelEvent_stage_createdAt_idx" ON "FunnelEvent"("stage", "createdAt");
CREATE INDEX IF NOT EXISTS "FunnelEvent_isTestData_createdAt_idx" ON "FunnelEvent"("isTestData", "createdAt");
