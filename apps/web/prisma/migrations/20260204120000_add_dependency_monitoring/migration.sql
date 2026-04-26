-- Dependency Monitoring Tables (Amodei 2026)
-- Reference: ADR 0115 - Amodei Safety Enhancements

-- UsagePattern: Daily usage metrics per user
CREATE TABLE "usage_patterns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "session_count" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "emotional_vent_count" INTEGER NOT NULL DEFAULT 0,
    "ai_preference_count" INTEGER NOT NULL DEFAULT 0,
    "night_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_patterns_pkey" PRIMARY KEY ("id")
);

-- DependencyAlert: Alerts generated when thresholds exceeded
CREATE TABLE "dependency_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "sigma_deviation" DOUBLE PRECISION,
    "trigger_value" INTEGER,
    "threshold" INTEGER,
    "description" TEXT,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution" TEXT,
    "parent_notified" BOOLEAN NOT NULL DEFAULT false,
    "parent_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependency_alerts_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one usage pattern per user per day
CREATE UNIQUE INDEX "usage_patterns_user_id_date_key" ON "usage_patterns"("user_id", "date");

-- Indexes for efficient queries
CREATE INDEX "usage_patterns_user_id_idx" ON "usage_patterns"("user_id");
CREATE INDEX "usage_patterns_date_idx" ON "usage_patterns"("date");
CREATE INDEX "dependency_alerts_user_id_idx" ON "dependency_alerts"("user_id");
CREATE INDEX "dependency_alerts_resolved_idx" ON "dependency_alerts"("resolved");
CREATE INDEX "dependency_alerts_severity_idx" ON "dependency_alerts"("severity");
CREATE INDEX "dependency_alerts_parent_notified_idx" ON "dependency_alerts"("parent_notified");

-- Foreign keys to User table
ALTER TABLE "usage_patterns" ADD CONSTRAINT "usage_patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dependency_alerts" ADD CONSTRAINT "dependency_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
