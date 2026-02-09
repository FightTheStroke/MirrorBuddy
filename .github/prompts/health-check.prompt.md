---
name: 'health-check'
description: 'Run full project health triage (build + debt + compliance + i18n + git)'
agent: 'agent'
tools: ['terminalLastCommand']
---

Run a full project health check for MirrorBuddy:

```bash
./scripts/health-check.sh
```

This provides a single triage output (~6 lines) covering:

- Build status
- Technical debt
- Compliance
- i18n sync
- Git status

If issues are found, drill down with:

```bash
./scripts/health-check.sh --drill ci      # CI details
./scripts/health-check.sh --drill debt    # Technical debt
./scripts/health-check.sh --drill i18n    # i18n issues
./scripts/health-check.sh --drill comp    # Compliance
./scripts/health-check.sh --drill migrations  # DB migration status
```

Report the health status and any items needing attention.
