-- F-17: Add isTestData column to tables for test data isolation from production statistics
-- This column marks records created during E2E tests and development

-- Add isTestData to User table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isTestData to Conversation table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Conversation' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "Conversation" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isTestData to Message table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Message' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "Message" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isTestData to session_metrics table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'session_metrics' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "session_metrics" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
