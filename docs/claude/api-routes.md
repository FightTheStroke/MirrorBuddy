# API Routes

> Next.js 16 App Router API routes with session-based auth and CSRF protection

## Quick Reference

| Key    | Value                                         |
| ------ | --------------------------------------------- |
| Path   | `src/app/api/`                                |
| Auth   | Session cookies (httpOnly, signed)            |
| CSRF   | `requireCSRF()` + `csrfFetch()`               |
| Health | `GET /api/health`, `GET /api/health/detailed` |
| ADRs   | 0075 (Cookies)                                |

## Standard Structure

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/csrf";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await validateAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await prisma.resource.findMany({
    where: { userId: session.userId },
  });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  // CSRF check BEFORE auth (important!)
  const csrfValid = await requireCSRF(request);
  if (!csrfValid)
    return NextResponse.json({ error: "Invalid CSRF" }, { status: 403 });

  const session = await validateAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const created = await prisma.resource.create({
    data: { ...body, userId: session.userId },
  });
  return NextResponse.json(created, { status: 201 });
}
```

## CSRF Protection

| Endpoint Type                       | Server Check             | Client Call              |
| ----------------------------------- | ------------------------ | ------------------------ |
| Authenticated POST/PUT/PATCH/DELETE | `requireCSRF()` required | `csrfFetch()` required   |
| Public endpoints                    | Not needed               | Optional                 |
| Cron jobs                           | Not needed               | N/A (uses `CRON_SECRET`) |

**Order**: CSRF check -> Auth check -> Business logic

## Key Routes (50+ Total)

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

## Error Responses

| Status  | Use Case                                  |
| ------- | ----------------------------------------- |
| 200/201 | Success (GET/PUT) / Created (POST)        |
| 400/401 | Bad request (validation) / Unauthorized   |
| 403/404 | Forbidden (CSRF, admin check) / Not found |
| 500     | Server error                              |

## See Also

- `.claude/rules/api-patterns.md` — API route patterns
- `.claude/rules/cookies.md` — Cookie security and auth patterns
- `docs/adr/0075-cookie-auth.md` — Session auth architecture
