-- Voice usage, per user: Azure bills the Realtime API by token, so cost is
-- attributed from the usage block on each response rather than guessed from
-- wall-clock minutes. No transcript or content is stored here.
CREATE TABLE "voice_usage_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "maestroId" TEXT,
    "model" TEXT NOT NULL,
    "audioInputTokens" INTEGER NOT NULL DEFAULT 0,
    "audioOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "textInputTokens" INTEGER NOT NULL DEFAULT 0,
    "textOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "costEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodDay" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "voice_usage_events_userId_periodDay_idx" ON "voice_usage_events"("userId", "periodDay");
CREATE INDEX "voice_usage_events_userId_periodMonth_idx" ON "voice_usage_events"("userId", "periodMonth");
CREATE INDEX "voice_usage_events_sessionId_idx" ON "voice_usage_events"("sessionId");
CREATE INDEX "voice_usage_events_createdAt_idx" ON "voice_usage_events"("createdAt");

ALTER TABLE "voice_usage_events" ADD CONSTRAINT "voice_usage_events_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
