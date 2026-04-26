# i18n Messages — MirrorBuddy

next-intl message catalogs. See root + `.claude/rules/i18n.md` (authoritative).

## Locales (5 — day-1 parity required)

`it` (default) | `en` | `fr` | `de` | `es`

## CRITICAL: Wrapper key (ADR 0104)

EVERY JSON file MUST wrap content under single key matching filename:

```json
// messages/it/chat.json
{
  "chat": {
    "title": "Chat",
    "placeholder": "Scrivi..."
  }
}
```

Missing wrapper = namespace collision via `Object.assign()` → 98 ESLint warnings + 37 E2E failures (past incident).

## Key rules

- camelCase only (ADR 0091). ESLint `no-kebab-case-i18n-keys` enforces.
- Interpolation: `"{count, plural, one {# item} other {# items}}"` (ICU MessageFormat).
- No HTML tags in values. Use `<Rich>` components in React if markup needed.
- Keys stable across releases. Rename = breaking change for external consumers.

## Add new keys (workflow)

```bash
# 1. Add to messages/it/<ns>.json (Italian first — source of truth)
# 2. Sync placeholders to all locales
npx tsx scripts/i18n-sync-namespaces.ts --add-missing
# 3. Translate placeholder values in en/fr/de/es
# 4. Verify parity
npm run i18n:check
```

Or use `/localize` skill for bulk translation.

## Formal address (ADR 0064)

Pre-1900 historical figures use Lei/Sie/Vous. Set `FORMAL_PROFESSORS` in `src/lib/greeting/templates/index.ts`.

## Namespaces (19+)

`common, auth, admin, chat, home, tools, settings, compliance, consent, education, navigation, errors, welcome, metadata, pricing, marketing, achievements, maintenance, voice, analytics, waitlist`.

New namespace → add file to all 5 locales + register in `src/i18n/`.
