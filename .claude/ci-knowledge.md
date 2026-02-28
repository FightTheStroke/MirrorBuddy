# CI Knowledge — MirrorBuddy

<!-- Auto-updated by plan-post-mortem Check 9. Max 50 lines. -->
<!-- Source: PR review analysis (PRs #3-#8). Last: 28 Feb 2026 -->

## Type Safety (12+)

- Use exact Prisma field names: `profile.name` NOT `profileName`
- Query by correct FK: `conversationId` NOT `sessionId`
- Pass `options.model` through — don't drop downstream params
- Empty arrays NOT valid defaults when API expects populated data

## Security & Privacy (8+)

- Crisis regex: restrict to self-harm (`mi faccio`), exclude threats (`ti faccio`)
- NEVER log cookie values — log `"enabled"/"disabled"` only
- Gate store sync on 401 — skip hydration for guest only
- ReDoS: validate regex before deploy; rate limit all public endpoints

## Accessibility WCAG 2.1 AA (6+)

- Semantic HTML: `<button>` not `<div onClick>`, `<nav>` not `<div role="navigation">`
- All images: alt text (decorative: `alt=""`)
- 4.5:1 contrast minimum; test 200% text resize
- 7 DSA neurodiversity profiles must work

## i18n (10+)

- ALL user-facing text through message keys — zero hardcoded strings
- 5 languages: en, it, es, fr, de (Italian: always formal)
- Error messages localized; pre-commit hook validates
- Country-specific legal text (GDPR per country)

## Database (4+)

- Schema changes MUST have Prisma migration
- VarChar limits on all string columns; indexes on queried columns
- Run `npx prisma generate` + `npx prisma db push` before commit

## API Contracts (5+)

- Fetch real data — never return empty arrays as placeholder
- Skip zero-percent buckets in A/B range calculation
- Request/response shapes must match Prisma types exactly

## CI Pipeline

- ESLint: 14 custom rules (0 warnings); TypeScript strict (no `any`)
- Vitest 80% business logic; Playwright 229 E2E tests
- LLM safety tests + axe-core WCAG AA enforcement
