-- Parental gate PIN (Issue #432)
-- Stores a bcrypt hash of the parent PIN used to gate the adult ("Per i grandi")
-- area. Nullable: existing rows keep no PIN and fall back to the math challenge.
ALTER TABLE "Settings" ADD COLUMN "parentalPinHash" TEXT;
