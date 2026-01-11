# API Patterns - MirrorBuddy

## Next.js App Router API Routes

Location: `src/app/api/[resource]/route.ts`

## Standard Structure

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Types at top
interface ResourceResponse {
  id: string;
  // ...
}

// GET - List or retrieve
export async function GET(request: NextRequest) {
  try {
    const data = await prisma.resource.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch' },
      { status: 500 }
    );
  }
}

// POST - Create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate input
    const created = await prisma.resource.create({ data: body });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create' },
      { status: 500 }
    );
  }
}
```

## File Split Pattern (for complex routes)

```
src/app/api/chat/
├── route.ts      # HTTP handlers (thin)
├── helpers.ts    # Business logic
├── types.ts      # TypeScript interfaces
└── constants.ts  # Config values
```

## Database Access

- Always use Prisma: `import { prisma } from '@/lib/db'`
- Schema: `prisma/schema.prisma`
- After schema changes: `npx prisma generate && npx prisma db push`

## Error Responses

| Status | Use Case |
|--------|----------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Bad request (validation) |
| 401 | Unauthorized |
| 404 | Not found |
| 500 | Server error |

## Health Check Pattern

See `src/app/api/health/route.ts` for standard health check implementation.
