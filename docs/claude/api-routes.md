# API Routes

All under `/src/app/api/`:

<<<<<<< HEAD
| Route | Purpose |
|-------|---------|
| `/chat` | Chat completions with safety filtering and tool support |
| `/chat/stream` | SSE streaming chat (no tools, Azure only) - ADR 0034 |
| `/conversations/[id]` | Session management |
| `/realtime/token` | Azure voice token |
| `/progress` | XP, levels, gamification |
| `/flashcards/progress` | FSRS updates |
| `/notifications` | CRUD |
| `/profile` | Student insights (GDPR) |
| `/parent-professor` | Parent chat |
| `/user/settings` | User preferences |
| `/materials` | Study materials CRUD |
||||||| parent of 1f5a178 (auto-claude: subtask-5-2 - Update API routes documentation)
| Route | Purpose |
|-------|---------|
| `/chat` | Chat completions with safety filtering |
| `/conversations/[id]` | Session management |
| `/realtime/token` | Azure voice token |
| `/progress` | XP, levels, gamification |
| `/flashcards/progress` | FSRS updates |
| `/notifications` | CRUD |
| `/profile` | Student insights (GDPR) |
| `/parent-professor` | Parent chat |
| `/user/settings` | User preferences |
| `/materials` | Study materials CRUD |
=======
## Input Validation

**All API routes are protected by Zod validation schemas.** See `@docs/claude/validation.md` for comprehensive documentation.

Validation features:
- Type safety and format validation
- Payload size limits (prevents DoS)
- Strict mode (rejects extra fields)
- Detailed error messages (400 status)
- Enum validation for all domain types

## Route Reference

| Route | Purpose | Validation Schema |
|-------|---------|-------------------|
| `/chat` | Chat completions with safety filtering | `ChatRequestSchema` |
| `/conversations` | Session management | `CreateConversationSchema` |
| `/conversations/[id]` | Conversation CRUD | - |
| `/realtime/token` | Azure voice token | - |
| `/progress` | XP, levels, gamification | `ProgressUpdateSchema` |
| `/progress/sessions` | Study session tracking | `SessionsPostSchema` |
| `/flashcards/progress` | FSRS updates | `FlashcardProgressPostSchema` |
| `/notifications` | CRUD | `NotificationSchema` |
| `/scheduler` | Study scheduling | `SchedulerSchema` |
| `/profile` | Student insights (GDPR) | `GenerateProfileRequestSchema` |
| `/parent-professor` | Parent chat | `ParentChatSchema` |
| `/user/settings` | User preferences | `SettingsUpdateSchema` |
| `/materials` | Study materials CRUD | `CreateMaterialSchema`, `UpdateMaterialSchema` |
| `/learning-path` | Learning path management | `CreateLearningPathSchema` |
| `/tools/*` | Educational tools | `CreateToolSchema`, `SaveToolSchema` |
| `/gamification/*` | Points, achievements, streaks | `AwardPointsRequestSchema`, `UpdateStreakRequestSchema` |
| `/tags` | Tag management | `CreateTagSchema`, `UpdateTagSchema` |
| `/collections` | Collection management | `CreateCollectionSchema`, `UpdateCollectionSchema` |
| `/study-kit` | Study kit management | `ListStudyKitsQuerySchema`, `UploadStudyKitSchema` |

## Validation Usage

### In API Routes

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

### Query Parameter Validation

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
>>>>>>> 1f5a178 (auto-claude: subtask-5-2 - Update API routes documentation)

## Environment

```bash
# Azure OpenAI (required for voice)
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_REALTIME_ENDPOINT=
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime

# Ollama (local text-only)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Feature Flags
ENABLE_CHAT_STREAMING=true  # SSE streaming for chat (default: true)

# Database
DATABASE_URL=file:./prisma/dev.db
```

## CI/CD

`.github/workflows/ci.yml`: Build & Lint → Security Audit → Documentation Check → Code Quality

E2E tests require real AI providers - run locally before release.
