---
name: 'health-check'
description: 'Run full project health triage (build + debt + compliance + i18n + git)'
agent: 'agent'
tools: ['terminalLastCommand']
---

Run full health check: `./scripts/health-check.sh`

Output (~6 lines): Build | Debt | Compliance | i18n | Git status.

Drill down: `./scripts/health-check.sh --drill {ci|debt|i18n|comp|migrations}`

Report health status and items needing attention.
