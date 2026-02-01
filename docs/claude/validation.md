# Validation

> Centralized Zod validation schemas for all API inputs with reusable base schemas and middleware.

## Quick Reference

| Key       | Value                                                       |
| --------- | ----------------------------------------------------------- |
| Path      | `src/lib/validation/`                                       |
| Schemas   | `src/lib/validation/schemas/`                               |
| Framework | Zod                                                         |
| Import    | `import { validateJsonRequest, z } from '@/lib/validation'` |

## Architecture

Three layers: **common schemas** (reusable primitives), **domain schemas** (per-feature), and **middleware** (Next.js integration).

Common schemas (`common.ts`) define reusable validators like `NonEmptyString`, `UuidString`, `Email`, and domain enums (`MaestroId`, `ToolType`, `DsaProfile`). Domain schemas in `schemas/` compose these into request-specific validators. Middleware functions (`validateJsonRequest`, `validateQuery`, `validateParams`) integrate with Next.js App Router.

## Validation Limits

| Constant                | Value | Use              |
| ----------------------- | ----- | ---------------- |
| `SHORT_STRING_MAX`      | 100   | Names, titles    |
| `MEDIUM_STRING_MAX`     | 500   | Descriptions     |
| `LONG_STRING_MAX`       | 2000  | Content blocks   |
| `EXTRA_LONG_STRING_MAX` | 10000 | Chat messages    |
| `SMALL_ARRAY_MAX`       | 20    | Tags, selections |
| `MEDIUM_ARRAY_MAX`      | 100   | Lists            |
| `LARGE_ARRAY_MAX`       | 1000  | Bulk operations  |

## Domain Schemas

| File               | Covers                                                         |
| ------------------ | -------------------------------------------------------------- |
| `chat.ts`          | Chat request/message validation                                |
| `user.ts`          | User settings, preferences                                     |
| `profile.ts`       | User profile updates                                           |
| `materials.ts`     | Learning materials CRUD                                        |
| `tools.ts`         | Educational tool requests (summary, mindmap, quiz, flashcards) |
| `gamification.ts`  | Gamification endpoint payloads                                 |
| `progress.ts`      | Progress tracking data                                         |
| `learning-path.ts` | Learning path management                                       |
| `conversations.ts` | Conversation CRUD                                              |
| `notifications.ts` | Notification scheduler                                         |
| `organization.ts`  | Tags, collections                                              |
| `parent.ts`        | Parent/professor dashboard                                     |
| `study-kit.ts`     | Study kit uploads                                              |
| `accessibility.ts` | Accessibility settings                                         |
| `adaptive.ts`      | Adaptive learning parameters                                   |

## Key Files

| File            | Purpose                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| `index.ts`      | Re-exports common, middleware, and Zod                                           |
| `common.ts`     | `NonEmptyString`, `UuidString`, `Email`, domain enums, `VALIDATION_LIMITS`       |
| `middleware.ts` | `validateJsonRequest()`, `validateQuery()`, `validateParams()`, error formatting |

## Code Patterns

```typescript
// In API route - validate JSON body with pipe() middleware
import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { validateJsonRequest } from "@/lib/validation";
import { chatRequestSchema } from "@/lib/validation/schemas/chat";

export const POST = pipe(
  withSentry("/api/chat"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const validation = await validateJsonRequest(ctx.req, chatRequestSchema);
  if (!validation.success) return validation.response; // 400 with details
  const data = validation.data; // typed and validated
  // ...business logic...
});

// Creating a new schema
import { z } from "zod";
import {
  NonEmptyString,
  VALIDATION_LIMITS,
  MaestroId,
} from "@/lib/validation/common";

export const mySchema = z.object({
  title: NonEmptyString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  maestroId: MaestroId,
  tags: z.array(z.string()).max(VALIDATION_LIMITS.SMALL_ARRAY_MAX).optional(),
});
```

## See Also

- `src/lib/validation/schemas/README.md` - Full schema authoring guide
- `docs/claude/api-routes.md` - API route patterns using validation
