-- Add trial email verification fields
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TrialSession' AND column_name = 'emailVerificationCode'
  ) THEN
    ALTER TABLE "TrialSession" ADD COLUMN "emailVerificationCode" TEXT;
    ALTER TABLE "TrialSession" ADD COLUMN "emailVerificationSentAt" TIMESTAMP(3);
    ALTER TABLE "TrialSession" ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3);
    ALTER TABLE "TrialSession" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TrialSession_emailVerificationCode_idx"
  ON "TrialSession"("emailVerificationCode")
  WHERE "emailVerificationCode" IS NOT NULL;
