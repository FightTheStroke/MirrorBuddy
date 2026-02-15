-- CreateTable
CREATE TABLE "maintenance_windows" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 60,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(10) NOT NULL DEFAULT 'medium',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_windows_isActive_idx" ON "maintenance_windows"("isActive");

-- CreateIndex
CREATE INDEX "maintenance_windows_startTime_idx" ON "maintenance_windows"("startTime");

-- CreateIndex
CREATE INDEX "maintenance_windows_endTime_idx" ON "maintenance_windows"("endTime");

-- CreateIndex
CREATE INDEX "maintenance_windows_cancelled_idx" ON "maintenance_windows"("cancelled");
