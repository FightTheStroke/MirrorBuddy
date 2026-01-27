-- CreateEnum
CREATE TYPE "LocaleAuditAction" AS ENUM ('LOCALE_CREATE', 'LOCALE_UPDATE', 'LOCALE_DELETE');

-- CreateTable
CREATE TABLE "LocaleConfig" (
    "id" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "primaryLocale" TEXT NOT NULL,
    "primaryLanguageMaestroId" TEXT NOT NULL,
    "secondaryLocales" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocaleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocaleAuditLog" (
    "id" TEXT NOT NULL,
    "localeId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "LocaleAuditAction" NOT NULL,
    "changes" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocaleAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocaleConfig_enabled_idx" ON "LocaleConfig"("enabled");

-- CreateIndex
CREATE INDEX "LocaleConfig_primaryLocale_idx" ON "LocaleConfig"("primaryLocale");

-- CreateIndex
CREATE INDEX "LocaleAuditLog_localeId_idx" ON "LocaleAuditLog"("localeId");

-- CreateIndex
CREATE INDEX "LocaleAuditLog_adminId_idx" ON "LocaleAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "LocaleAuditLog_createdAt_idx" ON "LocaleAuditLog"("createdAt");
