---
name: 'review'
description: 'Run comprehensive code review on staged changes'
agent: 'code-reviewer'
tools: ['search/codebase', 'read']
---

Review the current staged changes (or recent commits) for MirrorBuddy.

Run `git diff --staged` (or `git diff HEAD~1` if nothing staged) to see changes.

Check each changed file against:

1. **Security**: OWASP top 10, auth patterns, CSRF, cookie handling
2. **Accessibility**: WCAG 2.1 AA, DSA profile compatibility
3. **Patterns**: pipe() middleware, Zustand state, i18n conventions
4. **Quality**: Max 250 lines/file, no TODO/FIXME, typed properly
5. **Compliance**: No PII leaks, parameterized queries, bias detection

Output a structured review with severity levels and specific fix suggestions.
