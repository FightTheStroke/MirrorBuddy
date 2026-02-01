# API Routes

> Next.js 16 App Router API routes with composable pipe() middleware (ADR 0113)

## Quick Reference

| Key     | Value                                             |
| ------- | ------------------------------------------------- |
| Path    | `src/app/api/`                                    |
| Pattern | `pipe()` composable middleware (ADR 0113)         |
| Auth    | Session cookies (httpOnly, signed)                |
| CSRF    | `withCSRF` middleware + `csrfFetch()` client-side |
| Health  | `GET /api/health`, `GET /api/health/detailed`     |
| ADRs    | 0075 (Cookies), 0078 (CSRF), 0113 (pipe)          |

## Standard Structure

```typescript
// src/app/api/[resource]/route.ts
import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";

export const GET = pipe(
  withSentry("/api/resource"),
  withAuth,
)(async (ctx) => {
  const data = await prisma.resource.findMany({
    where: { userId: ctx.userId },
  });
  return NextResponse.json(data);
});

export const POST = pipe(
  withSentry("/api/resource"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const body = await ctx.req.json();
  const created = await prisma.resource.create({
    data: { ...body, userId: ctx.userId },
  });
  return NextResponse.json(created, { status: 201 });
});
```

## Available Middleware

| Middleware           | Purpose                     | Adds to ctx         |
| -------------------- | --------------------------- | ------------------- |
| `withSentry(path)`   | Error capture + logging     | —                   |
| `withAuth`           | Session auth (cookie)       | `userId`            |
| `withAdmin`          | Admin auth (email list)     | `userId`, `isAdmin` |
| `withCSRF`           | CSRF token validation       | —                   |
| `withRateLimit(cfg)` | Rate limiting               | —                   |
| `withCron`           | Cron job auth (CRON_SECRET) | —                   |

**Middleware order**: `withSentry` first, then `withCSRF`, then `withAuth`/`withAdmin`.

## CSRF Protection

| Endpoint Type                       | Server Middleware    | Client Call              |
| ----------------------------------- | -------------------- | ------------------------ |
| Authenticated POST/PUT/PATCH/DELETE | `withCSRF` in pipe() | `csrfFetch()` required   |
| Public endpoints                    | Not needed           | Optional                 |
| Cron jobs                           | Not needed           | N/A (uses `CRON_SECRET`) |

## Key Routes (210+ Total)

| Route                  | Method   | Purpose                      |
| ---------------------- | -------- | ---------------------------- |
| `/api/chat`            | POST     | Text chat with AI            |
| `/api/chat/stream`     | POST     | SSE streaming chat           |
| `/api/voice/*`         | POST/GET | Voice session management     |
| `/api/tools/stream`    | POST     | Tool execution (SSE)         |
| `/api/materials`       | GET/POST | User materials CRUD          |
| `/api/flashcards`      | GET/POST | FSRS flashcard system        |
| `/api/progress`        | GET      | Learning progress            |
| `/api/health`          | GET      | Load balancer health check   |
| `/api/health/detailed` | GET      | Full system metrics          |
| `/api/metrics`         | GET      | Prometheus format            |
| `/api/admin/*`         | Various  | Admin-only routes            |
| `/api/cron/*`          | POST     | Scheduled jobs (CRON_SECRET) |

## ESLint Enforcement

| Rule                           | Level | Catches                                |
| ------------------------------ | ----- | -------------------------------------- |
| `require-pipe-handler`         | warn  | `export async function` in route files |
| `require-csrf-mutating-routes` | warn  | Missing `withCSRF` on POST/PUT/DELETE  |

## Error Responses

| Status  | Use Case                                  |
| ------- | ----------------------------------------- |
| 200/201 | Success (GET/PUT) / Created (POST)        |
| 400/401 | Bad request (validation) / Unauthorized   |
| 403/404 | Forbidden (CSRF, admin check) / Not found |
| 500     | Server error                              |

## See Also

- `docs/adr/0113-composable-api-handler-pattern.md` — Architecture decision
- `.claude/rules/cookies.md` — Cookie security and auth patterns
- `docs/adr/0075-cookie-auth.md` — Session auth architecture
