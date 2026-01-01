# Database

Prisma at `prisma/schema.prisma`.

## Key Models

- **User** → Profile, Settings, Progress (1:1)
- **StudySession** - Learning with XP
- **FlashcardProgress** - FSRS state
- **Conversation** → Messages
- **Learning** - Cross-session insights
- **Notification** - Server persistence

## Data Persistence

| Data Type | Storage |
|-----------|---------|
| User settings | `/api/user/settings` |
| Progress | `/api/progress` |
| Materials | `/api/materials` |
| Conversations | `/api/conversations` |
| Session ID | `sessionStorage` |
| Device cache | `localStorage` (OK) |

## Commands

```bash
npx prisma generate  # Generate client
npx prisma db push   # Sync schema
npx prisma studio    # GUI browser
```
