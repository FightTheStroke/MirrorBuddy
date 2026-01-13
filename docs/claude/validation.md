# Input Validation

Comprehensive input validation for all API routes using Zod schemas.

## Overview

All API routes are protected by Zod validation schemas that enforce type safety, length limits, and format constraints. This prevents injection attacks, denial of service via oversized payloads, type confusion bugs, and unexpected application behavior.

## Architecture

```
src/lib/validation/
├── index.ts           # Main exports
├── common.ts          # Reusable schemas, constants, helpers
├── middleware.ts      # Validation helpers and error formatting
└── schemas/           # Route-specific validation schemas
    ├── chat.ts
    ├── user.ts
    ├── materials.ts
    ├── learning-path.ts
    ├── conversations.ts
    ├── tools.ts
    ├── gamification.ts
    ├── progress.ts
    ├── organization.ts
    ├── profile.ts
    ├── notifications.ts
    ├── parent.ts
    └── study-kit.ts
```

## Common Utilities

### Validation Limits

Defined in `src/lib/validation/common.ts`:

```typescript
export const VALIDATION_LIMITS = {
  // String lengths
  SHORT_STRING_MAX: 100,
  MEDIUM_STRING_MAX: 500,
  LONG_STRING_MAX: 2000,
  EXTRA_LONG_STRING_MAX: 10000,

  // Array sizes
  SMALL_ARRAY_MAX: 20,
  MEDIUM_ARRAY_MAX: 100,
  LARGE_ARRAY_MAX: 1000,

  // Numbers
  MIN_AGE: 5,
  MAX_AGE: 100,
  MIN_SCHOOL_YEAR: 1,
  MAX_SCHOOL_YEAR: 13,

  // Messages
  MIN_MESSAGES: 1,
  MAX_MESSAGES: 100,
  MAX_MESSAGE_LENGTH: 10000,
} as const;
```

### Base Schemas

Reusable schema builders:

- `NonEmptyString(maxLength)` - Non-empty string with max length
- `OptionalString(maxLength)` - Optional string with max length
- `PositiveInt` - Positive integer
- `NonNegativeInt` - Non-negative integer (≥ 0)
- `UuidString` - UUID format
- `IsoDateString` - ISO 8601 datetime
- `Email` - Email address
- `UrlString` - Valid URL

### Domain Enums

Pre-defined enums for common types:

- `MaestroId` - All 17 AI maestros (socrates, leo, ada, etc.)
- `ToolType` - Educational tools (summary, mindmap, flashcards, quiz, etc.)
- `DsaProfile` - DSA profiles (dyslexia, dyscalculia, dysgraphia, etc.)
- `Theme` - UI themes (light, dark, system)
- `SchoolLevel` - Italian school levels (elementare, media, superiore)
- `Coach` - Available coaches (melissa, roberto, chiara, andrea, favij)
- `Buddy` - Available buddies (mario, noemi, enea, bruno, sofia)

### Helper Functions

```typescript
// Create array schema with min/max constraints
createArraySchema(itemSchema, { min?, max?, errorMessage? })

// Create optional array schema
createOptionalArraySchema(itemSchema, maxItems)
```

## Validation Middleware

### Core Functions

**`validateRequest(schema, data)`**
- Validates data against a Zod schema
- Returns: `{ success: true, data: T }` or `{ success: false, error: ZodError }`

**`validateJsonRequest(request, schema)`**
- Validates and parses JSON request body
- Returns validated data or error response
- Handles JSON parsing errors

**`validateParams(params, schema)`**
- Validates route parameters
- Returns validation result

**`validateQuery(searchParams, schema)`**
- Validates URL query parameters
- Converts URLSearchParams to object before validation
- Returns validation result

### Error Formatting

**`formatValidationErrors(error: ZodError): ValidationError[]`**
- Converts Zod errors to structured format
- Returns array of `{ field: string, message: string }`

**`createValidationErrorResponse(error, message?)`**
- Creates NextResponse with 400 status
- Returns: `{ error: string, details: ValidationError[] }`

## Usage Patterns

### Basic POST Route Validation

