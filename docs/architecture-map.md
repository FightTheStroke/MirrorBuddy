# Architecture Map — MirrorBuddy

> Agent-readable dependency map. Read this before cross-domain changes.
> Last updated: 12 February 2026

## Layer Model

```
TYPES         Pure type definitions. No runtime imports.
    |
INFRASTRUCTURE   Logger, DB (Prisma), Auth, Utils, Cache, Constants
    |
HORIZONTAL       Safety, Rate-Limit, Telemetry, Tracing, Resilience, Security, Privacy
    |
DOMAIN           AI, RAG, Conversation, Education, Gamification, Learning-Path,
                 Tools, Tier, Trial, Voice, Notifications, Stripe, Compliance
    |
STATE            Stores (Zustand) — read from Domain, used by Components
    |
PRESENTATION     Components, Hooks, App Routes (pages + API)
```

## Allowed Dependencies (top imports from bottom = VIOLATION)

| Layer          | Can import from                   | NEVER imports from |
| -------------- | --------------------------------- | ------------------ |
| Types          | (nothing)                         | Any runtime module |
| Infrastructure | Types                             | Horizontal, Domain |
| Horizontal     | Infrastructure, Types             | Domain, State, UI  |
| Domain         | Infrastructure, Horizontal, Types | State, UI          |
| State          | Domain, Infrastructure, Types     | UI                 |
| Presentation   | All layers above                  | (leaf layer)       |

## Infrastructure (`src/lib/`)

| Module      | Path               | Purpose                            |
| ----------- | ------------------ | ---------------------------------- |
| db          | `lib/db.ts`        | Prisma client singleton            |
| logger      | `lib/logger/`      | Structured logging (client+server) |
| auth        | `lib/auth/`        | Session, CSRF, SSO, cookies        |
| utils       | `lib/utils.ts`     | cn(), formatDate, helpers          |
| cache       | `lib/cache/`       | In-memory + Redis caching          |
| constants   | `lib/constants/`   | XP rewards, Mirrorbucks, limits    |
| environment | `lib/environment/` | Env var validation                 |
| validation  | `lib/validation/`  | Zod schemas for API input          |

## Horizontal Services (`src/lib/`)

| Module     | Path              | Imported by                           | ADR  |
| ---------- | ----------------- | ------------------------------------- | ---- |
| safety     | `lib/safety/`     | ai, conversation, education, chat API | 0004 |
| rate-limit | `lib/rate-limit/` | API routes                            | 0054 |
| telemetry  | `lib/telemetry/`  | components, API routes                | 0006 |
| tracing    | `lib/tracing/`    | API routes                            | 0076 |
| resilience | `lib/resilience/` | ai providers                          | —    |
| security   | `lib/security/`   | auth, API routes                      | 0080 |
| privacy    | `lib/privacy/`    | rag, conversation                     | 0127 |
| sentry     | `lib/sentry/`     | API middlewares                       | 0070 |

**Safety is read-only**: all domains import from it, nothing writes back into it.

## Domain Services (`src/lib/`)

| Domain        | Key deps                             | ADR  |
| ------------- | ------------------------------------ | ---- |
| ai            | db, logger, safety, tier, resilience | —    |
| rag           | db, logger, privacy                  | 0033 |
| conversation  | logger, tier, ai                     | 0021 |
| education     | ai, rag, db, tier, logger            | 0041 |
| learning-path | ai, db, tier, logger                 | —    |
| gamification  | db, logger, constants                | —    |
| tools         | db, rag, ai, auth, tier, logger      | 0037 |
| tier          | db, logger                           | 0071 |
| trial         | db, logger, tier                     | 0056 |
| voice         | ai, logger                           | 0038 |
| notifications | db, logger                           | 0007 |
| stripe        | db, logger, tier                     | 0119 |
| compliance    | db, logger, auth                     | 0062 |

## High-Impact Modules (change = wide blast radius)

| Module        | Affected domains                          |
| ------------- | ----------------------------------------- |
| `lib/ai/`     | education, learning-path, tools, chat API |
| `lib/rag/`    | education, tools, ai                      |
| `lib/safety/` | ai, conversation, gamification, chat API  |
| `lib/db.ts`   | ALL domains                               |
| `lib/tier/`   | education, tools, learning-path, trial    |
| `lib/auth/`   | API routes, stores, components            |

## Entry Points

| Surface           | Path                     | Key imports                                                  |
| ----------------- | ------------------------ | ------------------------------------------------------------ |
| Chat API          | `app/api/chat/route.ts`  | ai, safety, rag, tier, gamification, education, tools, trial |
| Voice API         | `app/api/voice/`         | ai, voice, auth                                              |
| Admin API         | `app/api/admin/`         | db, auth, tier                                               |
| Conversations API | `app/api/conversations/` | db, validation, auth                                         |
| Main page         | `app/[locale]/page.tsx`  | components, stores                                           |

## Data Layer

| Store             | Path                                    | Reads from domains      |
| ----------------- | --------------------------------------- | ----------------------- |
| conversation-flow | `lib/stores/conversation-flow-store.ts` | auth, notifications     |
| settings          | `lib/stores/settings-store.ts`          | accessibility           |
| progress          | `lib/stores/progress-store.ts`          | gamification, constants |

## Key Invariants

1. **Types are pure** — `src/types/` has zero runtime imports
2. **Safety is horizontal** — never depends on domain services
3. **Stores are one-way** — components read stores, stores don't import components
4. **Server/client split** — modules with `/server` suffix are server-only (tree-shaken)
5. **No circular deps** — tier <-> conversation boundary: tier reads `conversation/tier-memory-config` (config only, no runtime dep)
