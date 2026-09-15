# Contributing to MirrorBuddy

Thank you for your interest in contributing to MirrorBuddy!

## How to Contribute

### Reporting Bugs

1. Open an [Issue](https://github.com/FightTheStroke/MirrorBuddy/issues)
2. Describe the problem in detail
3. Include steps to reproduce the bug

### Proposing Features

1. Open an Issue with the `enhancement` tag
2. Describe the feature and its value
3. Discuss with maintainers before implementing

### Pull Requests

**MANDATORY:** All PRs must follow the [Execution Checklist](docs/EXECUTION-CHECKLIST.md). PRs that do not complete this checklist will be rejected without review.

1. Fork the repository
2. Create a branch: `git checkout -b feature/feature-name`
3. **Create and get approval for an execution plan** before implementing
4. Make your changes (only what's in the approved plan)
5. Complete the [Execution Checklist](docs/EXECUTION-CHECKLIST.md)
6. Verify: `npm run ci:summary`
7. Commit: `git commit -m "feat: description"`
8. Push: `git push origin feature/feature-name`
9. Open a Pull Request using the PR template

## Guidelines

### Code

- TypeScript strict mode
- ESLint with zero warnings (includes 14 custom rules for security, accessibility, privacy, and i18n)
- Tests for new features (80% coverage on business logic, 100% on critical paths)
- Comments in English
- Run `npm run test:unit -- --reporter=dot` before every commit

### Automated Enforcement (Pre-commit Hooks)

The following checks run automatically on every commit and **will block** if they fail:

- **Secrets scanning** — Prevents committing API keys, tokens, or credentials
- **i18n validation** — Ensures no hardcoded Italian text, verifies locale file sync
- **CSP validation** — Blocks root `proxy.ts` or `middleware.ts` creation
- **Mobile regression patterns** — Catches patterns that break Capacitor builds
- **Smart test runner** — Runs tests related to changed files

### Release Verification

Run `npm run release:gate` from the workspace root with the supported Node/pnpm
versions and an isolated test database. Keep the test database and browser
environment consistent across checks; never point browser fixtures at production.
The command prints a private evidence directory outside the source checkout.

To reuse that directory, run
`npm run release:gate -- --evidence-dir /absolute/private/evidence-directory`.
Current policy, dependency advisories, unit tests, and browser tests are checked
afresh. Each test suite runs once per gate; collection does not repeat it. This avoids
assuming every current or future test is isolated from mutable services.
Builds may be reused only when their pre-release execution receipts match
the source revision, complete working tree, local environment inputs, runtime,
command scope, native report hashes, and relevant application build. Changed or
incomplete evidence causes the required check to run again, not a silent pass.
Only shell/npm launcher bookkeeping is excluded from the environment comparison.
Policy and advisory receipts expire after one hour; the gate refreshes them after
the long-running tests so collection cannot silently present an old audit as current.

`npm run release:evidence -- /absolute/private/evidence-directory` only collects
existing complete receipts; it never runs tests, installs packages, or invents
missing results. Native reports retain actual skipped/flaky counts and enforce
the existing 80% coverage and high-severity audit limits. Hashed native discovery
inventories require complete declared test files, case counts, browser projects,
and canonical business-coverage paths; focused `.only` runs are rejected.
Keep receipts private.
Tagged CI execution summaries are separate and cannot authorize local test reuse.

Automated verification is not deployment approval or proof of live behavior.
Complete the manual locale/service checks and production smoke verification
before closing release issues. The existing detailed manual checklist is in
[`docs-archive/operations/RELEASE-CHECKLIST.md`](docs-archive/operations/RELEASE-CHECKLIST.md).

### Accessibility

This project was born for inclusion. Every contribution MUST:

- Be keyboard accessible
- Have sufficient contrast (WCAG AA)
- Support screen readers
- Not rely on color alone

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `style:` formatting
- `refactor:` refactoring
- `test:` adding tests
- `chore:` maintenance

## Contact

- **Email**: roberdan@fightthestroke.org
- **Organization**: [FightTheStroke](https://fightthestroke.org)

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
