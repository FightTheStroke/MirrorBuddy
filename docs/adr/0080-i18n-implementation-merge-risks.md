# ADR 0080: i18n Implementation and Merge Risks

## Status

Accepted

## Date

2026-01-25

## Context

MirrorBuddy is implementing internationalization (i18n) using next-intl v4.7.0 with Next.js 16.1.1.
This ADR documents critical implementation decisions and potential risks when merging the
`feature/i18n-multi-language` branch into `main`.

## Decision

### Architecture Changes

1. **Proxy-based Routing (Next.js 16)**
   - File: `proxy.ts` (NOT `middleware.ts`)
   - Next.js 16 renamed middleware to proxy for network boundary clarity
   - Runs on Node.js runtime (not Edge)
   - Reference: https://nextjs.org/docs/messages/middleware-to-proxy

2. **next-intl Configuration**
   - Plugin: `createNextIntlPlugin` in `next.config.ts`
   - Request config: `src/i18n/request.ts` (uses `requestLocale` API for v4.x)
   - Routing: `src/i18n/routing.ts`
   - Config: `src/i18n/config.ts`

3. **Dynamic Rendering**
   - `src/app/[locale]/layout.tsx` exports `dynamic = "force-dynamic"`
   - Required to prevent SSR/prerender issues with `useTranslations` hooks
   - Trade-off: Pages are server-rendered on each request (no static caching)

## MERGE RISKS (CRITICAL)

### 1. Turbopack Compatibility

**Risk**: Turbopack has known issues with middleware file tracing.

**Symptoms**:

- Build error: `ENOENT: middleware.js.nft.json`
- Build completes pages but fails at "Finalizing page optimization"

**Solution**: Use `proxy.ts` instead of `middleware.ts` (Next.js 16 standard).

**If error persists after merge**:

```bash
rm -rf .next node_modules
npm install
npm run build
```

### 2. Prisma Schema Change

**Risk**: Added `locale` field to `FunnelEvent` model.

**File**: `prisma/schema/analytics.prisma`

**Required after merge**:

```bash
npx prisma generate
./scripts/sync-databases.sh  # Sync BOTH prod + test DBs
```

**If not synced**: Analytics by-locale endpoint will fail with Prisma errors.

### 3. next-intl API Version

**Risk**: next-intl v4.x uses different API than v3.x.

**Correct (v4.x)**:

```typescript
// src/i18n/request.ts
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  // ...
});
```

**Wrong (v3.x - will fail)**:

```typescript
export default getRequestConfig(async ({ locale }) => {
  // This will cause "locale is undefined" errors
});
```

### 4. Route Structure Change

**Risk**: All routes are now under `[locale]` dynamic segment.

**Old**: `/welcome`, `/chat`, `/home`
**New**: `/it/welcome`, `/en/chat`, `/fr/home`

**Implications**:

- All internal links must use `Link` from `next-intl` or include locale
- API routes remain unchanged (`/api/*` - excluded from proxy)
- Admin routes excluded (`/admin/*`)

### 5. Feature Flag Dependency

**Environment variable**: `FEATURE_I18N_ENABLED`

**Behavior**:

- `true` or undefined: Full i18n routing enabled
- `false`: Proxy passes through (single language mode)

**Deployment consideration**: Set `FEATURE_I18N_ENABLED=false` in production initially
for gradual rollout.

### 6. GitGuardian False Positives

**Risk**: GitGuardian flags `messages/*.json` translation files as containing secrets.

**Cause**: Translation files contain UI form labels like:

```json
{
  "username": "Nome utente",
  "password": "Password"
}
```

These are **UI labels, NOT secrets**. GitGuardian's "Username Password" detector triggers on these patterns.

**Solution**: `.gitguardian.yaml` updated to ignore:

- `messages/*.json` and `messages/**/*.json` paths
- Specific patterns: `"username": "` and `"password": "`

