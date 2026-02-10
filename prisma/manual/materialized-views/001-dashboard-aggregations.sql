-- ============================================================================
-- Materialized Views for Dashboard Aggregations
-- Reduces query load on admin analytics endpoints
--
-- Refresh schedule: daily via /api/cron/data-retention (add call)
-- or manually: SELECT refresh_dashboard_views();
-- ============================================================================

-- Daily message counts by locale (for admin/analytics/locales)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_messages_by_locale AS
SELECT
  DATE_TRUNC('day', m."createdAt") AS day,
  s."language" AS locale,
  COUNT(m.id) AS message_count,
  COUNT(DISTINCT c."userId") AS unique_users
FROM "Message" m
JOIN "Conversation" c ON c.id = m."conversationId"
JOIN "Settings" s ON s."userId" = c."userId"
WHERE m."isTestData" = false
GROUP BY DATE_TRUNC('day', m."createdAt"), s."language"
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_messages_by_locale
  ON mv_daily_messages_by_locale (day, locale);

-- Daily tool usage by type and locale
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_tool_usage AS
SELECT
  DATE_TRUNC('day', t."createdAt") AS day,
  s."language" AS locale,
  t."toolType" AS tool_type,
  COUNT(t.id) AS usage_count
FROM "ToolOutput" t
JOIN "Conversation" c ON c.id = t."conversationId"
JOIN "Settings" s ON s."userId" = c."userId"
GROUP BY DATE_TRUNC('day', t."createdAt"), s."language", t."toolType"
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_tool_usage
  ON mv_daily_tool_usage (day, locale, tool_type);

-- User counts by locale (for admin dashboard summary)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_counts_by_locale AS
SELECT
  s."language" AS locale,
  COUNT(DISTINCT s."userId") AS user_count
FROM "Settings" s
JOIN "User" u ON u.id = s."userId"
WHERE u."isTestData" = false
GROUP BY s."language"
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_counts_by_locale
  ON mv_user_counts_by_locale (locale);

-- Convenience function to refresh all dashboard views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_messages_by_locale;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_tool_usage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_counts_by_locale;
END;
$$ LANGUAGE plpgsql;
