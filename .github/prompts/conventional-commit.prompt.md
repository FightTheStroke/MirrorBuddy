---
name: 'commit'
description: 'Create a conventional commit with proper format'
argument-hint: 'Describe what changed'
agent: 'agent'
tools: ['terminalLastCommand']
---

Create a conventional commit for MirrorBuddy following these rules:

1. **Check status**: Run `git status` and `git diff --staged` to see what's changed
2. **Format**: `{type}({scope}): {description}`
   - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`
   - Scope: affected area (e.g., `api`, `auth`, `tier`, `i18n`, `a11y`)
   - Description: imperative mood, lowercase, no period
3. **Validate before commit**:
   ```bash
   ./scripts/ci-summary.sh --quick
   ```
4. **Commit**: Create the commit with the conventional message

Examples:

- `feat(tier): add Pro tier voice limit enforcement`
- `fix(auth): prevent CSRF bypass on admin mutations`
- `docs(compliance): update DPIA for new data processor`
- `refactor(admin): migrate user routes to pipe() middleware`

User's request: ${input:description}
