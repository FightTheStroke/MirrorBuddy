---
name: 'tdd'
description: 'Start TDD workflow: write failing test, implement, validate'
argument-hint: 'Describe the feature or fix to implement'
agent: 'tdd-executor'
tools: ['search/codebase', 'read', 'terminalLastCommand']
---

Strict TDD (RED-GREEN-REFACTOR) for: ${input:feature}

1. **RED**: Colocated test, Vitest AAA pattern → `npm run test:unit -- {file}` confirms fail
2. **GREEN**: Minimum code to pass. Max 250 lines/file. Follow copilot-instructions.md
3. **VALIDATE**: `./scripts/ci-summary.sh --quick` + `./scripts/ci-summary.sh --unit`
4. **REPORT**: Show test, implementation, results
