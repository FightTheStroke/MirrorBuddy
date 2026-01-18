# ADR 0057: Beta Invite System and Data Migration

## Status

Accepted

## Date

2026-01-18

## Context

MirrorBuddy MVP uses a beta invite system for controlled user onboarding.
Trial users can request beta access, and admins can approve or reject requests.
Approved users receive credentials via email and can optionally migrate their trial data.

## Decision

### Invite Request Flow

1. **Request Submission**
   - User fills beta request form: name, email, motivation
   - Optional link to trial session ID for data migration
   - Stored in `InviteRequest` table with PENDING status
   - Admin notified via email (Resend)
   - User receives confirmation email

2. **Admin Review**
   - Admin accesses `/admin/invites` page
   - Can view pending, approved, and rejected requests
   - Approve: generates username + temp password, creates User, sends credentials
   - Reject: optional reason, sends rejection email

3. **First Login**
   - User logs in with temp password
   - `mustChangePassword: true` triggers password change flow
   - If trial session linked, shows migration choice UI
   - User can migrate trial data or start fresh

### Database Schema

```prisma
enum InviteStatus {
  PENDING
  APPROVED
  REJECTED
}

model InviteRequest {
  id              String       @id @default(cuid())
  email           String       @unique
  name            String
  motivation      String       @db.Text
  trialSessionId  String?
  status          InviteStatus @default(PENDING)
  reviewedAt      DateTime?
  reviewedBy      String?
  rejectionReason String?
  generatedUsername String?    @unique
  inviteToken       String?    @unique
  inviteExpiresAt   DateTime?
  firstLoginAt    DateTime?
  migratedData    Boolean   @default(false)
  createdUserId   String?   @unique
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### API Endpoints

| Endpoint                  | Method | Auth   | Description         |
| ------------------------- | ------ | ------ | ------------------- |
| `/api/invites/request`    | POST   | Public | Submit beta request |
| `/api/invites`            | GET    | Admin  | List all requests   |
| `/api/invites/approve`    | POST   | Admin  | Approve request     |
| `/api/invites/reject`     | POST   | Admin  | Reject request      |
| `/api/user/migrate-trial` | POST   | Auth   | Migrate trial data  |

### Email Templates

1. **Admin Notification**: New request details with admin link
2. **Request Received**: Confirmation to user
3. **Approval**: Username + temp password + login link
4. **Rejection**: Optional reason, invitation to try again later

### Trial Data Migration

Migrates from TrialSession to User:

- Assigned Maestri → Profile preferences
- Assigned Coach → Profile preferences
- Note: Trial conversations are in-memory only, not persisted

### Telemetry Events

- `invite_request_submitted`: Email domain, has trial session
- `invite_approved`: Request ID, admin ID
- `invite_rejected`: Request ID, admin ID, has reason
- `invite_first_login`: User ID, migrated data flag

## Consequences

### Positive

- Controlled beta access with admin approval
- Seamless transition from trial to full account
- Email notifications keep admin informed
- Audit trail of all invite decisions

### Negative

- Manual approval process doesn't scale
- Email deliverability depends on Resend configuration
- Trial conversation history is lost (in-memory only)

### Neutral

- Username generated from email (can be changed later)
- Temp password requires change on first login

## Related

- ADR 0056: Trial Mode Architecture
- ADR 0052: Vercel Deployment Configuration
- Plan 052: MVP Release Beta
