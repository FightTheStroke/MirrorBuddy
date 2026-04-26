ALTER TABLE "Settings" ADD COLUMN "adaptiveDifficultyMode" TEXT NOT NULL DEFAULT 'balanced';
ALTER TABLE "Progress" ADD COLUMN "adaptiveProfile" TEXT NOT NULL DEFAULT '{}';
