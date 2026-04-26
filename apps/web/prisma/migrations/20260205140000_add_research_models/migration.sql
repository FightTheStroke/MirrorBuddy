-- CreateTable
CREATE TABLE "SyntheticProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dsaProfile" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "schoolYear" INTEGER NOT NULL,
    "learningStyle" TEXT NOT NULL,
    "challengeAreas" JSONB NOT NULL,
    "responsePatterns" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyntheticProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "maestroId" TEXT NOT NULL,
    "syntheticProfileId" TEXT NOT NULL,
    "turns" INTEGER NOT NULL DEFAULT 10,
    "config" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "scoreScaffolding" DOUBLE PRECISION,
    "scoreHinting" DOUBLE PRECISION,
    "scoreAdaptation" DOUBLE PRECISION,
    "scoreMisconceptionHandling" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchResult" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "studentMessage" TEXT NOT NULL,
    "maestroResponse" TEXT NOT NULL,
    "responseTimeMs" INTEGER,
    "tokensUsed" INTEGER,
    "scaffoldingDetected" BOOLEAN NOT NULL DEFAULT false,
    "adaptationDetected" BOOLEAN NOT NULL DEFAULT false,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyntheticProfile_name_key" ON "SyntheticProfile"("name");

-- CreateIndex
CREATE INDEX "SyntheticProfile_dsaProfile_idx" ON "SyntheticProfile"("dsaProfile");

-- CreateIndex
CREATE INDEX "ResearchExperiment_status_idx" ON "ResearchExperiment"("status");

-- CreateIndex
CREATE INDEX "ResearchExperiment_maestroId_idx" ON "ResearchExperiment"("maestroId");

-- CreateIndex
CREATE INDEX "ResearchExperiment_syntheticProfileId_idx" ON "ResearchExperiment"("syntheticProfileId");

-- CreateIndex
CREATE INDEX "ResearchResult_experimentId_idx" ON "ResearchResult"("experimentId");

-- CreateIndex
CREATE INDEX "ResearchResult_experimentId_turn_idx" ON "ResearchResult"("experimentId", "turn");

-- AddForeignKey
ALTER TABLE "ResearchExperiment" ADD CONSTRAINT "ResearchExperiment_syntheticProfileId_fkey" FOREIGN KEY ("syntheticProfileId") REFERENCES "SyntheticProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchResult" ADD CONSTRAINT "ResearchResult_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ResearchExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
