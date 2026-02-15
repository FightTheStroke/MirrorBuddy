---
name: 'commit'
description: 'Create a conventional commit with proper format'
argument-hint: 'Describe what changed'
agent: 'agent'
tools: ['terminalLastCommand']
---

Conventional commit for: ${input:description}

**Format**: `{type}({scope}): {description}` — imperative, lowercase, no period
**Types**: `feat|fix|chore|docs|refactor|test|perf|style`
**Scopes**: `api|auth|tier|i18n|a11y|admin|rag|...`

1. `git status && git diff --staged` — check changes
2. `./scripts/ci-summary.sh --quick` — validate
3. Commit with conventional message
