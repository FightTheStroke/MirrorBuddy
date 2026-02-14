# ADR 0140 - Compliance Audit Remediation

**Status**: Accepted
**Date**: 2026-02-09
**Deciders**: roberdan@fightthestroke.org
**Technical Story**: Plan 138

## Context

A 7-agent compliance audit identified 22 issues across MirrorBuddy's compliance documentation and code. Key gaps: undisclosed AI vendor (Anthropic Claude), missing audit trail persistence, incomplete cookie documentation, placeholder i18n keys, and misleading claims in compliance docs.

### Audit Findings Summary

**Critical Issues (W1 - Thor Wave)**:

1. Anthropic Claude not disclosed in public-facing compliance documents
2. Azure Realtime Voice API missing from AI Policy transparency
3. Safety audit trail console.log-only (no persistence)
4. Cookie documentation incomplete (9 cookies, only 3 fully documented)
5. Tier system (Trial/Base/Pro) undisclosed in compliance materials
6. No AI disclosure badge in user-facing chat interface

**Content Issues (W2 - Freya Wave)**: 7. ~274 placeholder i18n keys in compliance.json across 5 locales 8. Hardcoded Italian text in privacy components (CookieConsent, OnboardingStore) 9. Admin safety controls incomplete (no disable character/stop session/block user)

**Documentation Issues (W3 - Odin Wave)**:
10-22. False claims in AI-RISK-CLASSIFICATION, COMPLIANCE-MATRIX, MODEL-CARD, AI-POLICY (bias detection "automated" vs actual manual auditing) 23. Missing POST-MARKET-MONITORING-PLAN (EU AI Act Art. 72 requirement)
24-46. 23 missing country-specific compliance docs (IT/FR/DE/ES/UK × accessibility/data-protection/regulatory-contacts + 3 cookie docs)

## Decision

Implement a 3-wave remediation plan addressing all 22 audit findings:

### Wave 1 (Thor) — Critical Disclosure & Infrastructure

**AI Vendor Transparency**:

- Add Anthropic Claude Opus 4 / Sonnet 4 to compliance.json (all 5 locales)
- Add Azure Realtime Voice API disclosure
- Document tier-specific AI access (Trial: 3 maestri, Base: 25, Pro: 26)
- Add "Powered by Anthropic Claude" badge to chat interface

**Audit Trail Persistence**:

- Migrate `audit-trail-service.ts` from console.log to PostgreSQL
- Add Prisma schema: `ComplianceAuditEntry` model
- Implement buffer flush with retry on DB failure
- Split barrel exports per ADR 0045 (client types + server implementation)

**Cookie Documentation**:

- Document all 9 cookies with accurate security attributes (httpOnly, signed, SameSite)
- Fix incorrect claims (mirrorbuddy-user-id IS signed, NOT unsigned as documented)

### Wave 2 (Freya) — Content & UI

**i18n Compliance Keys**:

- Fill 274 placeholder keys in compliance.json (5 locales: it/en/fr/de/es)
- Legal text for: AI vendors list, tier system, cookie details, audit rights, human oversight
- Total 4388 keys per locale (zero placeholders)

**Privacy Component i18n**:

- Remove hardcoded Italian from CookieConsent component
- Remove hardcoded Italian from OnboardingStore
- Wire all text to next-intl via `useTranslations('compliance')`

**Admin Safety Controls**:

- Add "Disable Character" button (blocks specific maestro system-wide)
- Add "Stop Session" button (force-end active conversation)
- Add "Block User" button (suspend account access)
- All actions logged to ComplianceAuditEntry table

### Wave 3 (Odin) — Documentation Alignment

**Honesty Remediation**:

- Update COMPLIANCE-MATRIX to reflect current implementation state
- Update bias detection status: now automated via `src/lib/safety/bias-detector.ts`
- Mark unimplemented features as "Planned" or "Not yet implemented"

**EU AI Act Post-Market Monitoring**:

- Create POST-MARKET-MONITORING-PLAN.md
- Define incident reporting thresholds
- Document quarterly review schedule
- Align with Art. 72 monitoring obligations

