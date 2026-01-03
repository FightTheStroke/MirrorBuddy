# Contributing to MirrorBuddy

Thank you for your interest in contributing to MirrorBuddy!

## How to Contribute

### Reporting Bugs
1. Open an [Issue](https://github.com/Roberdan/MirrorBuddy/issues)
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
6. Verify: `npm run lint && npm run typecheck && npm run build`
7. Commit: `git commit -m "feat: description"`
8. Push: `git push origin feature/feature-name`
9. Open a Pull Request using the PR template

## Guidelines

### Code
- TypeScript strict mode
- ESLint with zero warnings
- Tests for new features
- Comments in English

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

By contributing, you agree that your code will be released under the MIT license.
