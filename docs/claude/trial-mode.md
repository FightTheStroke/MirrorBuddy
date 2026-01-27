# Trial Mode

MirrorBuddy trial mode is the first tier in the subscription system, allowing anonymous users to evaluate the platform without creating an account.

**IMPORTANT**: Trial is now managed by the **TierService** as part of the tier subscription system. See [ADR-0071: Tier Subscription System](../adr/0071-tier-subscription-system.md) for the complete architecture.

## Trial Tier Definition

The Trial tier is configured in the `TierDefinition` table with the code `TRIAL`:

| Resource       | Limit                   | Details                                             |
| -------------- | ----------------------- | --------------------------------------------------- |
| Chat messages  | 10 per day              | `chatLimitDaily` in TierDefinition                  |
| Voice time     | 5 minutes (300 seconds) | `voiceMinutesDaily` in TierDefinition (5 min)       |
| Tool calls     | 10 per day              | `toolsLimitDaily` in TierDefinition                 |
| Documents      | 1 total                 | `docsLimitTotal` in TierDefinition                  |
| AI Model       | gpt-4o-mini             | `chatModel` in TierDefinition                       |
| Maestri Access | All 22 maestri/amici    | `availableMaestri` in TierDefinition (unrestricted) |

**Key behavior:**

- Voice and chat are tracked separately (voice does not consume chat quota)
- Each tool invocation (mind map, summary, flashcard, quiz) counts as 1 tool call
- Limits checked before and after each operation
- **No maestri restrictions** - users can talk to any of the 22 maestri/amici

**Note on Maestri Limit Removal:**

Previously, we restricted trial users to 3 maestri. This was removed because:

- It was confusing and overly restrictive
- Time-based limits (voice, chat, tools) are more effective
- Users should explore freely to evaluate the platform
- The "select 3 maestri" UI appeared at wrong times and was buggy

The `selectedMaestri` field remains in the database for legacy compatibility but is unused.

## Integration with TierService

Trial tier assignment is now handled by **TierService.getEffectiveTier()**:

```typescript
// Anonymous user (null userId) → Trial tier
const tier = await tierService.getEffectiveTier(null);
// Returns TierDefinition with code='TRIAL'

// Get trial limits for anonymous user
const limits = await tierService.getLimitsForUser(null);
// Returns { chatLimit: 10, voiceMinutes: 5, toolsLimit: 10, ... }

// Check if anonymous user has feature access
const hasVoice = await tierService.checkFeatureAccess(null, "voice");
// Returns boolean based on Trial tier features
```

All trial limit checks now use `TierService` instead of the legacy `TRIAL_LIMITS` constants. The service provides:

- Centralized limit management via database
- Admin override capability
- Feature access control
- AI model selection

## Key Files

