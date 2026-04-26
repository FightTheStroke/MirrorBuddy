-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'it',
    "source" TEXT NOT NULL DEFAULT 'coming-soon',
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentAt" TIMESTAMP(3) NOT NULL,
    "gdprConsentVersion" TEXT NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "verificationToken" TEXT NOT NULL,
    "verificationExpiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "promoCode" TEXT,
    "promoRedeemedAt" TIMESTAMP(3),
    "convertedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_verificationToken_key" ON "waitlist_entries"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_unsubscribeToken_key" ON "waitlist_entries"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_promoCode_key" ON "waitlist_entries"("promoCode");

-- CreateIndex
CREATE INDEX "waitlist_entries_email_idx" ON "waitlist_entries"("email");

-- CreateIndex
CREATE INDEX "waitlist_entries_verificationToken_idx" ON "waitlist_entries"("verificationToken");

-- CreateIndex
CREATE INDEX "waitlist_entries_unsubscribeToken_idx" ON "waitlist_entries"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "waitlist_entries_promoCode_idx" ON "waitlist_entries"("promoCode");

-- CreateIndex
CREATE INDEX "waitlist_entries_verifiedAt_idx" ON "waitlist_entries"("verifiedAt");

-- CreateIndex
CREATE INDEX "waitlist_entries_createdAt_idx" ON "waitlist_entries"("createdAt");
