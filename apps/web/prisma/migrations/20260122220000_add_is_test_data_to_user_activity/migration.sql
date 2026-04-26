-- F-06: Add isTestData flag to UserActivity for test data isolation (ADR 0065)
-- Safe idempotent migration

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'UserActivity' AND column_name = 'isTestData'
  ) THEN
    ALTER TABLE "UserActivity" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS "UserActivity_isTestData_timestamp_idx" ON "UserActivity"("isTestData", "timestamp");