| File                                        | Purpose                                                             |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/tier/tier-service.ts`              | **NEW**: Core tier logic, tier assignment, limit extraction         |
| `src/lib/tier/tier-helpers.ts`              | Subscription validation, tier limit extraction, model selection     |
| `src/lib/trial/trial-service.ts`            | **LEGACY**: Trial session tracking (still used for IP/cookie hash)  |
| `src/app/api/trial/session/route.ts`        | Session creation for anonymous users                                |
| `src/app/api/trial/voice/route.ts`          | Voice usage tracking (now delegates to TierService)                 |
| `src/app/api/chat/trial-handler.ts`         | Chat limit checking (now delegates to TierService.getLimitsForUser) |
| `src/lib/hooks/use-trial-status.ts`         | **DEPRECATED**: Use `useTierFeatures` hook instead                  |
| `src/components/tier/use-tier-features.tsx` | **NEW**: Client-side tier feature checking (replaces trial hook)    |
| `src/lib/telemetry/trial-events.ts`         | Analytics events (TRIAL events now part of tier analytics)          |

## Session Tracking

Sessions are tracked using IP hash + visitor cookie (OR query):

- Prevents cookie-clearing bypass via incognito mode
- IP hash uses SHA256(IP + salt)
- Salt rotated monthly for privacy

```typescript
// Session lookup (either IP OR cookie matches)
const session = await prisma.trialSession.findFirst({
  where: {
    OR: [{ ipHash }, { visitorId }],
  },
});
```

## API Endpoints

### Trial Session Management

**GET /api/trial/session**

Returns current trial status with all limits.

**POST /api/trial/session**

Creates or retrieves a trial session.

### Trial Usage Tracking

**GET /api/trial/voice**

Check remaining voice time (calls TierService internally).

**POST /api/trial/voice**

Report voice session duration (called when voice session ends).

### Tier System Integration

**GET /api/user/subscription**

Returns authenticated user's current subscription and tier. Trial users cannot call this endpoint (no auth).

**GET /api/admin/tiers** (Admin only)

List all tier definitions including the TRIAL tier configuration.

### Email Capture & Trial-to-Base Conversion

When a trial user wants to upgrade or continue after reaching limits:

1. **Prompt email capture**: Display modal with email field and "Continue as account" CTA
2. **Create account**: POST to `/api/auth/signup` with email
3. **Assign Base tier**: TierService automatically assigns `BASE` tier to new registered user
4. **Migrate session**: Transfer trial session history to user account via email address

The email capture happens in trial-to-base flow - see ADR-0071 section "Tier Assignment" for fallback behavior.

### Legacy Trial Analytics

**GET /api/trial/analytics** (Admin only)

Returns trial funnel metrics including:

- Total trials, chats, voice minutes, tool calls
- Limit hits by type (chat, voice, tool)
- Conversion rates
- Daily breakdown

_Note: This endpoint is deprecated. Use `/api/admin/tiers/analytics` for subscription-wide metrics._

## Usage in Components

### New Pattern: useTierFeatures Hook

```typescript
import { useTierFeatures } from "@/components/tier/use-tier-features";

function MyComponent() {
  const { tier, limits, hasFeature, isLoading } = useTierFeatures();

  if (isLoading) return <Spinner />;

  // Check if tier is trial
  if (tier?.code === 'TRIAL') {
    return (
      <div>
        <p>Chats: {limits.chatLimit - limits.chatUsed}/{limits.chatLimit}</p>
        <p>Voice: {Math.floor(limits.voiceRemaining / 60)}m</p>
        <p>Tools: {limits.toolsLimit - limits.toolsUsed}/{limits.toolsLimit}</p>
      </div>
    );
  }

  // Feature checking also works for authenticated users
  if (!hasFeature('voice')) {
    return <UpgradePrompt feature="voice" />;
  }

  return <FullAccess />;
}
```

### Legacy Pattern (Deprecated - For Trial Only)

```typescript
// OLD: useTrialStatus - still available but limited to trial tracking
import { useTrialStatus } from "@/lib/hooks/use-trial-status";

