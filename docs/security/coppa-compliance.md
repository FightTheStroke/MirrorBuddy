# COPPA Compliance

MirrorBuddy implements Children's Online Privacy Protection Act (COPPA) requirements for users under 13.

## Overview

COPPA (16 CFR Part 312) requires verifiable parental consent before collecting personal information from children under 13.

## Implementation

### Age Detection

During onboarding, users provide their age. If age < 13:
1. User cannot proceed without parental consent
2. Parent email is collected
3. Verification code sent to parent
4. Parent verifies consent with code

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coppa` | GET | Check COPPA status for user |
| `/api/coppa` | POST | Request parental consent |
| `/api/coppa/verify` | POST | Verify consent with code |
| `/api/coppa/verify` | DELETE | Deny consent (parent declines) |

### Database Schema

```prisma
model CoppaConsent {
  id                    String    @id
  userId                String    @unique
  ageAtConsent          Int       // Age when consent requested
  parentEmail           String?   // Parent's email
  verificationCode      String?   // One-time code (6 chars)
  verificationSentAt    DateTime?
  verificationExpiresAt DateTime? // 48 hour expiry
  consentGranted        Boolean   @default(false)
  consentGrantedAt      DateTime?
  consentDeniedAt       DateTime?
  parentIpAddress       String?   // Audit trail
  verificationMethod    String    @default("email")
}
```

### Consent Flow

```
User enters age < 13
       ↓
Prompt for parent email
       ↓
Generate 6-char verification code
       ↓
Send email to parent (48h expiry)
       ↓
Parent enters code on verification page
       ↓
Consent granted → User can proceed
       OR
Consent denied → Limited/blocked access
```

## Service API

```typescript
import {
  checkCoppaStatus,
  requestParentalConsent,
  verifyParentalConsent,
  canAccessFullFeatures,
  COPPA_AGE_THRESHOLD, // 13
} from '@/lib/compliance/coppa-service';

// Check if user needs consent
const status = await checkCoppaStatus(userId);
if (status.requiresConsent && !status.consentGranted) {
  // Block access or show consent UI
}

// Request consent
const result = await requestParentalConsent(userId, age, parentEmail);
// result.verificationCode - send to parent

// Verify consent
const verified = await verifyParentalConsent(code, ipAddress);
if (verified.success) {
  // Allow full access
}

// Quick check for feature access
const canAccess = await canAccessFullFeatures(userId);
```

## Verification Methods

| Method | Description | Status |
|--------|-------------|--------|
| Email | 6-char code sent to parent email | Implemented |
| Phone | Voice/SMS verification | Planned |
| In-person | Physical verification form | Planned |

## Testing

```bash
# Run COPPA E2E tests
npm run test -- --grep "COPPA"

# Manual testing (dev mode)
# 1. Create user with age < 13
# 2. POST /api/coppa with parent email
# 3. Check logs for verification code
# 4. POST /api/coppa/verify with code
```

## Audit Trail

All consent actions are logged with:
- User ID
- Timestamp
- IP address (for verification)
- Verification method used

## References

- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [16 CFR Part 312](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)
