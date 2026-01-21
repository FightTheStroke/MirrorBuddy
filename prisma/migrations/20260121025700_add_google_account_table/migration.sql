-- CreateTable: GoogleAccount (OAuth integration for Google Sign-In)
CREATE TABLE IF NOT EXISTS "GoogleAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoogleAccount_userId_key" ON "GoogleAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "GoogleAccount_googleId_key" ON "GoogleAccount"("googleId");
CREATE INDEX IF NOT EXISTS "GoogleAccount_userId_idx" ON "GoogleAccount"("userId");
CREATE INDEX IF NOT EXISTS "GoogleAccount_googleId_idx" ON "GoogleAccount"("googleId");

-- AddForeignKey (conditional for idempotency)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'GoogleAccount_userId_fkey'
        ) THEN
            ALTER TABLE "GoogleAccount"
            ADD CONSTRAINT "GoogleAccount_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
