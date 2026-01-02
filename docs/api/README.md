# MirrorBuddy API Documentation

This directory contains OpenAPI 3.0 specification for the MirrorBuddy API.

## Files

- `openapi.yaml` - Main OpenAPI specification file

## Viewing the Documentation

### Option 1: Swagger UI (Online)

Visit [Swagger Editor](https://editor.swagger.io/) and paste the contents of `openapi.yaml`.

### Option 2: Local Swagger UI

```bash
# Using npx (no installation needed)
npx swagger-ui-watcher openapi.yaml

# Or install globally
npm install -g swagger-ui-watcher
swagger-ui-watcher openapi.yaml
```

### Option 3: Redoc (Alternative viewer)

```bash
npx @redocly/cli preview-docs openapi.yaml
```

### Option 4: VS Code Extension

Install the "OpenAPI (Swagger) Editor" extension in VS Code, then open `openapi.yaml`.

## API Overview

**MirrorBuddy** provides a comprehensive REST API for:

### Core Features
- **Maestri** - 17 AI teachers specialized in different subjects
- **Chat** - Text-based conversations with Maestros
- **Voice** - Voice-first conversations (Azure Realtime API)
- **Materials** - Educational materials (mindmaps, quizzes, flashcards, demos)
- **Flashcards** - FSRS-based spaced repetition system
- **Progress** - XP, levels, streaks, achievements
- **Profile** - Student preferences and learning goals
- **Parent Dashboard** - Progress tracking and notes for parents
- **Collaboration** - Real-time collaborative mindmaps

### Authentication

All endpoints use cookie-based authentication with `convergio-user-id`.
The user ID is automatically generated on first visit and stored in `sessionStorage`.

### Rate Limiting

- **General endpoints**: 10 requests/minute per IP
- **Chat endpoints**: 5 requests/minute per user
- **Voice endpoints**: 10 requests/minute per user

## Examples

### Get All Maestros

```bash
curl http://localhost:3000/api/maestri
```

### Send Chat Message

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: convergio-user-id=your-user-id" \
  -d '{
    "messages": [
      {"role": "user", "content": "Spiegami la fotosintesi"}
    ],
    "maestroId": "maestro_biology",
    "enableMemory": true
  }'
```

### Review a Flashcard

```bash
curl -X POST http://localhost:3000/api/flashcards/review \
  -H "Content-Type: application/json" \
  -H "Cookie: convergio-user-id=your-user-id" \
  -d '{
    "flashcardId": "flash_123",
    "quality": 3
  }'
```

Quality ratings:
- `1` - Again (forgot)
- `2` - Hard (remembered with difficulty)
- `3` - Good (remembered correctly)
- `4` - Easy (remembered very easily)

## API Design Principles

### RESTful Design
- Resources are nouns (`/maestri`, `/materials`)
- HTTP methods map to CRUD operations
- Proper status codes (200, 201, 400, 404, 429, 500)

### JSON Response Format
All responses return JSON with consistent structure:

```json
{
  "data": { ... },
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### Error Responses
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Pagination
List endpoints support pagination:
- `limit` - Number of items per page (default: 50, max: 100)
- `offset` - Number of items to skip

## FSRS Algorithm

The flashcard system uses the FSRS (Free Spaced Repetition Scheduler) algorithm:

- **Stability** - Days until 90% forgetting probability
- **Difficulty** - 0 (easy) to 1 (hard)
- **Quality ratings** affect next review interval:
  - Easy (4): +130% stability
  - Good (3): +85% stability
  - Hard (2): +60% stability
  - Again (1): -70% stability + difficulty penalty

## Conversational Memory (ADR 0021)

Chat API supports memory injection:
- Last 3 conversations are loaded
- Key facts and topics are merged
- Injected into system prompt for continuity

Enable with `"enableMemory": true` in chat requests.

## Real-time Features

### Voice API
WebSocket connection for real-time voice:
```
ws://localhost:3000/api/voice
```

### Collaboration
WebSocket for real-time mindmap collaboration:
```
ws://localhost:3000/api/collab/rooms/{roomId}
```

## Contributing

To update the API documentation:

1. Edit `openapi.yaml`
2. Validate:
   ```bash
   npx @redocly/cli lint openapi.yaml
   ```
3. Preview:
   ```bash
   npx @redocly/cli preview-docs openapi.yaml
   ```

## Resources

- [OpenAPI Specification](https://spec.openapi.org/oas/v3.0.3)
- [Swagger Editor](https://editor.swagger.io/)
- [Redocly CLI](https://redocly.com/docs/cli/)
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs.js)

## License

Apache-2.0 - See LICENSE file for details
