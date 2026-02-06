-- AlterTable: Add emailHash to User table
ALTER TABLE "User" ADD COLUMN "emailHash" TEXT;

-- CreateIndex: Index emailHash on User table
CREATE INDEX "User_emailHash_idx" ON "User"("emailHash");

-- AlterTable: Add emailHash to GoogleAccount table
ALTER TABLE "GoogleAccount" ADD COLUMN "emailHash" TEXT;

-- CreateIndex: Index emailHash on GoogleAccount table
CREATE INDEX "GoogleAccount_emailHash_idx" ON "GoogleAccount"("emailHash");
