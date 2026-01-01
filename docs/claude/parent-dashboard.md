# Parent Dashboard (GDPR Compliant)

Dashboard at `/parent-dashboard` shows aggregated insights from student's conversations.

**Access:** Settings → Genitori → Apri Dashboard Genitori

## Consent Model

- Requires explicit consent from BOTH parent and student
- Data exportable (JSON/PDF) for portability
- Right to erasure tracked and honored
- Access logged in `ProfileAccessLog`

## Data Flow

```
Conversations → Learning table → profile-generator.ts → StudentInsightProfile → Parent Dashboard UI
```

## Parent-Professor Chat (Issue #63)

Parents can chat with Maestri about their child's progress.

**Access:** Parent Dashboard → Diario → "Parla con Professore"

### Key Files

| File | Purpose |
|------|---------|
| `src/components/profile/parent-professor-chat.tsx` | Chat UI |
| `src/lib/ai/parent-mode.ts` | Formal prompts |
| `src/app/api/parent-professor/route.ts` | Chat API |
| `src/app/api/parent-professor/consent/route.ts` | Consent |

### Database Fields

- `Conversation.isParentMode` - Flags parent conversations
- `Conversation.studentId` - Links to student
- `Settings.parentChatConsentAt` - Consent timestamp

### Features

- Consent modal with AI disclaimer
- All messages persisted to database
- Maestri use formal language ("Lei")
- Learning entries as context
