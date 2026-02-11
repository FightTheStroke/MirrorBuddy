-- =============================================================================
-- SECURITY: Enable Row Level Security on ALL tables
-- =============================================================================
-- MirrorBuddy accesses PostgreSQL exclusively via Prisma using the service_role
-- key (postgres user), which bypasses RLS. Enabling RLS with deny-all policies
-- blocks direct access from Supabase's anon/authenticated roles, eliminating
-- all Security Advisor warnings.
--
-- This migration:
-- 1. Enables RLS on every application table (88 tables)
-- 2. Revokes all privileges from anon and authenticated roles
-- 3. Sets default privileges to deny future table access
-- 4. The postgres role (service_role) is unaffected — it bypasses RLS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Enable RLS on ALL 88 application tables
-- ---------------------------------------------------------------------------
-- Table names verified against live database query on 2026-02-10

-- User & Auth
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoogleAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeletedUserBackup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPrivacyPreferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoppaConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccessibilitySettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileAccessLog" ENABLE ROW LEVEL SECURITY;

-- Conversations
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HierarchicalSummary" ENABLE ROW LEVEL SECURITY;

-- Characters
ALTER TABLE "CharacterConfig" ENABLE ROW LEVEL SECURITY;

-- Learning & Education
ALTER TABLE "Progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Learning" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FlashcardProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MethodProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningPath" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningPathTopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TopicStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TopicAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HomeworkSession" ENABLE ROW LEVEL SECURITY;

-- Content & RAG
ALTER TABLE "StudyKit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HtmlSnippet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Material" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Concept" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialConcept" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialEdge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentEmbedding" ENABLE ROW LEVEL SECURITY;

-- Tools
ALTER TABLE "CreatedTool" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ToolOutput" ENABLE ROW LEVEL SECURITY;

-- Gamification
ALTER TABLE "UserGamification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyStreak" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PointsTransaction" ENABLE ROW LEVEL SECURITY;

-- Scheduling & Study
ALTER TABLE "PomodoroStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudySession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudySchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduledSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomReminder" ENABLE ROW LEVEL SECURITY;

-- Audit & Compliance
ALTER TABLE "compliance_audit_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TierAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocaleAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SafetyEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitEvent" ENABLE ROW LEVEL SECURITY;

-- Public & Trial
ALTER TABLE "tos_acceptances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FunnelEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrialSession" ENABLE ROW LEVEL SECURITY;

-- Analytics & Telemetry
ALTER TABLE "session_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TelemetryEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentInsightProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_patterns" ENABLE ROW LEVEL SECURITY;

-- Tiers & Subscriptions
ALTER TABLE "TierDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TierConfigSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserFeatureConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxConfig" ENABLE ROW LEVEL SECURITY;

-- Config & Admin
ALTER TABLE "FeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GlobalConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModelCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "secret_vault" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocaleConfig" ENABLE ROW LEVEL SECURITY;

-- Notifications & Parents
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentNote" ENABLE ROW LEVEL SECURITY;

-- Infrastructure
ALTER TABLE "dependency_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyntheticProfile" ENABLE ROW LEVEL SECURITY;

-- Research
ALTER TABLE "ResearchExperiment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResearchResult" ENABLE ROW LEVEL SECURITY;

-- Video
ALTER TABLE "VideoVisionUsage" ENABLE ROW LEVEL SECURITY;

-- SSO
ALTER TABLE "school_sso_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sso_sessions" ENABLE ROW LEVEL SECURITY;

-- Communications
ALTER TABLE "email_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_recipients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_preferences" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Step 2: Revoke privileges from anon and authenticated roles
-- ---------------------------------------------------------------------------
-- With RLS enabled and NO policies, these roles have zero access.
-- We also explicitly revoke schema-level privileges as defense-in-depth.
-- ---------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Prevent future tables from inheriting default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;

-- Revoke sequence access (prevents serial/identity column abuse)
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;

-- Revoke function execution (prevents RPC abuse via PostgREST)
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;
