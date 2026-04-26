-- CreateEnum: InviteStatus (F-20: Invite request system)
DO $$ BEGIN
    CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: InviteRequest (F-20: Beta invite system)
CREATE TABLE IF NOT EXISTS "InviteRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "trialSessionId" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "isDirect" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "generatedUsername" TEXT,
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "firstLoginAt" TIMESTAMP(3),
    "migratedData" BOOLEAN NOT NULL DEFAULT false,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InviteRequest_email_key" ON "InviteRequest"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "InviteRequest_generatedUsername_key" ON "InviteRequest"("generatedUsername");
CREATE UNIQUE INDEX IF NOT EXISTS "InviteRequest_inviteToken_key" ON "InviteRequest"("inviteToken");
CREATE UNIQUE INDEX IF NOT EXISTS "InviteRequest_createdUserId_key" ON "InviteRequest"("createdUserId");

CREATE INDEX IF NOT EXISTS "InviteRequest_status_idx" ON "InviteRequest"("status");
CREATE INDEX IF NOT EXISTS "InviteRequest_isDirect_idx" ON "InviteRequest"("isDirect");
CREATE INDEX IF NOT EXISTS "InviteRequest_email_idx" ON "InviteRequest"("email");
CREATE INDEX IF NOT EXISTS "InviteRequest_trialSessionId_idx" ON "InviteRequest"("trialSessionId");
