-- CreateTable: RobotDevice binds a Reachy Mini to a MirrorBuddy account
CREATE TABLE "RobotDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "pairCodeHash" TEXT,
    "pairCodeExpiresAt" TIMESTAMP(3),
    "pairedAt" TIMESTAMP(3),
    "tokenHash" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RobotDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RobotDevice_pairCodeHash_key" ON "RobotDevice"("pairCodeHash");
CREATE UNIQUE INDEX "RobotDevice_tokenHash_key" ON "RobotDevice"("tokenHash");
CREATE INDEX "RobotDevice_userId_idx" ON "RobotDevice"("userId");
CREATE INDEX "RobotDevice_revokedAt_idx" ON "RobotDevice"("revokedAt");

-- AddForeignKey
ALTER TABLE "RobotDevice" ADD CONSTRAINT "RobotDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
