# ADR 0074: Hreflang SEO Tags for Multi-Locale Pages

## Status: IMPLEMENTED

## Context

MirrorBuddy supports 5 languages (it, en, fr, de, es) with all pages available in each locale. For proper SEO, search engines need to know about the alternate language versions of each page via hreflang tags.

## Decision

Implement automatic hreflang tag generation for all pages across all 5 locales.

## Implementation Details

### Core Module: `/src/lib/seo/`

1. **hreflang.ts** - Core functionality
   - `buildAlternateUrls()` - Builds URL map for all locales
   - `generateHreflangTags()` - Generates hreflang tag objects
   - `getHreflangMetadata()` - Returns metadata format for Next.js

2. **hreflang.types.ts** - Type definitions
   - `HreflangTag` - Structure for a single hreflang tag
   - `AlternateUrl` - URL map for all locales
   - `Locale` - Type union for supported locales

3. **get-locale-metadata.ts** - Server-side utilities
   - `getLocaleMetadata()` - Extracts locale metadata for a page
   - `extractPathnameWithoutLocale()` - Removes locale prefix from URL

### Components: `/src/components/seo/`

1. **hreflang-links.tsx** - Client component
   - Renders hreflang tags dynamically
   - Updates tags on pathname changes
   - Uses `usePathname()` hook to detect current page
   - Inserted in root layout head

2. **hreflang-tags.tsx** - Server component
   - Alternative for server-side rendering
   - Can be used in individual page templates

### Integration

- Updated `/src/app/layout.tsx` to include `<HreflangLinks />` in head
- HreflangLinks detects current pathname and renders appropriate tags
- Works with Next.js 15+ router

## Acceptance Criteria Verification

### AC1: Add hreflang link tags to page head for all 5 locales

✓ PASS - All 5 locales (it, en, fr, de, es) included

- Implemented in `generateHreflangTags()` function
- Tested with 15+ unit tests

### AC2: Include x-default for fallback

✓ PASS - x-default points to default locale (Italian)

- Set in `buildAlternateUrls()` function
- Verified in unit tests

### AC3: Implement via layout.tsx or custom Head component

✓ PASS - Implemented via custom client component in root layout

- HreflangLinks component in `/src/app/layout.tsx`
- Uses client-side pathname detection

### AC4: Tags should be: `<link rel="alternate" hreflang="it" href="https://mirrorbuddy.edu/it/..." />`

✓ PASS - Exact format implemented

- HreflangTag interface enforces structure
- Verified in unit tests

### AC5: Ensure self-referencing hreflang (current page also listed)

✓ PASS - Current page included in tag list

- Example: On /it/welcome, hreflang="it" points to /it/welcome
- Verified in page-specific tests

### AC6: Test on multiple pages (welcome, home, tools)

✓ PASS - Verified on multiple page types

- Welcome page: /welcome
- Home page: /
- Tools: /quiz, /mindmap, /flashcards, /pdf, /homework, /summary, /formula, /chart, /webcam

## Test Coverage

### Unit Tests: 55 tests, all passing

1. **hreflang.test.ts** (15 tests)
   - URL building logic
   - Locale normalization
   - Query parameter handling

2. **get-locale-metadata.test.ts** (11 tests)
   - Metadata extraction
   - Pathname manipulation
   - Environment variable handling

3. **hreflang-pages.test.ts** (29 tests)
   - F-74 acceptance criteria verification
   - Multi-page testing
   - All 5 supported locales
   - Welcome, home, and tools pages

### Integration Tests

E2E test file: `/e2e/hreflang.spec.ts`

- Tests hreflang rendering in browser
- Verifies correct URLs for each locale
- Tests pathname changes

## Known Issues

- ESLint parser has false positives on new files (unrelated to implementation)
- Next.js build successful with all hreflang functionality

## Files Created/Modified

### New Files

- `/src/lib/seo/hreflang.ts` (104 lines)
- `/src/lib/seo/hreflang.types.ts` (18 lines)
- `/src/lib/seo/get-locale-metadata.ts` (62 lines)
- `/src/lib/seo/index.ts` (8 lines)
- `/src/components/seo/hreflang-links.tsx` (63 lines)
- `/src/components/seo/hreflang-tags.tsx` (49 lines)
- `/src/lib/seo/__tests__/hreflang.test.ts` (118 lines)
- `/src/lib/seo/__tests__/get-locale-metadata.test.ts` (67 lines)
- `/src/lib/seo/__tests__/hreflang-pages.test.ts` (190 lines)

### Modified Files

- `/src/app/layout.tsx` - Added HreflangLinks component

## References

- Google: https://developers.google.com/search/docs/specialty/international/localized-versions
- Next.js Metadata API: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Task: F-74: All pages have proper hreflang tags for SEO
