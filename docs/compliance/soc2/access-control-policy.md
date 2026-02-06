# Access Control Policy

> SOC 2 Trust Service Criteria: CC6.1, CC6.2, CC6.3
> Last Updated: 2026-02-06
> Owner: Engineering Lead

## 1. User Provisioning

### Individual Users

- Registration via email + password (bcrypt hashed, min 8 chars)
- Email verification required before account activation
- SSO provisioning via Google Workspace or Microsoft 365 OIDC

### School Bulk Provisioning

- CSV upload via `/api/admin/sso/sync-directory`
- Directory sync from Google Classroom or Azure AD
- Admin must belong to verified school domain

## 2. Deprovisioning

- Account deletion via `/api/user/delete` (GDPR Article 17)
- Data export before deletion via `/api/user/export`
- 30-day soft delete with hard delete after grace period
- SSO sessions invalidated immediately on deprovisioning

## 3. Role-Based Access Control (RBAC)

| Role  | Permissions                                    |
| ----- | ---------------------------------------------- |
| USER  | Own sessions, profile, data export             |
| ADMIN | User management, school config, SSO, analytics |

- Roles assigned at registration or via SSO claim mapping
- Role elevation requires admin action (no self-escalation)
- Implementation: `src/lib/auth/middleware.ts` + Prisma `user.role`

## 4. MFA Enforcement

- Not currently enforced (roadmap item)
- SSO providers (Google, Microsoft) may enforce MFA at IdP level
- Session tokens use secure, httpOnly cookies

## 5. Session Management

- Session timeout: 30 minutes idle, 24 hours absolute
- CSRF protection: double-submit cookie pattern (`src/lib/security/csrf.ts`)
- Session cookies: httpOnly, secure (production), sameSite=lax

## 6. API Key Management

- No user-facing API keys (all access via session cookies)
- Internal service keys stored in environment variables
- Rotation: manual via Vercel dashboard, documented in runbook

## 7. Audit Trail

- All admin actions logged via `src/lib/audit/admin-audit.ts`
- Authentication events logged with provider and outcome
- Retention: 365 days minimum
