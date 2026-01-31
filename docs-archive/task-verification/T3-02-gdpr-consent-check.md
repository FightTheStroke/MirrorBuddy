# T3-02: GDPR Consent Check for Parent Notes

**Task**: Add GDPR consent check before saving parent notes
**Priority**: P2
**Type**: bug
**Status**: DONE

## Context

- ADR 0008 documents GDPR dual consent model
- StudentInsightProfile table tracks `parentConsent` boolean
- Parent notes should only be saved if consent is granted
- Per GDPR, processing children's data requires parental consent

## Implementation

### Changes Made

#### 1. Parent Note Generator (`src/lib/session/parent-note-generator.ts`)

Added three key functions:

**`hasParentConsent(userId: string): Promise<boolean>`**
- Queries `StudentInsightProfile` for the user
- Returns `true` if `parentConsent` is `true`
- Returns `false` if no profile exists or consent not granted

**`saveParentNote(...): Promise<string | null>`**
- Checks consent BEFORE creating database record
- If no consent: logs skip reason, returns `null`
- If consent granted: saves note, returns note ID

**`generateAndSaveParentNote(...): Promise<string | null>`**
- Convenience function combining generation + saving
- Checks consent BEFORE expensive AI generation (efficiency)
- If no consent: skips generation entirely, logs, returns `null`
- If consent granted: generates note and saves

#### 2. API Route Update (`src/app/api/conversations/[id]/end/route.ts`)

- Updated imports to use `generateAndSaveParentNote`
- Replaced separate `generateParentNote` + `saveParentNote` calls
- Now uses single function with built-in consent check
- Added GDPR compliance comment in file header

### Behavior

| Scenario | Behavior |
|----------|----------|
| User has `parentConsent: true` | Parent note generated and saved normally |
| User has `parentConsent: false` | Parent note skipped, logged, conversation ends normally |
| No `StudentInsightProfile` exists | Treated as no consent, note skipped |
| Parent note fails (non-consent reason) | Error logged, conversation still ends (non-blocking) |

### Logs Generated

When consent not granted:
```
INFO: Parent note generation skipped - no parent consent
  userId: <user_id>
  sessionId: <session_id>
```

When consent granted and saved:
```
INFO: Parent note generated and saved
  conversationId: <conversation_id>
  userId: <user_id>
  parentNoteId: <note_id>
  duration: <minutes>
```

## Verification

### Test Scenarios

#### Scenario 1: User with Parent Consent
```sql
-- Setup
INSERT INTO StudentInsightProfile (userId, parentConsent) VALUES ('user123', true);

-- Expected: Parent note is generated and saved
-- Log: "Parent note generated and saved"
```

#### Scenario 2: User without Parent Consent
```sql
-- Setup
INSERT INTO StudentInsightProfile (userId, parentConsent) VALUES ('user456', false);

-- Expected: Parent note is NOT saved
-- Log: "Parent note generation skipped - no parent consent"
```

#### Scenario 3: User with No Profile
```sql
-- Setup: No StudentInsightProfile record exists

-- Expected: Parent note is NOT saved
-- Log: "Parent note generation skipped - no parent consent"
```

### Code Flow

```
1. Conversation ends
   ↓
2. Summary generated
   ↓
3. Maestro evaluation generated
   ↓
4. generateAndSaveParentNote() called
   ↓
5. hasParentConsent(userId) checked
   ├─ NO → Log skip, return null, continue
   └─ YES → Generate note → Save note → Return note ID
```

## F-xx Verification

This task addresses implied requirements from ADR 0008:

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Check parent consent before saving data | [x] PASS | `hasParentConsent()` query in `saveParentNote()` |
| Log when data processing is skipped | [x] PASS | Logger calls in both functions |
| Don't fail conversation end if no consent | [x] PASS | Returns `null`, conversation continues |
| Avoid expensive AI calls when not needed | [x] PASS | Consent checked BEFORE `generateParentNote()` |

## Files Modified

- `src/lib/session/parent-note-generator.ts` - Added consent checking functions
- `src/app/api/conversations/[id]/end/route.ts` - Updated to use consent-aware function

## Testing

TypeScript compilation: ✓ PASS
ESLint: ✓ PASS (no new warnings)
Logic verification: ✓ PASS (consent check implemented correctly)

## Notes

- Parent notes are still non-blocking (try/catch in API route)
- Error in parent note generation won't fail conversation end
- Consent check happens at TWO levels for safety:
  1. In `generateAndSaveParentNote()` - avoids expensive AI call
  2. In `saveParentNote()` - final safety check before DB write
