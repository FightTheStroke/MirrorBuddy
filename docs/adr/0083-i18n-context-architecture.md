# ADR 0083: i18n Context Architecture

**Status**: Accepted
**Date**: 2026-01-27
**Decision Makers**: Engineering Team
**Related**: ADR 0082 (i18n Namespace Structure), ADR 0066 (i18n Architecture)

## Context

MirrorBuddy's i18n system uses `next-intl` with `NextIntlClientProvider`. This provider must wrap any component that uses translation hooks (`useTranslations`, `useLocale`, etc.).

A critical bug was discovered in production where the `A11yInstantAccess` component (accessibility floating button) crashed with:

```
Error: [next-intl] NextIntlClientProvider was not found.
```

### Root Cause

The Next.js App Router layout hierarchy is:

```
src/app/layout.tsx          ← Root layout (HTML, body)
  └── Providers             ← Theme, accessibility, consent
      └── [locale]/layout.tsx  ← LocaleProvider (NextIntlClientProvider)
          └── Page content
```

`A11yInstantAccess` was rendered inside `Providers` (at the root level), but `NextIntlClientProvider` is only mounted in `[locale]/layout.tsx`. This means:

1. `Providers` renders BEFORE `LocaleProvider`
2. Any component in `Providers` using `useTranslations()` crashes
3. The error only manifested in production (SSR) because development mode is more forgiving

### Components Affected

Components that use i18n hooks but were incorrectly placed:

| Component            | Hook Used                          | Correct Location      |
| -------------------- | ---------------------------------- | --------------------- |
| `A11yFloatingButton` | `useTranslations('accessibility')` | Inside LocaleProvider |
| `A11yQuickPanel`     | `useTranslations('accessibility')` | Inside LocaleProvider |
| `A11yInstantAccess`  | (renders above two)                | Inside LocaleProvider |

## Decision

### 1. Move i18n-Dependent Components

Components requiring `useTranslations` or other next-intl hooks MUST be rendered inside `LocaleProvider` (i.e., within `[locale]/layout.tsx` or its children).

**Before (broken):**

```tsx
// src/components/providers.tsx
export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <A11yInstantAccess /> {/* ❌ CRASH: No i18n context */}
        {children}
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
```

**After (correct):**

```tsx
// src/components/providers.tsx
export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        {/* A11yInstantAccess moved to [locale]/layout.tsx */}
        {children}
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

// src/app/[locale]/layout.tsx
export default async function LocaleLayout({ children }) {
  const messages = await getMessages();
  return (
    <LocaleProvider locale={locale} messages={messages}>
      <A11yInstantAccess /> {/* ✅ Inside i18n context */}
      {children}
    </LocaleProvider>
  );
}
```

### 2. ESLint Rule Enforcement

A custom ESLint rule `no-i18n-in-providers` prevents importing or using next-intl hooks in files that run outside LocaleProvider context.

**Forbidden hooks:**

- `useTranslations`
- `useLocale`
- `useNow`
- `useTimeZone`
- `useFormatter`
- `useMessages`

**Restricted files:**

- `src/components/providers.tsx`
- `src/app/layout.tsx` (root layout, not `[locale]/layout.tsx`)

### 3. Documentation in Components

i18n-dependent components must include a comment documenting the context requirement:

```tsx
/**
 * IMPORTANT: This component must be rendered inside LocaleProvider
 * (i.e., under [locale]/layout.tsx) because it uses useTranslations.
 * Do NOT render this in the root Providers component.
 */
```

## Implementation

### ESLint Rule

Location: `eslint-local-rules/index.js`

```javascript
const noI18nInProviders = {
  meta: {
    type: "problem",
    messages: {
      noI18nInProviders:
        "next-intl hooks cannot be used in providers.tsx or root layout...",
    },
  },
  create(context) {
    const filename = context.getFilename();
    const isRestrictedFile =
      filename.includes("providers.tsx") ||
      (filename.includes("layout.tsx") && !filename.includes("[locale]"));

    if (!isRestrictedFile) return {};

    // Check imports and calls of forbidden hooks
  },
};
```

### ESLint Configuration

Location: `eslint.config.mjs`

```javascript
{
  files: ["src/components/providers.tsx", "src/app/layout.tsx"],
  plugins: { "local-rules": { rules: localRules.rules } },
  rules: { "local-rules/no-i18n-in-providers": "error" },
}
```

## Consequences

### Positive

- **Prevents Silent Failures**: ESLint catches i18n context errors at build time
- **Clear Architecture**: Components have explicit context requirements
- **Production Stability**: No more SSR crashes from missing i18n context

### Negative

- **Component Placement Constraints**: Some components must be placed deeper in the tree
- **Slight Complexity**: Need to understand provider hierarchy

### Neutral

- **No Performance Impact**: Components still render the same way, just in different location

## Verification

### Manual Testing

```bash
npm run dev
# Visit /it/chat and /en/chat
# Verify A11y floating button appears and works in both locales
```

### Automated Testing

```bash
npm run lint           # ESLint rule catches violations
npm run typecheck      # TypeScript validates imports
npm run build          # SSR build succeeds
npm run test           # E2E tests verify A11y components
```

### Rule Validation

Create a test file to verify the ESLint rule triggers:

```tsx
// If someone adds useTranslations to providers.tsx, lint will fail:
// error: next-intl hooks cannot be used in providers.tsx...
```

## References

- `src/components/providers.tsx` - Root providers (no i18n)
- `src/app/[locale]/layout.tsx` - LocaleProvider mounting point
- `src/components/accessibility/a11y-instant-access.tsx` - Fixed component
- `eslint-local-rules/index.js` - ESLint rule implementation
- `docs/adr/0082-i18n-namespace-structure.md` - i18n file structure
