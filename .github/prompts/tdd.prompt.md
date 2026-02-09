---
name: 'tdd'
description: 'Start TDD workflow: write failing test, implement, validate'
argument-hint: 'Describe the feature or fix to implement'
agent: 'tdd-executor'
tools: ['search/codebase', 'read', 'terminalLastCommand']
---

Implement the following using strict TDD (RED-GREEN-REFACTOR):

## Feature/Fix: ${input:feature}

### Step 1: RED — Write Failing Test

- Create test colocated with source file
- Use Vitest: `describe`, `it`, `expect`
- AAA pattern (Arrange / Act / Assert)
- Run test to confirm it fails: `npm run test:unit -- {test-file}`

### Step 2: GREEN — Minimum Implementation

- Write the minimum code to make the test pass
- Max 250 lines per file
- Follow project conventions (see .github/copilot-instructions.md)

### Step 3: Validate

```bash
./scripts/ci-summary.sh --quick  # lint + typecheck
./scripts/ci-summary.sh --unit   # all unit tests pass
```

### Step 4: Report

Show the test file, implementation, and validation results.
