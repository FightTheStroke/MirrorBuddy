---
name: 'localize'
description: 'Sync i18n keys across all 5 locales'
agent: 'agent'
tools: ['terminalLastCommand']
---

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->

Synchronize i18n keys across all 5 locales for MirrorBuddy.

**Workflow**:

1. Check status: `npm run i18n:check`
2. If keys missing: `npx tsx scripts/i18n-sync-namespaces.ts --add-missing`
3. Verify complete: `npm run i18n:check`

**Rules**:

- Locales: it (default), en, fr, de, es
- JSON wrapper key convention: `{ "namespace": { ...keys } }`
- Keys: camelCase (ADR 0091)
- Italian text is source of truth
- New keys: add Italian first, then run sync script
