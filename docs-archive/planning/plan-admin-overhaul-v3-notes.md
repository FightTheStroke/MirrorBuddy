# Plan 140: Admin Dashboard Overhaul v3 — Running Notes

## W1: Security

- Decision: Migrate [locale]/admin pages to /admin/ with standard auth pattern
- Issue: Server Actions had no CSRF → Added validateCSRFToken() inside each action
- Issue: Audit logs showed "system" → Now uses actual admin userId from validateAdminAuth()
- Pattern: All admin server pages must call validateAdminAuth() as first operation
- Pattern: All Server Action mutations must validate CSRF + log to auditService

## W2: Data Integrity

- Decision: Zero mock data policy — return null, never fake metrics (ADR 0121)
- Decision: configured:false services excluded from overall health calculation
- Issue: Resend 401 showed raw error → Now specific "API key invalid" message
- Issue: Key Vault generic "Database Connection Error" → 4 specific error types
- Pattern: All admin service functions must handle unconfigured state explicitly
- Pattern: Env var audit checks presence (boolean), never exposes values

## W3: Navigation

- Decision: 4 sidebar groups (Overview, Management, Communications, Operations)
- Decision: Mission Control dissolved, items distributed to Operations
- Issue: Locales page showed "Not Found" → Fixed API to return configured locales
- Pattern: Max 4 top-level sidebar groups for clarity

## W4: Polish

- Decision: i18n keys added to all new pages created in plan
- Issue: csrfFetch used for GET requests → Replaced with regular fetch
- Pattern: csrfFetch only for POST/PUT/PATCH/DELETE mutations
