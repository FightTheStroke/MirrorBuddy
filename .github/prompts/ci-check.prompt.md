---
name: 'ci-check'
description: 'Run CI summary check (lint + typecheck + build)'
agent: 'agent'
tools: ['terminalLastCommand']
---

Run the CI summary check for MirrorBuddy. Execute the following command:

```bash
./scripts/ci-summary.sh
```

This runs lint + typecheck + build in compact mode (~10 lines output).

If all checks pass, report "CI PASS" with a summary.
If any check fails, identify the specific failures and suggest fixes.

NEVER run raw `npm run lint`, `npm run typecheck`, or `npm run build` separately.
Always use the ci-summary.sh script for compact, token-efficient output.

Additional modes available:

- `./scripts/ci-summary.sh --quick` — lint + typecheck only (no build)
- `./scripts/ci-summary.sh --full` — includes unit tests
- `./scripts/ci-summary.sh --unit` — unit tests only
