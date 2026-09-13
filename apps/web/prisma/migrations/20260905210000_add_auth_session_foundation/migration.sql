BEGIN;

-- Generated from committed 6e291abd schema to the amended schema, not datasource drift.
-- AlterTable
ALTER TABLE "GlobalConfig" ADD COLUMN     "sessionActivatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "legacyRevoked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AuthSession" (
    "handleHash" VARCHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "authVersion" INTEGER NOT NULL,
    "legacyOrigin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("handleHash")
);

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma cannot express these durable checks and update guards in its schema.
ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_handle_hash_check" CHECK ("handleHash" ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "AuthSession_auth_version_check" CHECK ("authVersion" >= 0),
ADD CONSTRAINT "AuthSession_lifetime_check" CHECK ("expiresAt" > "issuedAt");

ALTER TABLE "User"
ADD CONSTRAINT "User_auth_version_check" CHECK ("authVersion" >= 0);

ALTER TABLE "GlobalConfig"
ADD CONSTRAINT "GlobalConfig_session_activation_singleton"
CHECK ("sessionActivatedAt" IS NULL OR "id" = 'global');

CREATE FUNCTION mb_auth_session_expiry_guard() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt" THEN
        RAISE EXCEPTION 'AuthSession_expiry_immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER auth_session_expiry_guard
BEFORE UPDATE ON "AuthSession"
FOR EACH ROW EXECUTE FUNCTION mb_auth_session_expiry_guard();

CREATE FUNCTION mb_user_auth_state_guard() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."authVersion" < OLD."authVersion" THEN
        RAISE EXCEPTION 'User_auth_version_monotonic' USING ERRCODE = '23514';
    END IF;
    IF OLD."legacyRevoked" AND NOT NEW."legacyRevoked" THEN
        RAISE EXCEPTION 'User_legacy_revoked_one_way' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER user_auth_state_guard
BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION mb_user_auth_state_guard();

-- Preserve the activation instant across updates, renames and record deletion.
-- No activation is inserted here; absence or NULL remains NOT_ACTIVATED.
CREATE FUNCTION mb_session_activation_guard() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD."sessionActivatedAt" IS NOT NULL THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'GlobalConfig_session_activation_immutable' USING ERRCODE = '23514';
        END IF;
        IF NEW."sessionActivatedAt" IS DISTINCT FROM OLD."sessionActivatedAt"
           OR NEW."id" IS DISTINCT FROM OLD."id" THEN
            RAISE EXCEPTION 'GlobalConfig_session_activation_immutable' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER session_activation_guard
BEFORE UPDATE OR DELETE ON "GlobalConfig"
FOR EACH ROW EXECUTE FUNCTION mb_session_activation_guard();

COMMIT;
