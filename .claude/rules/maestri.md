# Maestri Rules - MirrorBuddy

## 17 AI Maestros

Educational AI tutors organized by category in `src/data/`:

| File | Category | Maestros |
|------|----------|----------|
| `maestri-science-arts.ts` | Science & Arts | Physics, Chemistry, Biology, Art, Music |
| `maestri-humanities.ts` | Humanities | History, Literature, Philosophy, Languages |
| `maestri-society.ts` | Society | Geography, Economics, Law, Psychology |
| `maestri-tech-health.ts` | Tech & Health | Math, Computer Science, Medicine, PE |

## Data Structure

```typescript
// Each maestro has:
interface Maestro {
  id: string;              // Unique identifier
  name: string;            // Display name
  subject: string;         // Subject area
  personality: string;     // Character traits
  systemPrompt: string;    // AI behavior prompt
  avatar: string;          // Avatar image path
  color: string;           // Theme color
}
```

## Usage Pattern

```typescript
import { ID_MAP, getFullSystemPrompt } from '@/data/maestri-data';
import { MAESTRI_SCIENCE_ARTS } from '@/data/maestri-data';

// Get maestro by ID
const maestro = ID_MAP['physics'];

// Get full system prompt for AI
const prompt = getFullSystemPrompt('physics');
```

## AI Provider Integration

- **Primary**: Azure OpenAI (supports voice)
- **Fallback**: Ollama (text-only, local)
- Provider logic: `src/lib/ai/providers.ts`

## Adding New Maestro

1. Add to appropriate category file (`maestri-*.ts`)
2. Add ID mapping in `maestri-ids-map.ts`
3. Create avatar in `public/images/maestri/`
4. Update tests
5. Document in `@docs/claude/buddies.md` or `coaches.md`

## Voice Considerations

When maestro speaks via TTS:
- Keep responses concise for voice
- Avoid special characters that TTS mispronounces
- Use natural speech patterns
