-- AlterTable: GlobalConfig - Add paymentsEnabled column for Stripe integration
ALTER TABLE "GlobalConfig" ADD COLUMN "paymentsEnabled" BOOLEAN NOT NULL DEFAULT false;
