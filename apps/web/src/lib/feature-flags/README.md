# Feature Flags System

MirrorBuddy uses a centralized feature flags system for controlled rollout, A/B testing, and emergency kill-switches.

## Architecture

The system has two components:

### 1. Database-Backed Feature Flags (feature-flags-service.ts)

For features that need:

- Per-feature kill-switch capability
- Percentage-based rollout
- Admin UI management
- Persistent state across restarts

**Read recovery and local controls**:

- Startup initializes database policy without blocking application startup.
  Before the first successful load, checks retain the existing compiled defaults.
- Active reads retry a failed startup or explicit reload after 5 seconds.
  Successful loads stop automatic retries; external changes require `reloadFlags()`.
  One in-flight load is shared per instance; there is no background
  interval. The triggering read uses the current snapshot, while Vercel
  `waitUntil` keeps the refresh alive after the request finishes.
- A complete database snapshot replaces the cache atomically. Failed or partial
  reads retain the last successfully loaded policy, including global and individual
  kill switches. Idle instances retry on their next active read, not on a timer.
- Explicitly changed local fields overlay the database snapshot for the life of
  the process, so a reload cannot revoke an immediate local stop. Metadata-only
  updates do not mask database kill switches. A later local command can replace
  an override; an external edit to that same field cannot.
- Administrative and automatic controls share the acknowledged writer below.
  Failed restrictive writes can protect only this process, not survive restart.
  A database acknowledgement does not establish cross-instance convergence.
- Environment-based flags below remain independent; intentionally disabling one
  is not classified as a database outage.

**Acknowledged writes and callers**:

`policy-writer.ts` provides `prepareWritablePolicy`, `beginFeaturePolicyWrite`
and `beginGlobalPolicyWrite`. A write returns an optional local activation token
and a `completion` promise, which callers must await or handle. Restrictive fields
take effect synchronously; permissive fields wait for database acknowledgement.
Receipts distinguish `confirmed` from `skipped`, expose supersession and describe
only this instance's effective policy. Rejection means **unconfirmed**, not a
guaranteed rollback; local protection remains active.

Writes use per-control queues and field generations. Metadata writes merge only
supplied keys in a serializable transaction, retrying rolled-back conflicts at
most twice (three attempts total): Prisma `P2034`, or the verified Prisma 7.7
PostgreSQL adapter representation with `name: 'DriverAdapterError'`,
`cause.kind: 'TransactionWriteConflict'` and `cause.originalCode: '40001'`.
The two retries wait 10ms and 20ms respectively to avoid immediately exhausting
the budget under contention; local protection and queue ordering remain unchanged.
Unknown errors, message text, network failures and ambiguous commit-response
loss never authorize a retry. Automatic release needs the original, still-owned activation token;
overlapping owners or unknown startup policy require administrative recovery.
Mixed automatic requests never drop their restrictive part when release is denied.
Tokens, queues and failed local stops do not survive process restart and do not
provide ordering across instances.

`updateFlag`, `activateKillSwitch`, `deactivateKillSwitch`, `setFlagStatus` and
`setGlobalKillSwitch` now return `Promise<PolicyWriteReceipt>`, not a flag or void.
They reject unconfirmed persistence rather than swallowing the failure.
Unknown IDs reject; database-defined flags can be prepared without a known-ID cast.
Direct stop patches require `killSwitchReason`; explicit release clears it.

Both admin APIs await writes through this writer, including control-panel adapters.
Adapters preserve their state fields and add the receipt. Success and audit follow
only confirmed, non-superseded completion. HTTP failures are:

- `503`: `{success:false, code:"FLAG_POLICY_WRITE_UNCONFIRMED",
persistence:"unconfirmed", scope:"instance", effective}`. A missing acknowledgement
  does not prove rollback; returned protection is local to the handling instance.
- `409`: `{success:false, code:"FLAG_POLICY_WRITE_SUPERSEDED", persistence,
superseded:true, scope:"instance", effective}`. No reactivation is announced.
- Invalid inputs and unknown flags return `400` and `404`, not success-shaped data.

The panel applies the response's effective policy even on `503`/`409`, announces a
localized failure, and retains that instance-scoped view across polling. A later
GET may hit another instance and is never evidence that a mutation was durable.

Degradation applies local fallback immediately and registers handled persistence
with `waitUntil`. Recovery is one owned `{killSwitch:false,status:"enabled"}` write;
fallback, level and events change only after current confirmation. Pending recovery
is shared; unsuccessful automatic recovery requires an explicit retry.

Voice cooldown permits a recovery attempt, not speech. Effective feature/global
policy still blocks voice until release is confirmed. Each spike owns its timer
and token; replacement/reset cancels timers and stale completions cannot announce
recovery. Failed release keeps policy protection without a second permanent latch,
so administrative recovery after cooldown remains possible.

Pure caller tests use deferred network acknowledgements and deterministic clocks.
Owned-UUID PostgreSQL fixtures exercise sparse writes, adapters, action responses,
audit and exact cleanup. `TEST_DATABASE_URL` explicitly opts into the two scoped
PostgreSQL suites. Without it, they skip without initializing application or Prisma
modules, even when a generic `DATABASE_URL` exists. With opt-in, all three URLs
(`TEST_DATABASE_URL`, `DATABASE_URL`, `DEV_DATABASE_URL`) must match local loopback
`mirrorbuddy_test` connection settings, including credentials and options; any
local username/password is supported. Invalid or partial opt-in fails before
application imports. Routing overrides and unapproved connection options are rejected.
HTTP/network/browser regressions: `apps/web/e2e/policy-write-acceptance*.spec.ts`.
They require guarded dedicated metadata and owned cleanup; no distributed or restart claims.