```typescript
import { validateJsonRequest } from '@/lib/validation';
import { ChatRequestSchema } from '@/lib/validation/schemas/chat';

export async function POST(request: NextRequest) {
  // Validate request body
  const validation = await validateJsonRequest(request, ChatRequestSchema);

  if (!validation.success) {
    return validation.response; // Returns 400 with error details
  }

  const { messages, maestroId, systemPrompt } = validation.data;

  // Process validated data...
}
```

### GET Route with Query Parameters

```typescript
import { validateQuery, createValidationErrorResponse } from '@/lib/validation';
import { ListStudyKitsQuerySchema } from '@/lib/validation/schemas/study-kit';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const validation = validateQuery(searchParams, ListStudyKitsQuerySchema);

  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const { status, subject, limit, offset } = validation.data;

  // Process validated query params...
}
```

### PUT/PATCH Routes

```typescript
import { validateJsonRequest } from '@/lib/validation';
import { UpdateMaterialSchema } from '@/lib/validation/schemas/materials';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const validation = await validateJsonRequest(request, UpdateMaterialSchema);

  if (!validation.success) {
    return validation.response;
  }

  const updates = validation.data; // Only valid fields present

  // Apply updates to resource with id = params.id
}
```

## Validation Schemas by Route

### High-Priority (Security-Critical)

#### `/api/chat` - Chat Completions
**Schema:** `ChatRequestSchema` in `schemas/chat.ts`

Validates:
- `messages` - Array (1-100) of chat messages with role (user|assistant|system) and content (max 10000 chars)
- `systemPrompt` - Non-empty string (max 10000 chars)
- `maestroId` - One of 17 maestro IDs
- `enableTools` - Optional boolean
- `enableMemory` - Optional boolean
- `requestedTool` - Optional tool type (mindmap, quiz, flashcard, etc.)

Rejects extra fields with `.strict()`.

#### `/api/user/settings` - User Settings
**Schema:** `SettingsUpdateSchema` in `schemas/user.ts`

Validates:
- `theme` - light | dark | system
- `fontSize` - small | medium | large
- `voiceEnabled` - boolean
- `notificationsEnabled` - boolean
- `fontFamily` - string (max 100 chars)
- `aiProvider` - azure | ollama
- `coachId` - melissa | roberto | chiara | andrea | favij
- `buddyId` - mario | noemi | enea | bruno | sofia

All fields optional. Rejects extra fields.

#### `/api/materials` - Study Materials CRUD
**Schemas:** `CreateMaterialSchema`, `UpdateMaterialSchema` in `schemas/materials.ts`

**Create** validates:
- `toolType` - summary | mindmap | flashcards | quiz | outline | key-concepts
- `content` - JSON object (required)
- `conversationId` - optional string
- `title` - optional string (max 200 chars)

**Update** validates:
- `title` - optional string (max 200 chars)
- `content` - optional JSON object
- `archived` - optional boolean

#### `/api/learning-path` - Learning Path Management
**Schema:** `CreateLearningPathSchema` in `schemas/learning-path.ts`

Validates:
- `title` - Required string (1-200 chars)
- `subject` - Optional string (max 200 chars)
- `sourceStudyKitId` - Optional string
- `topics` - Array (min 1) of topics with:
  - `title` - Required string (1-200 chars)
  - `description` - Optional string (max 1000 chars)
  - `keyConcepts` - Optional string array (max 50 items, 200 chars each)
  - `difficulty` - Optional: beginner | intermediate | advanced
  - `order` - Optional non-negative integer
- `visualOverview` - Optional string (max 10000 chars)

#### `/api/conversations` - Conversation Management
**Schema:** `CreateConversationSchema` in `schemas/conversations.ts`

Validates:
- `maestroId` - Required string (one of 17 maestros)
- `title` - Optional string (max 200 chars)

### Medium-Priority (Data Manipulation)

#### `/api/tools/*` - Educational Tools
**Schemas:** `CreateToolSchema`, `SaveToolSchema`, `UpdateToolSchema` in `schemas/tools.ts`

**Create Tool** validates:
- `type` - Required tool type
- `input` - Required string
- `config` - Optional JSON object

