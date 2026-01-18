-- F-13: Terms of Service Acceptance Tracking
-- Creates tos_acceptances table to track user ToS version acceptances with audit trail

CREATE TABLE "tos_acceptances" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "tos_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Ensure one record per user per version to prevent duplicate acceptances
CREATE UNIQUE INDEX "tos_acceptances_userId_version_key" ON "tos_acceptances"("userId", "version");

-- Index by userId for quick lookup of all acceptances by user
CREATE INDEX "tos_acceptances_userId_idx" ON "tos_acceptances"("userId");

-- Index by version for analytics and compliance reports
CREATE INDEX "tos_acceptances_version_idx" ON "tos_acceptances"("version");
