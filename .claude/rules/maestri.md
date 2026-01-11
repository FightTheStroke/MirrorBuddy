# Maestri Rules - MirrorBuddy

## 20 AI Maestros

Educational AI tutors with embedded knowledge in `src/data/maestri/`:

| Maestro | Subject | Knowledge File |
|---------|---------|----------------|
| Leonardo | Art | `leonardo-knowledge.ts` |
| Galileo | Physics/Astronomy | `galileo-knowledge.ts` |
| Curie | Chemistry | `curie-knowledge.ts` |
| Cicerone | Civic Education | `cicerone-knowledge.ts` |
| Lovelace | Computer Science | `lovelace-knowledge.ts` |
| Smith | Economics | `smith-knowledge.ts` |
| Shakespeare | English | `shakespeare-knowledge.ts` |
| Humboldt | Geography | `humboldt-knowledge.ts` |
| Erodoto | History | `erodoto-knowledge.ts` |
| Manzoni | Italian | `manzoni-knowledge.ts` |
| Euclide | Mathematics | `euclide-knowledge.ts` |
| Mozart | Music | `mozart-knowledge.ts` |
| Socrate | Philosophy | `socrate-knowledge.ts` |
| Ippocrate | Health | `ippocrate-knowledge.ts` |
| Feynman | Physics | `feynman-knowledge.ts` |
| Darwin | Biology | `darwin-knowledge.ts` |
| Chris | Physical Education | `chris-knowledge.ts` |
| Omero | Storytelling | `omero-knowledge.ts` |
| Alex Pina | Spanish/Storytelling | `alex-pina-knowledge.ts` |
| Mascetti | Supercazzola | `amici-miei-knowledge.ts` |

## Data Structure

```typescript
// src/data/maestri/types.ts
interface MaestroFull {
  id: string;
  name: string;
  subject: string;
  systemPrompt: string;      // Base prompt
  knowledgeBase?: string;    // Embedded knowledge (facts, quotes, etc.)
  avatar: string;
  color: string;
  voiceId?: string;          // Azure TTS voice
}
```

## Usage Pattern

```typescript
import { getMaestroById, getAllMaestri } from '@/data/maestri';

// Get single maestro
const maestro = getMaestroById('galileo');

// Get all maestri
const all = getAllMaestri();

// Full system prompt (base + knowledge + safety)
const prompt = maestro.systemPrompt + maestro.knowledgeBase;
```

## Adding New Maestro

1. Create `src/data/maestri/{name}.ts` with maestro definition
2. Create `src/data/maestri/{name}-knowledge.ts` with embedded knowledge
3. Export from `src/data/maestri/index.ts`
4. Create avatar in `public/images/maestri/`
5. Run tests: `npm run test`

### Example Structure

```typescript
// src/data/maestri/newton.ts
import { NEWTON_KNOWLEDGE } from './newton-knowledge';

export const newton: MaestroFull = {
  id: 'newton',
  name: 'Isaac Newton',
  subject: 'physics',
  systemPrompt: `Sei Isaac Newton, il grande fisico...`,
  knowledgeBase: NEWTON_KNOWLEDGE,
  avatar: '/images/maestri/newton.png',
  color: '#4B5563',
};

// src/data/maestri/newton-knowledge.ts
export const NEWTON_KNOWLEDGE = `
## Fatti chiave
- Nato nel 1643 a Woolsthorpe
- Leggi del moto: F=ma
- Legge di gravitazione universale
...
`;
```

## AI Provider Integration

- **Primary**: Azure OpenAI (supports voice + embeddings)
- **Fallback**: Ollama (text-only, local)
- Provider logic: `src/lib/ai/providers.ts`

## Voice Considerations

When maestro speaks via TTS:
- Keep responses concise for voice
- Avoid special characters that TTS mispronounces
- Use natural speech patterns
- Each maestro can have custom `voiceId` for Azure TTS
