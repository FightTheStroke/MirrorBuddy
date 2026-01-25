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
import { isFeatureEnabled, updateFlag } from "@/lib/feature-flags/feature-flags-service";

// Check if feature is enabled
const result = isFeatureEnabled("voice_realtime", userId);
if (result.enabled) {
  // Feature is available
}

// Update flag status
await updateFlag("voice_realtime", {
  status: "enabled",
  enabledPercentage: 50, // 50% rollout
});

// Activate kill-switch
await activateKillSwitch("voice_realtime", "API quota exceeded");
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
import { isI18nEnabled, getI18nStatus } from "@/lib/feature-flags/i18n-flags";

// Check if i18n is enabled
if (isI18nEnabled()) {
  // Apply locale routing, show language switcher, etc.
}

// Get status string for logging
console.log(`i18n is ${getI18nStatus()}`);

// Check specific locale
if (isLocaleEnabled("fr")) {
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

1. **Middleware** (`middleware.ts`):
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
import { isI18nEnabled } from "@/lib/feature-flags/i18n-flags";

describe("i18n Feature Flag Integration", () => {
  it("should disable locale routing when i18n is disabled", () => {
    process.env.FEATURE_I18N_ENABLED = "false";
    expect(isI18nEnabled()).toBe(false);
    // Verify middleware passes through
  });
});
```

## Monitoring

### Check Current Status

```typescript
import { getI18nStatus } from "@/lib/feature-flags/i18n-flags";

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
