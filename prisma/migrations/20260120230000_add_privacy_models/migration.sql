-- CreateEnum: UserRole (F-26: Role-based access control)
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum: InviteStatus (Beta invite system)
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: Add role column to User table (F-26: Role-based access control)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex: Add index for role column
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- CreateTable: UserActivity (for activity tracking)
CREATE TABLE IF NOT EXISTS "UserActivity" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserActivity_timestamp_idx" ON "UserActivity"("timestamp");
CREATE INDEX IF NOT EXISTS "UserActivity_userType_timestamp_idx" ON "UserActivity"("userType", "timestamp");
CREATE INDEX IF NOT EXISTS "UserActivity_identifier_timestamp_idx" ON "UserActivity"("identifier", "timestamp");

-- CreateTable
CREATE TABLE "CoppaConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ageAtConsent" INTEGER NOT NULL,
    "parentEmail" TEXT,
    "verificationCode" TEXT,
    "verificationSentAt" TIMESTAMP(3),
    "verificationExpiresAt" TIMESTAMP(3),
    "consentGranted" BOOLEAN NOT NULL DEFAULT false,
    "consentGrantedAt" TIMESTAMP(3),
    "consentDeniedAt" TIMESTAMP(3),
    "parentIpAddress" TEXT,
    "verificationMethod" TEXT NOT NULL DEFAULT 'email',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoppaConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPrivacyPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pseudonymizedMode" BOOLEAN NOT NULL DEFAULT false,
    "customRetention" TEXT,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPrivacyPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedUserBackup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "role" "UserRole" NOT NULL,
    "backup" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgeAt" TIMESTAMP(3) NOT NULL,
    "deletedBy" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "DeletedUserBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoppaConsent_userId_key" ON "CoppaConsent"("userId");

-- CreateIndex
CREATE INDEX "CoppaConsent_userId_idx" ON "CoppaConsent"("userId");

-- CreateIndex
CREATE INDEX "CoppaConsent_parentEmail_idx" ON "CoppaConsent"("parentEmail");

-- CreateIndex
CREATE INDEX "CoppaConsent_verificationCode_idx" ON "CoppaConsent"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserPrivacyPreferences_userId_key" ON "UserPrivacyPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserPrivacyPreferences_userId_idx" ON "UserPrivacyPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletedUserBackup_userId_key" ON "DeletedUserBackup"("userId");

-- CreateIndex
CREATE INDEX "DeletedUserBackup_deletedAt_idx" ON "DeletedUserBackup"("deletedAt");

-- CreateIndex
CREATE INDEX "DeletedUserBackup_purgeAt_idx" ON "DeletedUserBackup"("purgeAt");

-- AddForeignKey
ALTER TABLE "CoppaConsent" ADD CONSTRAINT "CoppaConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPrivacyPreferences" ADD CONSTRAINT "UserPrivacyPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add markedForDeletion fields to Conversation
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "markedForDeletion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "markedForDeletionAt" TIMESTAMP(3);

-- CreateIndex: Add index for markedForDeletion
CREATE INDEX IF NOT EXISTS "Conversation_markedForDeletion_idx" ON "Conversation"("markedForDeletion");
