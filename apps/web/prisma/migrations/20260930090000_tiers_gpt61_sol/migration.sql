-- ADR 0182: every tier and every feature runs on gpt-6.1-sol (EU data zone).
-- Seeds never rerun in production, so existing tier rows are moved here.
-- demoModel (landing demo) and realtimeModel (unused; voice is flag-driven) stay as they are.
UPDATE "TierDefinition"
   SET "chatModel"       = 'gpt-6.1-sol',
       "pdfModel"        = 'gpt-6.1-sol',
       "mindmapModel"    = 'gpt-6.1-sol',
       "quizModel"       = 'gpt-6.1-sol',
       "flashcardsModel" = 'gpt-6.1-sol',
       "summaryModel"    = 'gpt-6.1-sol',
       "formulaModel"    = 'gpt-6.1-sol',
       "chartModel"      = 'gpt-6.1-sol',
       "homeworkModel"   = 'gpt-6.1-sol',
       "webcamModel"     = 'gpt-6.1-sol',
       "updatedAt"       = NOW()
 WHERE "code" IN ('trial', 'base', 'pro');