**Country-Specific Compliance**:

- Create 23 country docs under `docs/compliance/countries/`:
  - IT: accessibility-compliance.md, data-protection-compliance.md, regulatory-contacts.md
  - FR: accessibility-compliance.md, data-protection-compliance.md, regulatory-contacts.md, cookie-compliance.md
  - DE: accessibility-compliance.md, data-protection-compliance.md, regulatory-contacts.md
  - ES: accessibility-compliance.md, data-protection-compliance.md, regulatory-contacts.md, cookie-compliance.md
  - UK: accessibility-compliance.md, data-protection-compliance.md, regulatory-contacts.md, cookie-compliance.md
- Add bilingual headers (native language + English) for non-UK docs
- Single source of truth: LEGAL-REVIEW-CHECKLIST-BY-COUNTRY.md

## Key Technical Changes

### 1. Audit Trail Service Architecture

**Before (console.log only)**:

```typescript
auditTrailService.log({
  timestamp: new Date(),
  action: 'CONTENT_FILTERED',
  // ... logged to console only
});
```

**After (PostgreSQL persistence)**:

```typescript
// src/lib/safety/audit/audit-trail-service.ts (393 lines)
const buffer: AuditEntry[] = [];
async function flush() {
  await prisma.complianceAuditEntry.createMany({
    data: buffer.map(entry => ({...})),
    skipDuplicates: true
  });
}
// Flush on buffer size (50) or interval (5min)
```

**Schema Addition** (`prisma/schema/models/compliance.prisma`):

```prisma
model ComplianceAuditEntry {
  id          String   @id @default(cuid())
  timestamp   DateTime @default(now())
  action      String   // CONTENT_FILTERED, BIAS_DETECTED, etc.
  severity    String   // INFO, WARN, ERROR
  source      String   // safety-filter, bias-detector, etc.
  details     Json?
  userId      String?
  sessionId   String?
  createdAt   DateTime @default(now())
  @@index([timestamp])
  @@index([action])
  @@index([userId])
}
```

### 2. Client/Server Barrel Split (ADR 0045 Compliance)

**Problem**: audit-trail-service.ts imported by both client and server, but Prisma imports cause client bundle errors.

**Solution**:

- `src/lib/safety/audit/index.ts` — Types only (AuditEntry, AuditSeverity interfaces)
- `src/lib/safety/audit/server.ts` — Prisma implementation (auditTrailService singleton)
- Client components: import types from `/audit`
- Server routes: import implementation from `/audit/server`

### 3. AI Disclosure Badge Component

**Location**: `src/components/chat/message-bubble.tsx`

```typescript
import { AIDisclosureBadge } from "@/components/ui/ai-disclosure-badge";

<MessageBubble>
  {message.role === "assistant" && <AIDisclosureBadge model={message.model} />}
  {message.content}
</MessageBubble>
```

**Badge Design**:

- Tooltip on hover: "Powered by Anthropic Claude Opus 4 / Azure OpenAI GPT-5"
- Links to /ai-transparency page
- Respects `prefers-reduced-motion` for tooltip animation

### 4. Cookie Documentation Update

**File**: `docs/compliance/COOKIES.md`

| Cookie                     | httpOnly | Signed | SameSite | Purpose         |
| -------------------------- | -------- | ------ | -------- | --------------- |
| mirrorbuddy-user-id        | YES      | YES    | Lax      | Server auth     |
| mirrorbuddy-user-id-client | NO       | NO     | Lax      | Client display  |
| mirrorbuddy-visitor-id     | YES      | NO     | Lax      | Trial tracking  |
| csrf-token                 | YES      | NO     | Strict   | CSRF protection |
| mirrorbuddy-consent        | NO       | NO     | Lax      | Client consent  |
| mirrorbuddy-a11y           | NO       | NO     | Lax      | Accessibility   |
| mirrorbuddy-trial-consent  | NO       | NO     | Lax      | Trial ToS       |
| NEXT_LOCALE                | NO       | NO     | Lax      | Language choice |
| mirrorbuddy-session        | YES      | YES    | Lax      | Session token   |

