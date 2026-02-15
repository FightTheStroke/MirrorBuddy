---
name: 'review'
description: 'Run comprehensive code review on staged changes'
agent: 'code-reviewer'
tools: ['search/codebase', 'read']
---

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->

Review staged changes (or recent commits) for MirrorBuddy.

**Get changes**: `git diff --staged` or `git diff HEAD~1` if nothing staged

**Review criteria**:

1. **Security**: OWASP top 10, auth patterns, CSRF, cookie handling
2. **Accessibility**: WCAG 2.1 AA, DSA profile compatibility
3. **Patterns**: pipe() middleware, Zustand state, i18n conventions
4. **Quality**: Max 250 lines/file, no TODO/FIXME, typed properly
5. **Compliance**: No PII leaks, parameterized queries, bias detection

Output structured review with severity levels and specific fix suggestions.