**If GitGuardian still fails after merge**:

1. Check GitGuardian dashboard for incident ID
2. Mark as "False Positive" in dashboard
3. Or add specific SHA to `ignored_matches` in `.gitguardian.yaml`

### 7. Centralized Logging Alignment (ADR 0076)

**Risk**: New i18n API routes may use `console.error` instead of centralized logger.

**Background**: Main branch introduced ADR 0076 with ESLint `no-console` rule to enforce:

- Server-side: `import { logger } from '@/lib/logger'`
- Client-side: `import { clientLogger } from '@/lib/logger/client'`

**Files requiring alignment** (verified 2026-01-26):

- `src/app/api/admin/locales/route.ts` - ✅ Fixed
- `src/app/api/admin/locales/[id]/route.ts` - ✅ Fixed
- `src/app/api/admin/funnel/by-locale/route.ts` - ✅ Fixed
- `src/lib/i18n/language-cookie.ts` - ✅ Fixed (uses clientLogger)
- `src/lib/metadata/get-page-metadata.ts` - ✅ Fixed

**Rebase procedure**:

1. Fetch latest main: `git fetch origin main`
2. Rebase: `git rebase origin/main`
3. Resolve ESLint config conflict (keep both `no-console` and `no-hardcoded-italian` rules)
4. Run lint: `npm run lint`
5. Fix any remaining `console.error/warn/log` calls
6. Force push: `git push --force-with-lease --no-verify`

### 8. Unit Test i18n Mock Requirements (CRITICAL)

**Risk**: Unit tests fail with 600+ errors because `useTranslations` requires proper mocking.

**Problem**: Components using `useTranslations` from `next-intl` throw errors in Vitest:

```
Error: `useTranslations` requires a `NextIntlClientProvider` ancestor
```

**Solution implemented in `src/test/setup.ts`**:

```typescript
// Load real Italian translations for test compatibility
const itMessages = require("../../messages/it.json");

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string = "") => {
    return (key: string, values?: Record<string, unknown>) => {
      const translation = resolveTranslation(itMessages, namespace, key);
      // Handle interpolation if values provided
      if (values && typeof translation === "string") {
        return translation.replace(/\{(\w+)\}/g, (_, name) =>
          values[name] !== undefined ? String(values[name]) : `{${name}}`,
        );
      }
      return translation;
    };
  },
  useLocale: () => "it",
  useMessages: () => itMessages,
  // ... other hooks
}));
```

**Why real translations instead of keys**:

- Existing tests use assertions like `screen.getByRole('group', { name: 'Tag' })`
- Returning keys would require updating 300+ test assertions
- Real translations maintain backward compatibility

**ESLint protection**: The `no-hardcoded-italian` rule in `eslint.config.mjs` catches
hardcoded Italian text in JSX, but explicitly ignores test files:

```javascript
{
  files: ["src/**/*.tsx"],
  ignores: ["src/**/*.test.tsx", "src/**/__tests__/**"],
  rules: { "local-rules/no-hardcoded-italian": "error" },
}
```

**Future-proofing**: When adding new test assertions for i18n components:

1. Use actual Italian text that will be resolved from `messages/it.json`
2. Or use `data-testid` attributes for locale-independent testing
3. Prefer testing behavior over text content where possible

### 9. Missing Translation Keys (BLOCKING ISSUE)

**Status**: ⚠️ INCOMPLETE - Many translation keys are missing from messages files

**Problem**: Components have been migrated to use `useTranslations` but the corresponding
translation keys don't exist in `messages/*.json` files.

**Symptoms**:

- ~300+ unit tests fail because expected Italian text is not in messages
- Tests look for text like "Tag", "Preferiti" but translations are missing
- Mock returns translation keys instead of translated text

**Namespace mismatches found**:

| Code Namespace            | Messages Key              | Status   |
| ------------------------- | ------------------------- | -------- |
| `welcome.tier-comparison` | `welcome.tierComparison`  | ✓ Fixed  |
| `education.knowledge-hub` | `education.knowledge-hub` | ✓ Added  |
| `admin.*`                 | (missing)                 | ✗ NEEDED |
| `conversation.*`          | (missing)                 | ✗ NEEDED |
| `tools.*` (many)          | Partially present         | ⚠️ Check |
| `profile.*`               | (missing)                 | ✗ NEEDED |

**Resolution before merge** (REQUIRED):

1. Run: `npm run test:unit 2>&1 | grep "FAIL\|namespace"` to identify missing keys
2. For each failing test, check what namespace the component uses
3. Add missing keys to `messages/it.json` (and other language files)
4. Verify with: `npm run test:unit -- --reporter=dot | tail -5`

**Workaround in mock**: The test setup converts kebab-case to camelCase
(`tier-comparison` → `tierComparison`) automatically.

**Estimated effort**: ~300 translation keys need to be added across 5 language files

## Files Changed

| File                                      | Change                                      | Risk Level |
| ----------------------------------------- | ------------------------------------------- | ---------- |
| `proxy.ts`                                | NEW - i18n routing (replaces middleware.ts) | HIGH       |
| `middleware.ts`                           | DELETED                                     | HIGH       |
| `next.config.ts`                          | Added next-intl plugin wrapper              | MEDIUM     |
| `src/i18n/request.ts`                     | Updated to v4.x API                         | MEDIUM     |
| `src/app/[locale]/layout.tsx`             | Added force-dynamic                         | LOW        |
| `prisma/schema/analytics.prisma`          | Added locale field                          | MEDIUM     |
| `.gitguardian.yaml`                       | Added i18n path ignores                     | LOW        |
| `eslint.config.mjs`                       | Added no-hardcoded-italian rule             | LOW        |
| `src/app/api/admin/locales/*.ts`          | NEW - Locale admin API                      | LOW        |
| `src/app/api/admin/funnel/by-locale/*.ts` | NEW - Analytics by locale                   | LOW        |
| `src/lib/i18n/language-cookie.ts`         | NEW - Client language cookie                | LOW        |
| `src/lib/metadata/get-page-metadata.ts`   | NEW - Localized metadata                    | LOW        |
| `src/test/setup.ts`                       | Added next-intl mock with real translations | MEDIUM     |

## Verification Checklist

Before deploying after merge:

- [ ] `npm run lint` passes (no-console rule, ADR 0076)
- [ ] `npm run typecheck` passes
- [ ] `npm run test:unit` passes (requires next-intl mock, see section 8)
- [ ] `npm run build` completes without errors
- [ ] `npx prisma generate` runs successfully
- [ ] `./scripts/sync-databases.sh` executed for all environments
- [ ] Test `/it/welcome` loads correctly
- [ ] Test `/en/welcome` loads correctly
- [ ] Test locale switching works
- [ ] Test API routes still work (`/api/health`)
- [ ] Test admin routes work (`/admin/*`)
- [ ] Verify `FEATURE_I18N_ENABLED` env var is set appropriately

## Rollback Plan

If critical issues occur after merge:

1. **Quick rollback**: Set `FEATURE_I18N_ENABLED=false` in production
2. **Full rollback**: Revert merge commit
3. **Partial fix**: Check this ADR for specific fix procedures

## References

- [Next.js 16 Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy)
- [next-intl Routing Documentation](https://next-intl.dev/docs/routing/middleware)
- [Turbopack Known Issues](https://github.com/vercel/next.js/discussions/86140)

## Consequences

### Positive

- Multi-language support (it, en, fr, de, es)
- SEO-friendly localized URLs
- User language detection and persistence
- Feature flag for gradual rollout

### Negative

- All pages are dynamically rendered (no static optimization)
- Additional complexity in routing
- Requires database migration for analytics
- Turbopack compatibility requires specific file naming (`proxy.ts`)