**Save Tool** validates:
- `toolType` - Required tool type
- `content` - Required JSON object
- `title` - Optional string (max 200 chars)

**Update Tool** validates:
- `title` - Optional string (max 200 chars)
- `content` - Optional JSON object

#### `/api/gamification/*` - Gamification Endpoints
**Schemas:** `AwardPointsRequestSchema`, `UpdateStreakRequestSchema` in `schemas/gamification.ts`

**Award Points** validates:
- `points` - Required positive integer
- `reason` - Required non-empty string (max 500 chars)
- `category` - Optional string

**Update Streak** validates:
- `lastStudyDate` - Required ISO date string

#### `/api/progress/*` - Progress Tracking
**Schemas:** `ProgressUpdateSchema`, `SessionsPostSchema`, `FlashcardProgressPostSchema` in `schemas/progress.ts`

**Progress Update** validates:
- Season system (currentSeason, seasonsCompleted)
- Achievements array
- Masteries array (subject, level)
- Streak data

**Study Session** validates:
- `duration` - Positive integer (minutes)
- `subject` - Optional string
- `topicsStudied` - Optional string array
- `notesHighlights` - Optional string

**Flashcard Progress** validates:
- `cardId` - Required string
- `rating` - Required integer (0-5, FSRS rating)
- `scheduledFor` - Required ISO date

#### `/api/tags` & `/api/collections` - Organization
**Schemas:** `CreateTagSchema`, `UpdateTagSchema`, `CreateCollectionSchema`, `UpdateCollectionSchema` in `schemas/organization.ts`

