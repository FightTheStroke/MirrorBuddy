# Change Management Policy

> SOC 2 Trust Service Criteria: CC8.1
> Last Updated: 2026-02-06
> Owner: Engineering Lead

## 1. Code Review Requirements

- All changes require pull request with at least 1 approval
- CI pipeline must pass before merge (lint, typecheck, build, tests)
- Security-sensitive changes require additional review from security lead
- Reference: ADR 0099 (CI/CD Pipeline Gates)

## 2. CI/CD Pipeline Gates

### Pre-Merge (GitHub Actions)

1. TypeScript strict compilation (`tsc --noEmit`)
2. ESLint with zero warnings (`--max-warnings 0`)
3. Unit tests (Vitest)
4. E2E tests (Playwright)
5. Secrets scanning (custom hook)
6. Build verification (`next build`)

### Post-Merge (Vercel)

1. Preview deployment for PRs
2. Production deployment on main branch merge
3. Automatic rollback if build fails

## 3. Deployment Approval

- Preview deployments: automatic on PR creation
- Production deployments: automatic on merge to main
- Hotfixes: fast-track PR with "hotfix" label, minimum 1 review
- Database migrations: require explicit approval + rollback plan

## 4. Rollback Procedures

- Vercel instant rollback to previous deployment
- Database: migration rollback via `prisma migrate resolve`
- Feature flags: environment variable toggle for new features
- Incident trigger: any S0/S1 incident triggers immediate rollback

## 5. Version Control

- Git with conventional commits (`feat:`, `fix:`, `chore:`)
- Branch protection on `main`: require PR, require CI pass
- Semantic versioning (MAJOR.MINOR.PATCH)
- CHANGELOG.md updated with every release

## 6. Change Classification

| Type    | Review | CI  | Staging | Approval |
| ------- | ------ | --- | ------- | -------- |
| Feature | 1+     | Yes | Preview | Standard |
| Hotfix  | 1      | Yes | Preview | Fast     |
| Docs    | 1      | Yes | N/A     | Standard |
| Infra   | 2      | Yes | Preview | Security |
