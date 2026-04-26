-- CreateTable: SessionMetrics (V1Plan FASE 2/6: session tracking and cost)
CREATE TABLE IF NOT EXISTS "session_metrics" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'unknown',
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "avgTurnLatencyMs" INTEGER,
    "stuckLoopCount" INTEGER NOT NULL DEFAULT 0,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refusalCount" INTEGER NOT NULL DEFAULT 0,
    "refusalCorrect" INTEGER NOT NULL DEFAULT 0,
    "incidentSeverity" TEXT,
    "jailbreakAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "session_metrics_sessionId_key" ON "session_metrics"("sessionId");
CREATE INDEX IF NOT EXISTS "session_metrics_userId_idx" ON "session_metrics"("userId");

-- AddForeignKey (conditional for idempotency)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'session_metrics_userId_fkey'
        ) THEN
            ALTER TABLE "session_metrics"
            ADD CONSTRAINT "session_metrics_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
