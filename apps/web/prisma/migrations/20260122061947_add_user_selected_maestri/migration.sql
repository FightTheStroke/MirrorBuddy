-- AlterTable
ALTER TABLE "User" ADD COLUMN "selectedMaestri" TEXT[] DEFAULT ARRAY[]::TEXT[];
