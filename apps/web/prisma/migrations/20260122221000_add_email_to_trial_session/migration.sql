-- Add email field for nurturing (F-01)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TrialSession' AND column_name = 'email'
  ) THEN
    ALTER TABLE "TrialSession" ADD COLUMN "email" TEXT;
    ALTER TABLE "TrialSession" ADD COLUMN "emailCollectedAt" TIMESTAMP(3);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TrialSession_email_idx" ON "TrialSession"("email") WHERE "email" IS NOT NULL;
