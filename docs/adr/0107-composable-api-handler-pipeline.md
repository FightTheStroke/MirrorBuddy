# ADR 0107: Composable API Handler Pipeline

Status: Accepted | Date: 01 Feb 2026 | Plan: 113

## Context

MirrorBuddy has 205 API routes with ~5000 lines of repeated boilerplate (validateAdminAuth + requireCSRF + try/catch + error response formatting). Each route file duplicated 15-30 lines of identical auth/error/logging code.

## Decision

Composable pipe() middleware pipeline in `src/lib/api/pipe.ts`. Routes compose middlewares: `pipe(withSentry, withCSRF, withAdmin)(handler)`. Replaces inline validateAuth/validateAdminAuth/requireCSRF/try-catch.

References: ADR 0075 (cookies), ADR 0077 (CSRF), ADR 0080 (auth)

## Consequences

- Positive: ~70% boilerplate reduction, consistent error handling, Sentry integration
- Negative: Learning curve for new middleware pattern

## Enforcement

- Rule: ESLint local-rules/require-pipe-handler (planned)
- Check: `grep -rn 'validateAuth()' src/app/api/ --include='route.ts' | wc -l`
