-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('MAESTRO', 'COACH', 'BUDDY');

-- CreateTable: CharacterConfig
CREATE TABLE "CharacterConfig" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" "CharacterType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayNameOverride" TEXT,
    "descriptionOverride" TEXT,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ToolOutput
CREATE TABLE "ToolOutput" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "toolType" TEXT NOT NULL,
    "toolId" TEXT,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HierarchicalSummary
CREATE TABLE "HierarchicalSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "keyThemes" JSONB NOT NULL,
    "consolidatedLearnings" JSONB NOT NULL,
    "frequentTopics" JSONB NOT NULL,
    "sourceConversationIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HierarchicalSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PasswordResetToken
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContactRequest
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "data" JSONB NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdminAuditLog
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog (@@map: audit_logs)
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "actorId" VARCHAR(255) NOT NULL,
    "targetId" VARCHAR(255),
    "targetType" VARCHAR(100),
    "metadata" TEXT,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SchoolSSOConfig (@@map: school_sso_configs)
CREATE TABLE "school_sso_configs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "tenantId" VARCHAR(255),
    "domain" VARCHAR(255) NOT NULL,
    "clientId" VARCHAR(255) NOT NULL,
    "clientSecret" VARCHAR(512) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_sso_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SSOSession (@@map: sso_sessions)
CREATE TABLE "sso_sessions" (
    "id" TEXT NOT NULL,
    "state" VARCHAR(255) NOT NULL,
    "codeVerifier" VARCHAR(255) NOT NULL,
    "nonce" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "redirectUri" VARCHAR(2048) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: CharacterConfig
CREATE UNIQUE INDEX "CharacterConfig_characterId_key" ON "CharacterConfig"("characterId");
CREATE INDEX "CharacterConfig_type_idx" ON "CharacterConfig"("type");
CREATE INDEX "CharacterConfig_isEnabled_idx" ON "CharacterConfig"("isEnabled");
CREATE INDEX "CharacterConfig_characterId_idx" ON "CharacterConfig"("characterId");

-- CreateIndex: ToolOutput
CREATE INDEX "ToolOutput_conversationId_idx" ON "ToolOutput"("conversationId");
CREATE INDEX "ToolOutput_toolType_idx" ON "ToolOutput"("toolType");
CREATE INDEX "ToolOutput_createdAt_idx" ON "ToolOutput"("createdAt");

-- CreateIndex: HierarchicalSummary
CREATE INDEX "HierarchicalSummary_userId_type_idx" ON "HierarchicalSummary"("userId", "type");
CREATE INDEX "HierarchicalSummary_userId_startDate_endDate_idx" ON "HierarchicalSummary"("userId", "startDate", "endDate");

-- CreateIndex: PasswordResetToken
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex: ContactRequest
CREATE INDEX "ContactRequest_type_idx" ON "ContactRequest"("type");
CREATE INDEX "ContactRequest_status_idx" ON "ContactRequest"("status");
CREATE INDEX "ContactRequest_type_status_idx" ON "ContactRequest"("type", "status");
CREATE INDEX "ContactRequest_email_idx" ON "ContactRequest"("email");

-- CreateIndex: AdminAuditLog
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX "AdminAuditLog_entityType_idx" ON "AdminAuditLog"("entityType");
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- CreateIndex: AuditLog (audit_logs)
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX "audit_logs_targetId_idx" ON "audit_logs"("targetId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex: SchoolSSOConfig (school_sso_configs)
CREATE UNIQUE INDEX "school_sso_configs_schoolId_provider_key" ON "school_sso_configs"("schoolId", "provider");
CREATE INDEX "school_sso_configs_domain_idx" ON "school_sso_configs"("domain");

-- CreateIndex: SSOSession (sso_sessions)
CREATE UNIQUE INDEX "sso_sessions_state_key" ON "sso_sessions"("state");
CREATE INDEX "sso_sessions_state_idx" ON "sso_sessions"("state");
CREATE INDEX "sso_sessions_expiresAt_idx" ON "sso_sessions"("expiresAt");

-- AddForeignKey: ToolOutput -> Conversation
ALTER TABLE "ToolOutput" ADD CONSTRAINT "ToolOutput_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PasswordResetToken -> User
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
