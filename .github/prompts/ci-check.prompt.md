---
name: 'ci-check'
description: 'Run CI summary check (lint + typecheck + build)'
agent: 'agent'
tools: ['terminalLastCommand']
---

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->

Execute CI summary check for MirrorBuddy:

```bash
./scripts/ci-summary.sh
```

**Modes**:

- Default: lint + typecheck + build (~10 lines)
- `--quick`: lint + typecheck only (no build)
- `--full`: includes unit tests
- `--unit`: unit tests only

**Output**:

- All pass: "CI PASS" + summary
- Failures: identify specific failures, suggest fixes

**NEVER** run raw `npm run lint|typecheck|build` separately. Always use ci-summary.sh for token efficiency.
