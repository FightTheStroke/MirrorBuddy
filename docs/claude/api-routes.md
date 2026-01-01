# API Routes

All under `/src/app/api/`:

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

# Database
DATABASE_URL=file:./prisma/dev.db
```

## CI/CD

`.github/workflows/ci.yml`: Build & Lint → Security Audit → Documentation Check → Code Quality

E2E tests require real AI providers - run locally before release.
