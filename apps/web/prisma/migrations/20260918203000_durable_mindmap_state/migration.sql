-- Additive only. Material.sessionId remains a StudySession foreign key.
BEGIN;
ALTER TABLE "Material"
  ADD COLUMN "mindmapRevision" INTEGER,
  ADD COLUMN "mindmapSourceSession" TEXT,
  ADD COLUMN "mindmapReceipts" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "TrialSession"
  ADD COLUMN "mindmaps" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "mindmapRevision" INTEGER NOT NULL DEFAULT 0;
COMMIT;
