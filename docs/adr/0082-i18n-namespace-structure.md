# ADR 0082: i18n Namespace-Based Structure

**Status**: Accepted
**Date**: 2026-01-26
**Decision Makers**: Engineering Team
**Related**: ADR 0080 (i18n Implementation Merge Risks)

## Context

MirrorBuddy's internationalization used monolithic translation files (`messages/{locale}.json`) with approximately:

- 137KB per file
- 3,071 translation keys
- 41 top-level namespaces

This structure caused several issues:

1. **Maintenance Difficulty**: Finding and updating translations in large files was error-prone
2. **Merge Conflicts**: Multiple developers editing the same large file led to frequent conflicts
3. **Code Splitting**: Unable to lazy-load translations for specific features
4. **Key Discovery**: Hard to identify which keys belonged to which feature
5. **Translation Management**: Translators struggled with 3000+ keys in a single file

## Decision

Split translations into namespace-based structure with 12 files per locale.

### Target Structure

```
messages/
├── it/
│   ├── common.json       # Global UI elements (save, cancel, loading)
│   ├── auth.json         # Login, register, invite
│   ├── admin.json        # Admin dashboard, parent dashboard
│   ├── chat.json         # Chat interface, conversation, voice
│   ├── tools.json        # All tools (mindmap, quiz, flashcards)
│   ├── settings.json     # User settings, preferences, accessibility
│   ├── compliance.json   # Privacy, terms, AI transparency, contact
│   ├── education.json    # Knowledge hub, coaches, maestros
│   ├── navigation.json   # Menus, sidebar, breadcrumbs
│   ├── errors.json       # Error messages, 404, validation
│   ├── welcome.json      # Home page, onboarding
│   └── metadata.json     # Page titles, SEO descriptions
├── en/
│   └── ... (same structure)
├── de/
│   └── ... (same structure)
├── es/
│   └── ... (same structure)
└── fr/
    └── ... (same structure)
```

### Namespace Mapping

Original 41 top-level keys mapped to 12 namespaces:

| Namespace  | Original Keys                                                                              | Approximate Key Count |
| ---------- | ------------------------------------------------------------------------------------------ | --------------------- |
| common     | common, ui, status                                                                         | ~135                  |
| auth       | auth, invite                                                                               | ~199                  |
| admin      | admin, dashboard, parentDashboard                                                          | ~763                  |
| chat       | chat, conversation, session, voice, typing                                                 | ~546                  |
| tools      | tools, astuccio, zaino, studyKit                                                           | ~673                  |
| settings   | settings, profile, accessibility, consent, telemetry, ambientAudio, scheduler, googleDrive | ~1,511                |
| compliance | compliance, aiTransparency, legal, contact                                                 | ~1,689                |
| education  | education, coaches, supporti, maestros                                                     | ~1,231                |
| navigation | navigation                                                                                 | ~72                   |
| errors     | errors, not-found, validation                                                              | ~99                   |
| welcome    | welcome, home, onboarding                                                                  | ~742                  |
| metadata   | metadata                                                                                   | ~116                  |

### Loading Strategy

`src/i18n/request.ts` loads all namespaces in parallel and merges them:

```typescript
const namespacePromises = NAMESPACES.map(async (ns) => {
  const data = await loadNamespace(locale, ns);
  return data;
});

const namespaceResults = await Promise.all(namespacePromises);
const messages = Object.assign({}, ...namespaceResults);
```

The original key structure is preserved within each namespace file, so existing translation usage (`t('home.appTitle')`) continues to work without changes.

## Consequences

### Positive

- **Easier Maintenance**: Smaller files (~3-32KB) are easier to navigate
- **Reduced Merge Conflicts**: Different features can be edited independently
- **Clear Ownership**: Each namespace maps to specific features
- **Future Code Splitting**: Can lazy-load namespaces as needed
- **Better Translation Workflow**: Translators can focus on specific features

### Negative

- **More Files**: 12 files per locale instead of 1 (60 total vs 5)
- **Initial Migration**: One-time effort to split and update imports

### Neutral

- **No API Changes**: Existing `useTranslations()` calls work unchanged
- **Runtime Behavior**: All namespaces still loaded together (for now)

## Migration

### Split Script

```bash
npx tsx scripts/i18n-split.ts
```

Creates namespace files from monolithic JSON. Validates all keys are preserved.

### Sync Script

```bash
npx tsx scripts/i18n-sync-namespaces.ts
```

Ensures all locales have the same keys as Italian (reference). Missing keys are marked with `[TRANSLATE]` prefix.

### Test Updates

Tests that imported `messages/{locale}.json` were updated to import specific namespace files.

## Verification

After migration:

```bash
npm run lint && npm run typecheck && npm run build
npm run test:unit -- i18n
npx tsx scripts/i18n-sync-namespaces.ts  # Should show all OK
```

## References

- `scripts/i18n-split.ts` - Split script
- `scripts/i18n-sync-namespaces.ts` - Sync script
- `src/i18n/request.ts` - Namespace loading configuration
- `docs/i18n/CONTRIBUTING.md` - Translation contribution guide
