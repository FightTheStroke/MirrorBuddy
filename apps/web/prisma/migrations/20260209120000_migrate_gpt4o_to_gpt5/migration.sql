-- Migration: Retire GPT-4o family, migrate to GPT-5 family
-- Reason: Azure OpenAI retiring gpt-4o-mini (Standard: 2026-03-31, Provisioned: 2026-10-01)
--         and gpt-4o (Standard: 2026-03-31, Provisioned: 2026-10-01)
-- See: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/model-retirements

-- TierDefinition: Update column defaults from gpt-4o-mini to gpt-5-mini/gpt-5-nano
ALTER TABLE "TierDefinition" ALTER COLUMN "chatModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "pdfModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "mindmapModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "quizModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "flashcardsModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "summaryModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "formulaModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "chartModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "homeworkModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "webcamModel" SET DEFAULT 'gpt-5-mini';
ALTER TABLE "TierDefinition" ALTER COLUMN "demoModel" SET DEFAULT 'gpt-5-nano';

-- Settings: Update default model from gpt-4o to gpt-5-mini
ALTER TABLE "Settings" ALTER COLUMN "model" SET DEFAULT 'gpt-5-mini';

-- Data migration: Update existing TierDefinition rows that still use retiring models
-- Trial tier: gpt-4o-mini -> gpt-5-mini (all features), demo -> gpt-5-nano
UPDATE "TierDefinition" SET
  "chatModel" = 'gpt-5-mini',
  "pdfModel" = 'gpt-5-mini',
  "mindmapModel" = 'gpt-5-mini',
  "quizModel" = 'gpt-5-mini',
  "flashcardsModel" = 'gpt-5-mini',
  "summaryModel" = 'gpt-5-mini',
  "formulaModel" = 'gpt-5-mini',
  "chartModel" = 'gpt-5-mini',
  "homeworkModel" = 'gpt-5-mini',
  "webcamModel" = 'gpt-5-mini',
  "demoModel" = 'gpt-5-nano'
WHERE "code" = 'trial';

-- Base and Pro tiers: only demoModel was gpt-4o-mini
UPDATE "TierDefinition" SET "demoModel" = 'gpt-5-nano'
WHERE "code" IN ('base', 'pro') AND "demoModel" = 'gpt-4o-mini';

-- Settings: Migrate existing users from gpt-4o to gpt-5-mini
UPDATE "Settings" SET "model" = 'gpt-5-mini' WHERE "model" = 'gpt-4o';
