-- AlterTable: Add onDelete cascade/set-null rules to relations missing them

-- LearningPath.sourceStudyKit → SetNull
ALTER TABLE "LearningPath" DROP CONSTRAINT IF EXISTS "LearningPath_sourceStudyKitId_fkey";
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_sourceStudyKitId_fkey"
  FOREIGN KEY ("sourceStudyKitId") REFERENCES "StudyKit"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Material.session → SetNull
ALTER TABLE "Material" DROP CONSTRAINT IF EXISTS "Material_sessionId_fkey";
ALTER TABLE "Material" ADD CONSTRAINT "Material_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Material.collection → SetNull
ALTER TABLE "Material" DROP CONSTRAINT IF EXISTS "Material_collectionId_fkey";
ALTER TABLE "Material" ADD CONSTRAINT "Material_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Collection.parent (self-ref) → SetNull
ALTER TABLE "Collection" DROP CONSTRAINT IF EXISTS "Collection_parentId_fkey";
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Collection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ResearchExperiment.syntheticProfile → Cascade
ALTER TABLE "ResearchExperiment" DROP CONSTRAINT IF EXISTS "ResearchExperiment_syntheticProfileId_fkey";
ALTER TABLE "ResearchExperiment" ADD CONSTRAINT "ResearchExperiment_syntheticProfileId_fkey"
  FOREIGN KEY ("syntheticProfileId") REFERENCES "SyntheticProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
