# ADR 0008: Parent Dashboard GDPR Consent Model

## Status
Accepted

## Date
2025-12-30

## Context

MirrorBuddy generates insights about students from their AI conversations with Maestri. Parents need visibility into their children's learning progress, but this involves processing personal data of minors.

### Legal Requirements

Under GDPR Article 8 and Italian data protection law:
- Children under 16 in Italy cannot give valid consent alone
- Parents must consent for their children's data processing
- Users have right to access, portability, and erasure
- All data access must be logged for audit

### The Challenge

The initial implementation had:
1. **Mock data only** - Dashboard showed hardcoded examples
2. **No consent tracking** - Data shown without explicit consent
3. **No audit trail** - No record of who accessed what
4. **No deletion flow** - No way to request data removal

### Options Considered

#### Option 1: No Consent Model (Just Show Data)

**Pros:**
- Simple implementation
- Parents expect to see child's progress

**Cons:**
- GDPR violation
- No audit trail
- No student privacy respect

#### Option 2: Parent-Only Consent

**Pros:**
- Simple consent flow
- Parents have legal authority

**Cons:**
- Ignores student's developing autonomy
- Older students (16+) have own rights
- May damage student-parent trust

#### Option 3: Dual Consent Model (Chosen)

**Pros:**
- Respects both parent and student rights
- GDPR compliant
- Builds trust
- Age-appropriate autonomy

**Cons:**
- More complex UI flow
- Potential consent deadlock
- Need to handle disagreement

## Decision

Implement a **dual consent model** with full GDPR compliance:

### Database Schema

```prisma
model StudentInsightProfile {
  id           String    @id @default(cuid())
  userId       String    @unique
  studentName  String

  // Access control
  visibleTo    String    @default("parents") // parents | teachers | both

  // Consent tracking
  parentConsent   Boolean  @default(false)
  studentConsent  Boolean  @default(false)
  consentDate     DateTime?
  deletionRequested DateTime?

  // Profile data
  insights     String    @default("[]")
  strengths    String    @default("[]")
  growthAreas  String    @default("[]")
  learningStyle String   @default("{}")
  strategies   String    @default("[]")

  // Audit
  accessLogs   ProfileAccessLog[]
}

model ProfileAccessLog {
  id         String   @id @default(cuid())
  profileId  String
  profile    StudentInsightProfile @relation(...)

  userId     String   // Who accessed
  action     String   // view | download | share | edit | delete_request
  details    String?
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime @default(now())
}
```

### Consent Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PARENT VISITS DASHBOARD                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │   Check Profile Exists   │
              └──────────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
       No Profile                    Has Profile
              │                             │
              ▼                             ▼
       Show "Generate"              Check Consent
       button                            │
              │                    ┌──────┴──────┐
              ▼                    │             │
       Generate Profile      No Consent     Has Consent
              │                    │             │
              ▼                    ▼             ▼
       Request Consent      Show Consent    Show Dashboard
                           Request Form         Data
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/profile` | GET | Fetch profile (if consent given) |
| `/api/profile/consent` | GET | Check consent status |
| `/api/profile/consent` | POST | Grant consent |
| `/api/profile/generate` | POST | Generate profile from learnings |
| `/api/profile/export` | GET | Export data (JSON/PDF) |

### Access Logging

Every profile access is logged:

```typescript
await prisma.profileAccessLog.create({
  data: {
    profileId: profile.id,
    userId: requestingUserId,
    action: 'view',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  },
});
```

### Right to Erasure

When deletion is requested:

```typescript
// Mark for deletion (30-day grace period)
await prisma.studentInsightProfile.update({
  where: { id: profileId },
  data: { deletionRequested: new Date() },
});

// After 30 days, background job permanently deletes
```

## User Interface States

The parent dashboard handles these states:

| State | UI Display |
|-------|------------|
| `loading` | Loading spinner |
| `no-profile` | "Generate Profile" button |
| `needs-consent` | Consent explanation + checkboxes |
| `ready` | Full dashboard with data |
| `deletion-pending` | "Deletion requested" message |
| `error` | Error message with retry |

## Consequences

### Positive
- GDPR compliant
- Respects student autonomy
- Full audit trail
- Data portability supported
- Right to erasure implemented

### Negative
- Complex consent flow may frustrate parents
- Consent deadlock possible (parent yes, student no)
- Audit logs grow over time

### Mitigations
- Clear UI explaining why consent matters
- Age-based auto-consent for very young children
- Periodic audit log cleanup (keep 2 years)
- Consent reminder if profile generated but no consent

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | StudentInsightProfile, ProfileAccessLog |
| `src/app/api/profile/route.ts` | Profile CRUD |
| `src/app/api/profile/consent/route.ts` | Consent management |
| `src/app/api/profile/export/route.ts` | Data export |
| `src/app/parent-dashboard/page.tsx` | Dashboard UI with consent flow |

## References
- GitHub Issue #31 - Collaborative Student Profile
- GDPR Article 8 (Child consent)
- GDPR Article 17 (Right to erasure)
- GDPR Article 20 (Data portability)
- Italian Data Protection Code (D.lgs. 196/2003)
- Related ADRs: #0004 (Safety Guardrails)
