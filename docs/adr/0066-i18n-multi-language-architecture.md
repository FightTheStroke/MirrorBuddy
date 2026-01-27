# ADR 0066: Multi-Language i18n Architecture

## Status

Accepted

## Date

2026-01-25

## Context

MirrorBuddy's expansion to 5 languages (Italian, English, French, German, Spanish) requires:

1. **Consistent locale routing** - User-friendly URLs with locale prefixes (e.g., /en/dashboard, /it/chat)
2. **Server-side translation** - Prevent hardcoded strings and ensure performance
3. **Character formality** - Adapt professor/coach/buddy address (formal Lei vs informal tu) by language and historical era
4. **Locale configuration management** - Admin controls to enable/disable locales and assign language teachers per country
5. **Translation tooling** - ESLint rules to enforce proper use of translations in JSX/TSX
6. **Fallback strategy** - Graceful degradation when translations are missing

## Decision

Implement multi-language architecture with three integrated layers:

### 1. next-intl Routing (URL Layer)

**Framework**: next-intl for type-safe translations and routing

**Configuration** (`src/i18n/routing.ts`):

- 5 supported locales: `["it", "en", "fr", "de", "es"]`
- Default locale: `"it"` (Italian)
- URL strategy: `localePrefix: "always"` (always show /locale/path)
- Locale detection: Cookie (NEXT_LOCALE) → Accept-Language → Default

**Middleware** (`middleware.ts`):

- Detects user's preferred language from Accept-Language header
- Stores preference in NEXT_LOCALE cookie
- Routes all requests through next-intl with locale context
- Exempts `/api/*`, `/admin/*`, static files from localization

### 2. Server-Side Translation (Backend Layer)

**Messages structure** (`messages/{locale}.json`):

- Organized by namespace: `common`, `navigation`, `auth`, `errors`, `tools`, `accessibility`, `validation`, `status`, `toasts`
- Type-safe access via generated types (`src/i18n/types.ts`)
- Example: `t("navigation.breadcrumbs.home")` returns "Home" (en) or "Home" (it)

**No localStorage for translations** (ADR 0015 compliance):

- All translation strings managed via next-intl
- User locale preference stored in HttpOnly NEXT_LOCALE cookie
- Prevents data loss across sessions and browser clears

### 3. Formality Rules (Character Layer)

**Implementation** (`src/lib/i18n/formality-rules.ts`):

- Distinguishes formal (Lei/Sie/Vous/Usted) vs informal (tu/du/tu/tú) address
- Classification based on:
  - Character type: maestro (formal/informal), coach (always informal), buddy (always informal)
  - Historical era: pre-1900 figures use formal across all languages
- System prompt injection: `getFormalitySection(characterId, type, language)` returns language-specific formality instructions
- Language-specific terms: Each language has native formal/informal pronouns and example phrases

**Reference**: Detailed in ADR 0064 (Formal/Informal Address for Professors)

### 4. LocaleConfig Admin System

**Database-driven configuration** (`prisma/schema/locale.prisma`):