**Tag** validates:
- `name` - String (1-50 chars, lowercase transform, trimmed)
- `color` - Optional hex color (#RRGGBB)

**Collection** validates:
- `name` - String (1-100 chars)
- `description` - Optional string (max 500 chars)
- `color` - Optional hex color
- `icon` - Optional string (max 50 chars)
- `parentId` - Optional CUID
- `sortOrder` - Optional non-negative integer

### Additional Routes

#### `/api/profile/*` - User Profile
**Schemas:** `GenerateProfileRequestSchema`, `UpdateConsentSchema` in `schemas/profile.ts`

**Generate Profile** validates:
- `sessionIds` - Array of strings (CUID format)
- `includeConversations` - Optional boolean

**Update Consent** validates:
- `consentGiven` - Required boolean
- `consentDate` - Optional ISO date string

#### `/api/notifications` & `/api/scheduler` - Notifications
**Schemas:** Multiple in `schemas/notifications.ts`

**Notification CRUD** validates:
- `title` - String (1-200 chars)
- `message` - String (1-1000 chars)
- `type` - info | warning | success | error
- `priority` - low | medium | high
- `actionUrl` - Optional URL
- `read` - Optional boolean

**Scheduler** validates:
- Study session scheduling with duration, breaks, subjects
- Flashcard review scheduling with cardId, scheduledFor
- Notification scheduling with title, message, scheduledFor

#### `/api/parent-professor` - Parent Dashboard
**Schema:** `ParentChatSchema` in `schemas/parent.ts`

Validates:
- `message` - Required non-empty string (max 2000 chars)
- `context` - Optional JSON object with student progress data

#### `/api/study-kit/*` - Study Kit Management
**Schemas:** `ListStudyKitsQuerySchema`, `UploadStudyKitSchema` in `schemas/study-kit.ts`

**List Query** validates:
- `status` - Optional: draft | processing | ready | error
- `subject` - Optional string
- `limit` - Optional positive integer (max 100)
- `offset` - Optional non-negative integer

**Upload** validates:
- `title` - Required string (1-200 chars)
- `subject` - Required string (1-200 chars)
- Note: File validation handled separately via FormData

## Security Features

### Payload Size Limits

All validation schemas enforce maximum sizes:
- **Strings**: 100-10000 chars depending on field
- **Arrays**: 1-1000 items depending on usage
- **Messages**: Max 100 messages per request
- **Message content**: Max 10000 chars per message

### Type Safety

Strict type validation prevents:
- Type confusion attacks
- Unexpected null/undefined handling
- JSON injection
- Array/object mixups

### Extra Field Rejection

Most schemas use `.strict()` to reject unexpected fields, preventing:
- Mass assignment vulnerabilities
- Parameter pollution
- Unexpected behavior from extra data

### Format Validation

Enforced formats:
- Email addresses
- URLs
- UUIDs/CUIDs
- ISO 8601 dates
- Hex colors (#RRGGBB)
- Enum values

## Error Response Format

All validation errors return HTTP 400 with structured format:

```json
{
  "error": "Invalid request data",
  "details": [
    {
      "field": "messages.0.content",
      "message": "Message content cannot be empty"
    },
    {
      "field": "maestroId",
      "message": "Invalid enum value. Expected 'socrates' | 'leo' | ..."
    }
  ]
}
```

### Field Paths

Error field paths use dot notation:
- `"field"` - Top-level field
- `"messages.0.content"` - Array item property
- `"topics.keyConcepts.5"` - Nested array item
- `"root"` - Top-level validation error

### Common Error Messages

- `"String cannot be empty"` - Required field missing or empty
- `"String must contain at most X characters"` - Exceeds max length
- `"Array must contain at least X element(s)"` - Array too small
- `"Array must contain at most X element(s)"` - Array too large
- `"Invalid enum value. Expected 'A' | 'B' | ..."` - Invalid enum
- `"Expected number, received string"` - Type mismatch
- `"Request body must be valid JSON"` - JSON parse error

## Testing

Unit tests in `src/lib/validation/__tests__/`:

- `chat.test.ts` - 52 test cases
- `user.test.ts` - 71 test cases
- `materials.test.ts` - 62 test cases

Tests cover:
- Valid inputs (including boundary conditions)
- Invalid inputs (type errors, out of range, missing fields)
- Edge cases (empty strings, null values, max lengths)
- Strict mode validation (extra fields rejected)
- Error message clarity

Run validation tests:

```bash
npm run test:unit -- src/lib/validation
```

## Best Practices

### When Creating New Schemas

1. **Import from common.ts**
   ```typescript
   import { NonEmptyString, MaestroId, VALIDATION_LIMITS } from '../common';
   ```

2. **Use predefined limits**
   ```typescript
   z.string().max(VALIDATION_LIMITS.MEDIUM_STRING_MAX)
   ```

3. **Export types**
   ```typescript
   export type ChatRequest = z.infer<typeof ChatRequestSchema>;
   ```

4. **Use strict mode**
   ```typescript
   export const MySchema = z.object({...}).strict();
   ```

5. **Provide clear error messages**
   ```typescript
   z.string().min(1, 'Field cannot be empty')
   ```

### In API Routes

1. **Validate early**
   - Validate before database queries
   - Validate before external API calls
   - Return 400 immediately on validation failure

2. **Use type-safe data**
   ```typescript
   const { data } = validation; // Fully typed!
   ```

3. **Don't leak sensitive info in errors**
   - Generic error messages in production
   - Detailed errors only in development

4. **Handle JSON parse errors**
   - `validateJsonRequest` handles this automatically

5. **Log validation failures**
   - Useful for detecting attacks
   - Track common user errors

## Migration Guide

### Existing Route Without Validation

**Before:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: 'Messages array is required' },
      { status: 400 }
    );
  }

  // Process body...
}
```

**After:**
```typescript
import { validateJsonRequest } from '@/lib/validation';
import { ChatRequestSchema } from '@/lib/validation/schemas/chat';

export async function POST(request: NextRequest) {
  const validation = await validateJsonRequest(request, ChatRequestSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { messages, maestroId, systemPrompt } = validation.data;

  // Process validated data...
}
```

### Benefits

- **Comprehensive validation** (types, lengths, formats, enums)
- **Type safety** (TypeScript knows exact shape)
- **Consistent error format**
- **Better error messages** (field-specific)
- **Reduced boilerplate** (no manual checks)
- **Testable** (schemas can be unit tested)

## Related Documentation

- `@docs/claude/api-routes.md` - API route reference
- `@docs/claude/database.md` - Database schema
- `src/lib/validation/schemas/README.md` - Schema creation guide
- `src/types/index.ts` - TypeScript type definitions
