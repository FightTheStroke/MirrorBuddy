# Parent Dashboard

> GDPR-compliant parent access to child's learning data with dual consent model

## Quick Reference

| Key       | Value                                                       |
| --------- | ----------------------------------------------------------- |
| Path      | `src/app/parent-dashboard/`, `src/app/api/profile/`         |
| ADR       | 0008 (Parent Dashboard GDPR)                                |
| DB Tables | `StudentInsightProfile`, `ProfileAccessLog`, `ParentNote`   |
| Consent   | Dual model: parent consent + student consent (GDPR Art. 8)  |
| Erasure   | 30-day grace period, then permanent deletion (GDPR Art. 17) |

## Architecture

The parent dashboard uses a **dual consent model** to comply with GDPR Article 8 (children's consent) and Italian data protection law. Both parent and student must grant consent before learning data is visible. The system tracks six UI states: `loading`, `no-profile`, `needs-consent`, `ready`, `deletion-pending`, and `error`.

Every profile access is logged in `ProfileAccessLog` with userId, action type, IP address, and user agent for full audit trail. Data export supports JSON and PDF formats for GDPR Article 20 (data portability). Right to erasure (Article 17) uses a 30-day grace period before permanent deletion.

Parent notes are auto-generated after each session (ADR 0019) with parent-friendly summaries, highlights, concerns, and suggestions for home activities.

## Key Files

| File                                   | Purpose                        |
| -------------------------------------- | ------------------------------ |
| `src/app/parent-dashboard/page.tsx`    | Dashboard UI with consent flow |
| `src/app/api/profile/route.ts`         | Profile CRUD                   |
| `src/app/api/profile/consent/route.ts` | Consent management             |
| `src/app/api/profile/export/route.ts`  | Data export (JSON/PDF)         |
| `src/app/api/parent-notes/route.ts`    | Parent notes CRUD              |

## API Endpoints

| Endpoint                | Method | Purpose                          |
| ----------------------- | ------ | -------------------------------- |
| `/api/profile`          | GET    | Fetch profile (if consent given) |
| `/api/profile/consent`  | GET    | Check consent status             |
| `/api/profile/consent`  | POST   | Grant consent                    |
| `/api/profile/generate` | POST   | Generate profile from learnings  |
| `/api/profile/export`   | GET    | Export data (JSON/PDF)           |
| `/api/parent-notes`     | GET    | List parent notes                |
| `/api/parent-notes`     | PATCH  | Mark note as viewed              |
| `/api/parent-notes`     | DELETE | Delete note                      |

## UI States

| State              | Display                           |
| ------------------ | --------------------------------- |
| `no-profile`       | "Generate Profile" button         |
| `needs-consent`    | Consent explanation + checkboxes  |
| `ready`            | Full dashboard with learning data |
| `deletion-pending` | "Deletion requested" message      |

## Code Patterns

```typescript
// Check consent status
const consent = await fetch("/api/profile/consent");
const { parentConsent, studentConsent } = await consent.json();

// Access logging (server-side, automatic)
await prisma.profileAccessLog.create({
  data: {
    profileId: profile.id,
    userId: requestingUserId,
    action: "view", // view | download | share | edit | delete_request
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  },
});

// Request data deletion (30-day grace period)
await prisma.studentInsightProfile.update({
  where: { id: profileId },
  data: { deletionRequested: new Date() },
});
```

## See Also

- `docs/adr/0008-parent-dashboard-gdpr.md` -- Full GDPR consent model design
- `docs/adr/0019-session-summaries-unified-archive.md` -- Parent notes generation
- `docs/claude/session-summaries.md` -- Session summaries that feed parent notes
- `.claude/rules/compliance.md` -- Regulatory framework overview
