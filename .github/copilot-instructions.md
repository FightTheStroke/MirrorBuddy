# Copilot Instructions — MirrorBuddy

## Language

- **Code, comments, documentation, commit messages**: ALWAYS English
- **UI text**: Localized via next-intl (5 locales: it/en/fr/de/es)

## Core Rules

1. **Minimum complexity**: Only what's requested. No over-engineering.
2. **Max 250 lines/file**: Split if exceeds. No exceptions.
3. **Tests first**: Write failing test, then implement, then pass (TDD).
4. **No workarounds**: No TODO, FIXME, @ts-ignore, `any` casts.
5. **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:` prefixes.

## TypeScript/React Style

- ESLint + Prettier, semicolons, single quotes, max 100 chars
- `const` over `let`, `async/await` over `.then()`
- Named imports, no default exports (unless Next.js page/layout)
- `interface` over `type` for object shapes
- Props interface declared above component
- Colocated `.test.ts` files, AAA pattern (Arrange/Act/Assert)

## Architecture Constraints

- **Database**: PostgreSQL + Prisma. Parameterized queries only.
- **State**: Zustand + REST. NO localStorage for user data.
- **Auth**: Session-based `validateAuth()`. Admin via `ADMIN_EMAIL`.
- **AI**: Azure OpenAI (primary), Ollama (fallback). Config in `src/lib/ai/providers.ts`.
- **Path aliases**: `@/lib/...`, `@/components/...`, `@/types`
- **i18n**: next-intl, 5 locales. See `.claude/rules/i18n.md`.

## Quality Standards

- **Testing**: 80% business logic, 100% critical paths
- **Accessibility**: WCAG 2.1 AA, 4.5:1 contrast, keyboard nav, screen readers
- **Security**: Parameterized queries, CSP headers, env vars for secrets, RBAC
- **API**: REST, `/api/v1/`, paginate lists, rate limiting

## CSP — CRITICAL

`src/proxy.ts` (CSP header) + `src/components/providers.tsx` (nonces).
Before modifying CSP: `npm run test:unit -- csp-validation`.
"Caricamento..." forever = CSP blocking a resource.

## Guardrails

- Avatar images: WebP format
- EventSource: always call `.close()` on cleanup
- Heavy dependencies: lazy-load (dynamic import)
- Database: no N+1 queries, use `$transaction` for batch ops
- NO localStorage for user data (ADR 0015)

## Verification

```bash
npm run ci:summary       # lint + typecheck + build (preferred)
npm run ci:summary:full  # + unit tests
npm run test:unit        # Vitest unit tests
npm run test             # Playwright E2E (full suite)
```

## File Organization

- Types: `src/types/index.ts`
- Safety filters: `src/lib/safety/`
- Maestro configs: `src/data/maestri/`
- Stores: `src/lib/stores/`
- PDF generation: `src/lib/pdf-generator/`
- RAG/embeddings: `src/lib/rag/`
- Tier logic: `src/lib/tier/`
