-- CreateTable: FeatureFlag - Persistent feature flag state
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enabled',
    "enabledPercentage" INTEGER NOT NULL DEFAULT 100,
    "killSwitch" BOOLEAN NOT NULL DEFAULT false,
    "killSwitchReason" TEXT,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GlobalConfig - Global kill switch state
CREATE TABLE "GlobalConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "killSwitch" BOOLEAN NOT NULL DEFAULT false,
    "killSwitchReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: secret_vault - Encrypted API key storage
CREATE TABLE "secret_vault" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "keyName" TEXT NOT NULL,
    "encrypted" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secret_vault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureFlag_status_idx" ON "FeatureFlag"("status");

-- CreateIndex
CREATE INDEX "FeatureFlag_killSwitch_idx" ON "FeatureFlag"("killSwitch");

-- CreateIndex
CREATE UNIQUE INDEX "secret_vault_service_keyName_key" ON "secret_vault"("service", "keyName");
