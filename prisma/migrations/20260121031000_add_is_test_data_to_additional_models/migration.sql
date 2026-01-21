-- F-06: Add isTestData column to additional tables for comprehensive test data isolation

-- Add isTestData to TelemetryEvent table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'TelemetryEvent' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "TelemetryEvent" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isTestData to StudySession table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'StudySession' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "StudySession" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isTestData to FlashcardProgress table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'FlashcardProgress' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "FlashcardProgress" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isTestData to QuizResult table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'QuizResult' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "QuizResult" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isTestData to Material table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Material' AND column_name = 'isTestData'
    ) THEN
        ALTER TABLE "Material" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
