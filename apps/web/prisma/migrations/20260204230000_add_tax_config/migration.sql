-- CreateTable
CREATE TABLE "TaxConfig" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reverseChargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeTaxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxConfig_countryCode_key" ON "TaxConfig"("countryCode");

-- CreateIndex
CREATE INDEX "TaxConfig_isActive_idx" ON "TaxConfig"("isActive");