**Built-in Flags**:

- `voice_realtime` - Real-time voice API
- `rag_enabled` - RAG retrieval
- `flashcards` - FSRS flashcards
- `mindmap` - Mind map generation
- `quiz` - Quiz generation
- `pomodoro` - Pomodoro timer
- `gamification` - XP and achievements
- `parent_dashboard` - Parent/professor portal
- `pdf_export` - PDF generation
- `ambient_audio` - Background audio

**Usage**:

```typescript
import { isFeatureEnabled, updateFlag } from '@/lib/feature-flags/feature-flags-service';

// Check if feature is enabled
const result = isFeatureEnabled('voice_realtime', userId);
if (result.enabled) {
  // Feature is available
}

// Update flag status
const receipt = await updateFlag('voice_realtime', {
  status: 'enabled',
  enabledPercentage: 50, // 50% rollout
});
if (receipt.persistence !== 'confirmed' || receipt.superseded) {
  // Do not report success; show receipt.effective as instance-scoped state.
}

// Activate kill-switch
await activateKillSwitch('voice_realtime', 'API quota exceeded');
```

### 2. Environment-Based Flags (i18n-flags.ts)

For features that need:

- Simple enable/disable per environment
- No admin UI management
- Environment-specific control (dev/staging/prod)
- Gradual rollout without database

**Available Flags**:

- `FEATURE_I18N_ENABLED` - Internationalization (multi-language support)

**Usage**:

```typescript
import { isI18nEnabled, getI18nStatus } from '@/lib/feature-flags/i18n-flags';

// Check if i18n is enabled
if (isI18nEnabled()) {
  // Apply locale routing, show language switcher, etc.
}

// Get status string for logging
console.log(`i18n is ${getI18nStatus()}`);

// Check specific locale
if (isLocaleEnabled('fr')) {
  // French locale is available
}
```

## i18n Feature Flag (F-63)

### Environment Variable

```bash
FEATURE_I18N_ENABLED=true  # or false
```

### Default Behavior

- **Not set**: `true` (i18n enabled by default)
- **Empty string**: `false`
- **"true" / "1" / "yes"**: `true` (case-insensitive)
- **"false" / "0" / "no"**: `false` (case-insensitive)

### Rollout Strategy

```
development: true    (always test i18n)
staging:     true    (validate before production)
production:  false → true (enable after validation)
```

### Integration Points

1. **Proxy** (`src/proxy.ts`):
   - Conditionally applies i18n routing
   - If disabled: passes through without locale routing
   - If enabled: applies full next-intl middleware

2. **Components**:
   - Language switcher visibility
   - Locale-specific content rendering
   - UI translations

3. **API Routes**:
   - i18n-specific endpoints
   - Locale configuration endpoints
   - Maestri greetings with locale context

### Configuration Examples

#### Development (Always Enabled)

```env
FEATURE_I18N_ENABLED=true
```

#### Staging (Test i18n)

```env
FEATURE_I18N_ENABLED=true
```

#### Production (Staged Rollout)

```env
# Phase 1: Disable i18n, use default language
FEATURE_I18N_ENABLED=false

# Phase 2: Enable after validation
FEATURE_I18N_ENABLED=true
```

## Testing

### Unit Tests

```bash
npm run test:unit -- src/lib/feature-flags/__tests__/i18n-flags.test.ts
```

Tests verify:

- Default behavior (true when not set)
- Case-insensitive parsing
- All truthy/falsy values

### Integration Testing

```typescript
import { isI18nEnabled } from '@/lib/feature-flags/i18n-flags';

describe('i18n Feature Flag Integration', () => {
  it('should disable locale routing when i18n is disabled', () => {
    process.env.FEATURE_I18N_ENABLED = 'false';
    expect(isI18nEnabled()).toBe(false);
    // Verify middleware passes through
  });
});
```

## Monitoring

### Check Current Status

```typescript
import { getI18nStatus } from '@/lib/feature-flags/i18n-flags';

console.log(`i18n status: ${getI18nStatus()}`);
// Output: "i18n status: enabled" or "i18n status: disabled"
```

### Metrics

Track in observability system:

- i18n enabled/disabled in each environment
- Number of users experiencing each state
- Locale distribution before/after rollout

## Migration Path

1. **Phase 1**: Deploy with `FEATURE_I18N_ENABLED=false`
   - App runs in default language (English/Italian)
   - i18n code loaded but not active

2. **Phase 2**: Enable in staging
   - Set `FEATURE_I18N_ENABLED=true` in staging
   - Validate all locales work correctly
   - Test language switching in all browsers

3. **Phase 3**: Canary rollout in production
   - Deploy with flag set to `false`
   - Toggle to `true` after validation
   - Monitor error rates, user feedback

4. **Phase 4**: Full rollout
   - Set `FEATURE_I18N_ENABLED=true` in all environments
   - Default behavior assumes i18n is active

## See Also

- F-63: i18n can be enabled/disabled per environment
- Plan 078: Internationalization - i18n Multi-Language
- Wave 8: Documentation & Rollout Plan
- ADR 0064: Formal vs Informal Address Support