```prisma
model LocaleConfig {
  id: String                      // Country code (e.g., "IT", "FR")
  countryName: String             // Display name
  locale: String                  // BCP 47 locale (e.g., "it-IT")
  enabled: Boolean                // Admin toggle
  primaryLanguageMaestroId: String // Maestro teaching that language
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Singleton service** (`src/lib/locale/locale-config-service.ts`):

- In-memory cache with 5-minute TTL for performance
- Methods: `getEnabledLocales()`, `getLocaleForCountry(code)`, `getMaestroForCountry(code)`
- Cache invalidation on admin updates: `invalidateCache()`
- Error handling: Returns empty/null on DB errors (fail-secure)

**Admin API** (`src/app/api/admin/locales/`):

- GET /api/admin/locales - List all enabled locales
- POST/PUT/DELETE - CRUD for locale configurations
- Audit logging via LocaleConfigService

### 5. ESLint Rule: no-hardcoded-italian

**Purpose**: Prevent hardcoded Italian strings from bypassing translations

**Implementation** (`eslint-local-rules/index.js`):

- Custom rule: `local-rules/no-hardcoded-italian`
- Detects: Italian words (ciao, salva, benvenuto...) + accented characters (àèéìòù) in JSX text
- Severity: `warn` (gradual adoption)
- Bypass: `/* eslint-disable-next-line local-rules/no-hardcoded-italian */`

**Test coverage** (`src/__tests__/eslint-rules/no-hardcoded-italian.test.ts`):

- 10/10 tests passing
- Detects Italian patterns, ignores English/code/expressions

### 6. Static Asset Exclusion (CRITICAL)

**Problem discovered 2026-01-27**: The i18n middleware was incorrectly intercepting static asset requests
and redirecting them to localized paths:

```
GET /logo-brain.png
→ 307 Redirect → /it/logo-brain.png
→ 404 Not Found (file doesn't exist at localized path)
```

This caused ALL images (maestri avatars, coach avatars, logos) to display as broken placeholder icons.

**Root cause**: The matcher pattern `.*\\.(?:png|jpg|jpeg|...)` was supposed to exclude files by extension,
but this pattern doesn't work correctly in Next.js matchers. The lookahead `(?!pattern)` with `.*` inside
has inconsistent behavior.

**Incorrect pattern** (caused the bug):

```typescript
// ❌ BROKEN - specific extension list doesn't work reliably
matcher: ["/((?!api|admin|_next|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)"];
```

**Correct pattern** (fix applied):

```typescript
// ✅ CORRECT - matches ANY file with an extension
// Pattern .*\\..* = "anything.anything" (any path with a dot)
matcher: ["/((?!api|admin|_next|_vercel|monitoring|.*\\..*).*)"]; // proxy.ts
```

**Why `.*\\..*` works**:

- `.*` matches any characters (including path segments)
- `\\.` matches a literal dot
- `.*` matches any extension
- Together: matches `/foo/bar.png`, `/logo.svg`, `/css/style.css`, etc.

**Files affected**:

| File                               | Change                               |
| ---------------------------------- | ------------------------------------ |
| `proxy.ts`                         | Updated matcher pattern              |
| `e2e/smoke/critical-paths.spec.ts` | Added regression test CP-07          |
| `.claude/rules/vercel-deployment`  | Added documentation                  |
| This ADR                           | Documented root cause and prevention |

**Prevention (CI enforcement)**:

E2E test CP-07 verifies static assets return 200 (not 307 redirect):

```typescript
test("CP-07: Static assets load correctly (no i18n redirect)", async ({
  request,
}) => {
  const assets = [
    "/logo-brain.png",
    "/maestri/euclide.webp",
    "/avatars/melissa.webp",
  ];
  for (const asset of assets) {
    const response = await request.get(asset, { maxRedirects: 0 });
    expect(response.status()).toBe(200); // NOT 307
  }
});
```

**Never repeat this bug**:

1. Always use `.*\\..*` pattern to exclude ALL files with extensions
2. Never use specific extension lists like `.*\\.(?:png|jpg|...)`
3. E2E test CP-07 catches regressions automatically
4. Verify with: `curl -sI https://mirrorbuddy.vercel.app/logo-brain.png | head -1`

### 7. Consolidated Middleware Architecture (CRITICAL - 2026-01-27)

**Problem discovered**: Separate middleware chains caused i18n routing to intercept
requests that should NOT be localized (API routes, static files), causing 307 redirects
to non-existent localized paths:

```
GET /api/session → 307 → /fr/api/session → 404
GET /logo-brain.png → 307 → /fr/logo-brain.png → 404
```

**Solution**: Consolidate ALL middleware logic into a single `proxy.ts` file that:

1. Explicitly excludes paths that should NOT be handled by i18n
2. Calls `createIntlMiddleware` from next-intl only for pages that need localization
3. Maintains all existing functionality (auth, CSP, metrics)

**Implementation** (`src/proxy.ts`):

```typescript
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Paths that should NEVER be handled by i18n middleware
const I18N_EXCLUDE_PATHS = [
  "/api", // API routes
  "/admin", // Admin routes (outside [locale])
  "/_next", // Next.js internals
  "/monitoring", // Sentry tunnel
  "/favicon",
  "/icon",
  "/maestri", // Static avatar images
  "/avatars", // Static avatar images
  "/logo", // Logo images
];

// Create the i18n middleware instance
const intlMiddleware = createIntlMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static files entirely (images, fonts, etc.)
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // 2. Only apply i18n for paths that need localization
  if (!shouldSkipI18n(pathname)) {
    const locales = ["it", "en", "fr", "de", "es"];
    const hasLocalePrefix = locales.some(
      (locale) =>
        pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
    );

    // Redirect to localized path if no locale prefix
    if (!hasLocalePrefix) {
      return intlMiddleware(request);
    }
  }

  // 3. Continue with auth, CSP, metrics, etc.
  // ... rest of proxy logic
}
```

**Why consolidation matters**:

| Separate Middleware             | Consolidated Proxy             |
| ------------------------------- | ------------------------------ |
| Multiple files, order-dependent | Single file, explicit control  |
| Easy to break exclusion rules   | Exclusions checked FIRST       |
| next-intl intercepts everything | next-intl only for page routes |
| Hidden in framework behavior    | Visible in code                |

**Key principle**: i18n middleware should ONLY handle paths under `src/app/[locale]/`.
Everything else (API, admin, static) must be excluded explicitly.

### 8. resend Package TypeScript Bug (2026-01-27)

**Problem**: resend@6.7.0-6.9.0 has broken TypeScript types causing build failure:

```
node_modules/resend/dist/index.d.mts(220,15): error TS1005: ';' expected.
```

The bug is in the package source: `react: void 0;` instead of a proper type definition.

**NOT a workaround - proper solution**: Pin to last working version:

```json
{
  "dependencies": {
    "resend": "^6.6.0"
  }
}
```

**Why this is correct**:

1. `skipLibCheck: true` is already set in tsconfig.json (standard practice)
2. The bug is in `.d.mts` file (not `.d.ts`), so skipLibCheck doesn't help
3. `ignoreBuildErrors: true` in next.config is a workaround (ignores ALL type errors)
4. Version pinning is the correct fix for upstream bugs

**Never use `ignoreBuildErrors: true`** - it hides legitimate type errors in YOUR code.

### 9. Single Proxy File Location (CRITICAL - Next.js 16)

**Problem discovered 2026-01-27**: Having TWO proxy.ts files caused Next.js to use the wrong one:

```
/proxy.ts           ← Next.js was using THIS (simple, no path exclusions)
/src/proxy.ts       ← We thought Next.js was using THIS (comprehensive)
```

Result: All API routes and images got 307 redirected to `/it/api/*` and `/it/*.png` → 404.

**Next.js 16 Rule**: Only ONE `proxy.ts` file is supported per project.

From [Next.js documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy):

> "Create a proxy.ts file in the project root, or inside src if applicable,
> so that it is located at the same level as pages or app."

**Correct configuration for MirrorBuddy**:

- App directory: `/src/app/`
- Proxy file: `/src/proxy.ts` (same level as app)
- Root proxy.ts: **DELETED** (must not exist)

**Export requirement**: Must be `export default function proxy()`:

```typescript
// CORRECT - Next.js 16 requires default export
export default function proxy(request: NextRequest) {
  // ...
}

// WRONG - Named export won't work
export function proxy(request: NextRequest) {
  // ...
}
```

**Never create a root `/proxy.ts`** when your app is in `/src/`. Next.js will use the root one and ignore your src version.

**Verification**:

```bash
# Must show ONLY ONE proxy.ts
find . -name "proxy.ts" -not -path "./node_modules/*"
# Expected: ./src/proxy.ts
```

## Consequences

### Positive

- **Type safety**: All translations are type-checked (MessageNamespace, MessageKey)
- **Performance**: Server-side rendering prevents flash of untranslated content
- **Consistency**: Centralized messages prevent duplicated strings
- **Admin control**: Locale configurations editable without redeployment
- **Character authenticity**: Formality rules match historical context + language norms
- **Lint enforcement**: Prevents accidental hardcoded strings

### Negative

- **Message maintenance**: 5 language JSON files to keep in sync (mitigated by TypeScript types)
- **Cookie dependency**: Breaks if cookies disabled (fallback to Accept-Language header)
- **Cache invalidation**: Requires admin to call `invalidateCache()` after locale config updates
- **ESLint strictness**: Teams must update hardcoded strings (but this is design intent)

## Implementation Files

| File                                      | Purpose                                      |
| ----------------------------------------- | -------------------------------------------- |
| `src/proxy.ts`                            | **ONLY** proxy file (Next.js 16 requirement) |
| `src/i18n/routing.ts`                     | next-intl routing configuration              |
| `src/i18n/config.ts`                      | Locale list and defaults                     |
| `messages/{locale}.json`                  | Translation strings (5 files)                |
| `src/i18n/types.ts`                       | Type-safe translation types                  |
| `src/lib/i18n/formality-rules.ts`         | Formal/informal address logic                |
| `src/lib/locale/locale-config-service.ts` | Locale configuration singleton               |
| `prisma/schema/locale.prisma`             | LocaleConfig database schema                 |
| `eslint-local-rules/index.js`             | Custom ESLint rule                           |
| `src/app/api/admin/locales/`              | Admin API routes                             |

**CRITICAL**: Never create `/proxy.ts` at root - only `/src/proxy.ts` exists.

## References

- ADR 0064: Formal/Informal Address for Professors
- ADR 0056: Trial Mode (anonymous locale preference)
- ADR 0015: Database-First Architecture (no localStorage for user data)
- next-intl documentation: https://next-intl-docs.vercel.app/