function MyComponent() {
  const trial = useTrialStatus();
  // Limited to trial sessions only, doesn't support authenticated users
}
```

## Telemetry Events

| Event              | When               | Data                                |
| ------------------ | ------------------ | ----------------------------------- |
| `trial_start`      | Session created    | device, browser, referrer, UTM      |
| `trial_chat`       | Text message sent  | chatNumber, remainingChats          |
| `trial_voice`      | Voice session ends | durationSeconds, remainingSeconds   |
| `trial_tool`       | Tool invoked       | toolName, toolsUsed, remainingTools |
| `trial_limit_hit`  | Any limit reached  | limitType (chat/voice/tool)         |
| `beta_cta_shown`   | CTA displayed      | location                            |
| `beta_cta_clicked` | User clicks CTA    | location                            |

## Grafana Dashboard

Trial metrics are displayed in the MirrorBuddy Beta dashboard:

- `grafana/dashboards/mirrorbuddy-beta.json`

Panels include:

- Trial funnel (started, engaged, limits hit, beta requests)
- Limit hit breakdown by type (chat, voice, tool)
- Voice usage and tool calls totals
- Resource usage over time
- Average usage per trial

## Security Features (Plan 088)

Plan 088 introduces critical security hardening for trial sessions to prevent abuse and protect user privacy:

### Salted IP Hashing

- IP addresses are hashed using SHA256 with a configurable salt (`IP_HASH_SALT` environment variable)
- Prevents direct IP exposure in database logs and backups
- Allows session recovery without storing raw IPs
- Hash includes timestamp bucketing to prevent timing attacks

```typescript
// Usage in trial-service.ts
const ipHash = await hashIpWithSalt(clientIp, ipHashSalt);
```

### GDPR Consent Gate

- Users must explicitly accept the privacy policy before trial session starts
- Implemented via `TosGateProvider` component that blocks UI until consent
- Consent status tracked in HTTP-only cookie (`mirrorbuddy-consent`)
- Fulfills GDPR Article 7 (clear affirmative action) and Italian law compliance

**Enforcement points**:

- Home page: Blocks access until consent accepted
- API endpoints: Trial endpoints reject requests without consent cookie
- Analytics: No events tracked before consent

### Anti-Abuse Scoring

- Suspicious patterns trigger an abuse score that accumulates per trial session
- **Abuse threshold: 10** - sessions reaching this score are blocked/rate-limited
- Patterns monitored:
  - Rapid-fire requests (>5 messages/minute)
  - Multiple session creation attempts (>3 per hour)
  - Unusual geographic location changes
  - High tool-to-chat ratio (>50% tools per session)

**Implementation**: `src/lib/safety/abuse-detector.ts`

- Scores tracked in `TrialSession.abuseScore` field
- Score increments on suspicious behavior
- Rate limiting applies when score ≥ 10

```typescript
const detector = new AbuseDetector();
const score = await detector.evaluateSession(sessionId);
if (score >= ABUSE_THRESHOLD) {
  // Apply rate limiting or block session
}
```

### 30-Day Data Retention

- Trial session data automatically deleted 30 days after creation
- Configured via cron job: `data-retention` (runs daily at 03:00 UTC)
- Deletes: trial sessions, analytics events, temporary files
- **GDPR compliance**: Implements data minimization principle (Article 5(1)(e))
- Backup data purged separately to ensure complete removal

**Retention schedule**:

- Days 0-29: Data retained for session and analytics
- Day 30: Automatic deletion via cron
- No manual intervention required

```bash
# Cron job configured in vercel.json
# DELETE FROM trial_sessions WHERE created_at < NOW() - INTERVAL 30 days
```

### Monthly Salt Rotation

- IP hash salt rotated monthly via automated cron job: `rotate-ip-salt`
- Old salt retained for 7 days to allow session lookup continuity
- New salt applied to all new sessions immediately after rotation
- Prevents rainbow table attacks and limits exposure window

**Rotation process**:

1. Generate new 32-byte cryptographically random salt
2. Store as `IP_HASH_SALT_v2` (alongside current `IP_HASH_SALT`)
3. Update environment variable via Vercel API
4. New sessions hash with v2 salt immediately
5. Purge old salt after 7 days

**Implementation**: Cron job in `src/app/api/cron/rotate-ip-salt/route.ts`

**Verification**:

```bash
# Check salt rotation history (admin only)
GET /api/admin/security/salt-rotation-log

# Manual test
curl -X POST http://localhost:3000/api/cron/rotate-ip-salt \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Configuration

All security features configured via environment variables:

```bash
# Required for Plan 088
IP_HASH_SALT=<32-byte-hex>              # Initial IP hash salt
ABUSE_THRESHOLD=10                       # Anti-abuse score threshold (default: 10)
GDPR_ENFORCEMENT=true                    # Enforce consent gate (default: true)
TRIAL_DATA_RETENTION_DAYS=30             # Data retention window (default: 30)
```

## ADR References

### Primary

**[ADR-0071: Tier Subscription System](../adr/0071-tier-subscription-system.md)** - Complete tier architecture including Trial tier integration, TierService implementation, admin overrides, and audit logging.

### Historical Context

**[ADR-0056: Trial Mode Architecture](../adr/0056-trial-mode-architecture.md)** - Original trial mode design for anonymous users and session tracking (now subsumed under tier system).

## Migration Notes

- **Trial limits**: Now defined in `TierDefinition` table with code='TRIAL', instead of hardcoded `TRIAL_LIMITS` constants
- **Session tracking**: Still uses IP hash + visitor cookie from ADR-0056, but limits are now fetched from TierService
- **Email capture**: Used to convert anonymous trial user to registered BASE tier account
- **TierService**: Single source of truth for all tier logic (trial, base, pro)
