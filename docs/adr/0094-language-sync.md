# ADR 0094: Language Preference Synchronization

## Status

Accepted (Plan 78, Wave 8, Task T8-16)

## Context

MirrorBuddy supports multiple languages (it, en, es, fr, de). Previously, language preference was:

- Stored in user profile (Settings model)
- Not synchronized with client-side preferences
- Lost when switching devices or clearing data
- Not available on welcome page (before login)

We needed a consistent language preference system that works across:

- Anonymous users (welcome page)
- Logged-in users (profile)
- Multiple touchpoints (welcome, settings, app)

## Decision

Implement a priority-based language synchronization system using:

### 1. NEXT_LOCALE Cookie (Client-side)

- Set via `document.cookie` (not HttpOnly, needs client access)
- Valid for 1 year
- Available site-wide (`path=/`)
- Set on language change in welcome or settings

### 2. User Profile Language (Server-side)

- Stored in `Settings.language` field (already exists)
- Synced to server via `PUT /api/user/settings`
- Loaded on login via settings store

### 3. Priority Chain

When determining language preference:

1. **User Profile** (highest priority, if logged in)
   - Loaded from database via settings store
   - Used if available and not default locale
2. **NEXT_LOCALE Cookie** (second priority)
   - Read from `document.cookie`
   - Used if no profile or user not logged in
3. **Browser Language** (third priority)
   - Detected from `navigator.language`
   - Only base language code (e.g., "en" from "en-US")
4. **Default Locale** (fallback)
   - "it" (Italian) as default

### 4. Synchronization Points

**On Page Load:**

- `useLanguageSync` hook initializes language from priority chain
- If profile language exists, sync to cookie for consistency
- If cookie exists but no profile, update local state

**On Language Change:**

- Update cookie immediately (client-side)
- Update settings store (Zustand)
- Sync to server (updates database)

**On Login:**

- If cookie exists and differs from profile, sync cookie to profile
- Use `useLanguageSyncAfterLogin` hook

## Implementation

### New Files

1. **`i18n/config.ts`** - Locale definitions

   ```typescript
   export const locales = ["it", "en", "es", "fr", "de"];
   export const defaultLocale = "it";
   export type Locale = (typeof locales)[number];
   ```

2. **`lib/i18n/language-cookie.ts`** - Cookie utilities
   - `getLanguageCookie()` - Read NEXT_LOCALE
   - `setLanguageCookie(locale)` - Write NEXT_LOCALE
   - `getBrowserLanguage()` - Detect from navigator

3. **`hooks/use-language-sync.ts`** - Synchronization hook
   - `useLanguageSync()` - Main sync hook
   - `useLanguageSyncAfterLogin()` - Post-login sync

### Usage

```tsx
// In app layout or language selector component
import { useLanguageSync } from "@/hooks/use-language-sync";

function LanguageSelector() {
  const { currentLanguage, changeLanguage, isInitialized } = useLanguageSync();

  const handleChange = async (newLang: Locale) => {
    await changeLanguage(newLang);
    // Cookie updated ✓
    // Store updated ✓
    // Profile synced ✓
  };

  return (
    <select
      value={currentLanguage}
      onChange={(e) => handleChange(e.target.value)}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}

// After login
import { useLanguageSyncAfterLogin } from "@/hooks/use-language-sync";

function LoginHandler() {
  const { syncAfterLogin } = useLanguageSyncAfterLogin();

  const handleLogin = async () => {
    // ... login logic
    await syncAfterLogin(); // Syncs cookie to profile if different
  };
}
```

## Edge Cases Handled

1. **New User (Anonymous)**
   - No profile, no cookie → Browser language or default
   - Language selected on welcome → Cookie set
   - After registration → Cookie synced to profile

2. **Returning User (Profile exists)**
   - Profile loaded on login → Cookie updated if different
   - User changes language → Cookie and profile both updated

3. **Cookie Expired or Cleared**
   - Logged in → Profile language used
   - Not logged in → Browser language or default

4. **Profile Without Language**
   - Legacy users with `null` language → Falls back to cookie or browser
   - First language selection → Profile updated

5. **Invalid Cookie Value**
   - Not in supported locales → Ignored, falls back to profile or browser

## Testing

- **Unit Tests**: `language-cookie.test.ts`, `use-language-sync.test.tsx`
- Coverage: Cookie operations, priority chain, sync logic, edge cases
- All tests pass (11 language-cookie, 10 use-language-sync)

## Consequences

### Positive

- **Consistent Experience**: Language persists across sessions and devices (via cookie)
- **User Convenience**: No need to re-select language on every visit
- **Progressive Enhancement**: Works for both anonymous and logged-in users
- **Graceful Degradation**: Falls back through priority chain

### Negative

- **Cookie Dependency**: Users who block cookies must re-select language each visit
- **Sync Overhead**: Language changes trigger two updates (cookie + server)

### Neutral

- **Migration**: Existing users with profile language continue to work (highest priority)
- **Storage Duplication**: Language stored in both cookie and profile (intentional for sync)

## Alternatives Considered

1. **localStorage Only**
   - Rejected: Violates ADR 0015 (no localStorage for user data)
   - Issue: Not accessible in middleware or API routes

2. **Server-side Only (Sessions)**
   - Rejected: Requires login for language preference
   - Issue: Poor UX for anonymous users on welcome page

3. **URL Path Prefix (`/en/...`)**
   - Rejected: Complicates routing, requires middleware for all pages
   - Issue: Breaks existing URLs, harder to share links

## References

- F-70: Language preference consistency across all touchpoints
- Plan 78 (Multi-language Support)
- Existing: `src/lib/i18n/locale-detection.ts` (server-side detection)
- Existing: `Settings.language` field (database storage)

## Related

- ADR 0015: No localStorage for user data (cookies OK)
- `src/lib/stores/settings-store.ts`: Settings sync infrastructure
- `src/app/api/user/settings/route.ts`: Settings API endpoint
