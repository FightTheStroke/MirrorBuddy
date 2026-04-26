-- CreateTable: ComplianceAuditEntry (F-08: Compliance audit logs)
CREATE TABLE IF NOT EXISTS "compliance_audit_entries" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT,
    "adminId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_audit_entries_eventType_idx" ON "compliance_audit_entries"("eventType");
CREATE INDEX IF NOT EXISTS "compliance_audit_entries_severity_idx" ON "compliance_audit_entries"("severity");
CREATE INDEX IF NOT EXISTS "compliance_audit_entries_userId_idx" ON "compliance_audit_entries"("userId");
CREATE INDEX IF NOT EXISTS "compliance_audit_entries_adminId_idx" ON "compliance_audit_entries"("adminId");
CREATE INDEX IF NOT EXISTS "compliance_audit_entries_createdAt_idx" ON "compliance_audit_entries"("createdAt");

-- AddForeignKey (will fail if User table doesn't exist or column doesn't exist - this is OK in production since they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'compliance_audit_entries_userId_fkey'
        ) THEN
            ALTER TABLE "compliance_audit_entries"
            ADD CONSTRAINT "compliance_audit_entries_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'compliance_audit_entries_adminId_fkey'
        ) THEN
            ALTER TABLE "compliance_audit_entries"
            ADD CONSTRAINT "compliance_audit_entries_adminId_fkey"
            FOREIGN KEY ("adminId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
