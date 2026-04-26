# Validation Schemas

This directory contains Zod validation schemas for API routes.

## Overview

Each file in this directory defines validation schemas for specific API routes or related route groups. These schemas ensure that incoming request payloads are properly validated before processing.

## Structure

Schemas are organized by domain:

- `chat.ts` - Chat API validation schemas
- `user.ts` - User settings and profile validation schemas
- `materials.ts` - Learning materials CRUD validation schemas
- `learning-path.ts` - Learning path management validation schemas
- `conversations.ts` - Conversation management validation schemas
- `tools.ts` - Educational tools validation schemas
- `gamification.ts` - Gamification endpoints validation schemas
- `progress.ts` - Progress tracking validation schemas
- `organization.ts` - Tags and collections validation schemas
- `profile.ts` - User profile validation schemas
- `notifications.ts` - Notifications and scheduler validation schemas
- `parent.ts` - Parent/professor dashboard validation schemas
- `study-kit.ts` - Study kit and upload validation schemas

## Usage

Import validation schemas in your API routes:

```typescript
import { validateChatRequest } from '@/lib/validation/schemas/chat';

export async function POST(request: Request) {
  const body = await request.json();
  const result = validateChatRequest(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  const validatedData = result.data;
  // Process validatedData...
}
```

Or use the validation middleware:

```typescript
import { withValidation } from '@/lib/validation/middleware';
import { chatRequestSchema } from '@/lib/validation/schemas/chat';

export const POST = withValidation(chatRequestSchema, async (request, validatedData) => {
  // validatedData is typed and validated
  // Process request...
});
```

## Creating New Schemas

When creating a new schema file:

1. Import base schemas and utilities from `@/lib/validation/common`
2. Define request/response schemas using Zod
3. Export validation functions that return `ValidationResult<T>`
4. Add comprehensive JSDoc comments
5. Follow naming conventions: `<domain>RequestSchema`, `validate<Domain>Request`

Example:

```typescript
// src/lib/validation/schemas/example.ts
import { z } from 'zod';
import { NonEmptyString, VALIDATION_LIMITS } from '@/lib/validation/common';
import type { ValidationResult } from '@/lib/validation/middleware';

/**
 * Schema for example API request
 */
export const exampleRequestSchema = z.object({
  title: NonEmptyString(VALIDATION_LIMITS.MEDIUM_STRING_MAX),
  description: z.string().max(VALIDATION_LIMITS.LONG_STRING_MAX).optional(),
});

export type ExampleRequest = z.infer<typeof exampleRequestSchema>;

/**
 * Validates example API request payload
 */
export function validateExampleRequest(data: unknown): ValidationResult<ExampleRequest> {
  const result = exampleRequestSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: result.error.format(),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
```

## Best Practices

- **Reuse common schemas**: Use helpers from `common.ts` (e.g., `NonEmptyString`, `PositiveInt`)
- **Set reasonable limits**: Use `VALIDATION_LIMITS` constants for array sizes and string lengths
- **Type safety**: Export TypeScript types using `z.infer<typeof schema>`
- **Clear error messages**: Provide descriptive error messages for validation failures
- **Validate arrays**: Use `createArraySchema` helper for arrays with min/max constraints
- **Enum validation**: Use predefined enums from `common.ts` (e.g., `MaestroId`, `ToolType`)

## Security Considerations

- **Prevent oversized payloads**: Always set max limits on strings and arrays
- **Type validation**: Ensure correct types to prevent type confusion attacks
- **Sanitization**: Validation doesn't sanitize - apply additional sanitization for user content
- **Error messages**: Don't leak sensitive information in validation error messages
