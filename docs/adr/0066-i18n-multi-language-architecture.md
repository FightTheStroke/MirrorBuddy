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

| File                                      | Purpose                                 |
| ----------------------------------------- | --------------------------------------- |
| `src/i18n/routing.ts`                     | next-intl routing configuration         |
| `src/i18n/config.ts`                      | Locale list and defaults                |
| `middleware.ts`                           | Locale detection and routing middleware |
| `messages/{locale}.json`                  | Translation strings (5 files)           |
| `src/i18n/types.ts`                       | Type-safe translation types             |
| `src/lib/i18n/formality-rules.ts`         | Formal/informal address logic           |
| `src/lib/locale/locale-config-service.ts` | Locale configuration singleton          |
| `prisma/schema/locale.prisma`             | LocaleConfig database schema            |
| `eslint-local-rules/index.js`             | Custom ESLint rule                      |
| `src/app/api/admin/locales/`              | Admin API routes                        |

## References

- ADR 0064: Formal/Informal Address for Professors
- ADR 0056: Trial Mode (anonymous locale preference)
- ADR 0015: Database-First Architecture (no localStorage for user data)
- next-intl documentation: https://next-intl-docs.vercel.app/