**Correction**: mirrorbuddy-user-id IS signed (was incorrectly documented as unsigned).

## Consequences

### Positive

- **Transparent AI vendor disclosure**: EU AI Act Art. 13 compliance achieved
- **Audit trail is durable and queryable**: PostgreSQL-backed compliance logging
- **Documentation honestly reflects current state**: No false claims about unimplemented features
- **Country-specific compliance docs**: Ready for IT/FR/DE/ES/UK market entry
- **User-facing AI disclosure**: Chat interface shows AI provider badge
- **Admin safety controls**: Stop session, block user, disable character capabilities

### Negative

- **audit-trail-service.ts size**: 393 lines (tech debt: split buffer management from service layer)
- **Country docs in English**: Professional translation needed before regulatory authority submission
- **i18n key explosion**: 4388 keys per locale (was 4114) — namespace collision risk mitigated by wrapper convention (ADR 0104)
- **Maintenance burden**: 23 country docs require updates when features change

### Neutral

- **ADR 0136 established as guiding principle**: "Compliance Absolute Charter" — honesty over optimism in legal docs
- **Single source of truth**: LEGAL-REVIEW-CHECKLIST-BY-COUNTRY.md for multi-country compliance status
- **Bilingual headers**: Non-UK docs have native language + English headers (e.g., "Conformità Accessibilità / Accessibility Compliance")

## Implementation Notes

### Wave Execution Order (Critical)

1. **W1 (Thor) MUST complete before W2/W3**: Audit trail persistence is infrastructure for later admin controls
2. **W2 (Freya) can run parallel to W3**: i18n and documentation are independent
3. **Thor validation between waves**: Each wave gets F-xx verification before proceeding

### Tech Debt Created

**TD-01**: audit-trail-service.ts needs split:

- `audit-trail-buffer.ts` — Buffer management, flush logic
- `audit-trail-service.ts` — Public API, event logging
- `audit-trail-query.ts` — Admin dashboard queries

**TD-02**: Country-specific docs need professional translation:

- Current: English text with bilingual headers
- Required for launch: Full native language text approved by local legal counsel

**TD-03**: AI disclosure badge performance:

- Currently renders on every assistant message
- Optimization: Render once per conversation, sticky position

## Verification Checklist

- [ ] All 9 cookies documented with correct security attributes
- [ ] Anthropic Claude listed in compliance.json (5 locales)
- [ ] Azure Realtime Voice API disclosed in AI Policy
- [ ] Audit trail persists to PostgreSQL (verified via admin dashboard)
- [ ] Zero placeholder keys in compliance.json
- [ ] No hardcoded Italian in CookieConsent/OnboardingStore
- [ ] Admin safety controls functional (disable/stop/block)
- [ ] POST-MARKET-MONITORING-PLAN.md exists
- [ ] 23 country docs created with bilingual headers
- [ ] AI disclosure badge renders in chat interface
- [ ] False claims removed from compliance docs
- [ ] LEGAL-REVIEW-CHECKLIST-BY-COUNTRY.md updated

## Related ADRs

- **ADR 0062** - AI Compliance Framework (foundation for this remediation)
- **ADR 0075** - Cookie Handling Standards (cookie security baseline)
- **ADR 0100** - Multi-Country Compliance Architecture (country-specific docs structure)
- **ADR 0136** - Compliance Absolute Charter (honesty-first compliance philosophy)
- **ADR 0045** - Domain Boundaries (client/server barrel split pattern)
- **ADR 0104** - i18n Namespace Wrapper Convention (prevents key collisions in large namespaces)

## References

- EU AI Act (2024/1689) - Article 13 (Transparency), Article 72 (Post-Market Monitoring)
- Italian Law L.132/2025 - EdTech AI transparency requirements
- GDPR Article 5 (Principles of data processing)
- ISO/IEC 42001 - AI Management System (audit trail requirements)
- Plan 138 Compliance Audit Report (7-agent audit findings)
