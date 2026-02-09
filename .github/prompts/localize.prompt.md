---
name: 'localize'
description: 'Sync i18n keys across all 5 locales'
agent: 'agent'
tools: ['terminalLastCommand']
---

Synchronize internationalization keys across all 5 locales for MirrorBuddy.

## Steps

1. **Check current status**:

   ```bash
   npm run i18n:check
   ```

2. **If keys are missing**, sync them:

   ```bash
   npx tsx scripts/i18n-sync-namespaces.ts --add-missing
   ```

3. **Verify all locales are complete**:
   ```bash
   npm run i18n:check
   ```

## Rules

- Locales: it (default), en, fr, de, es
- All JSON files use wrapper key convention: `{ "namespace": { ...keys } }`
- Keys must be camelCase (ADR 0091)
- Italian text is always the source of truth
- New keys: add Italian first, then run sync script
