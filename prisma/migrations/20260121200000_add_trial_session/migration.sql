-- CreateTable TrialSession for trial mode (ADR 0056)
CREATE TABLE IF NOT EXISTS "TrialSession" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "chatsUsed" INTEGER NOT NULL DEFAULT 0,
    "docsUsed" INTEGER NOT NULL DEFAULT 0,
    "voiceSecondsUsed" INTEGER NOT NULL DEFAULT 0,
    "toolsUsed" INTEGER NOT NULL DEFAULT 0,
    "assignedMaestri" TEXT NOT NULL DEFAULT '[]',
    "assignedCoach" TEXT,
    "abuseScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrialSession_ipHash_visitorId_key" ON "TrialSession"("ipHash", "visitorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrialSession_ipHash_idx" ON "TrialSession"("ipHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrialSession_visitorId_idx" ON "TrialSession"("visitorId");
