# Learning Path

## Cos'è e a cosa serve

**Problema**: Uno studente carica un PDF di 50 pagine sulla Rivoluzione Francese. Da dove inizia? Cosa studia prima? Come sa se ha capito?

**Soluzione**: Il Learning Path prende quel PDF e lo trasforma automaticamente in un **percorso di studio guidato**:

1. **Analisi AI**: Legge il PDF e identifica 3-5 argomenti principali (es. "Cause della Rivoluzione", "La Presa della Bastiglia", "Il Terrore", "Napoleone")

2. **Ordine pedagogico**: Li mette in ordine dal più semplice al più complesso, come farebbe un insegnante

3. **Sblocco progressivo**: Lo studente inizia dal primo argomento. Solo quando lo completa, si sblocca il secondo. Come un videogioco.

4. **Per ogni argomento**:
   - **Panoramica**: Riassunto + mappa visuale
   - **Mappa mentale**: Per visualizzare i concetti
   - **Flashcard**: Per memorizzare i punti chiave
   - **Quiz finale**: Per verificare se ha capito (deve passare per sbloccare il prossimo)

5. **Tracciamento**: Lo studente vede sempre a che punto è (es. "2/4 argomenti completati - 50%")

**Dove si trova**:
- Dallo Zaino → filtro "Percorsi"
- Da uno Study Kit → bottone "Genera Percorso"

**Esempio pratico**:
> Mario carica il PDF di Storia. L'AI crea un percorso con 4 tappe. Mario parte dalla prima ("Le Cause"), legge la panoramica, studia le flashcard, fa il quiz (85%). Tappa completata! Si sblocca "La Presa della Bastiglia". Mario continua finché non completa tutto il percorso.

---

## Documentazione Tecnica

AI-powered progressive learning paths that transform PDF study materials into structured, gamified learning journeys with automatic topic extraction, progress tracking, and adaptive content.

## Key Files

| Area | Files |
|------|-------|
| Types | `src/types/learning-path.ts` |
| Library | `src/lib/learning-path/*.ts` |
| Components | `src/components/education/learning-path/*.tsx` |
| API Routes | `src/app/api/learning-path/**/*.ts` |
| Tests | `src/lib/learning-path/__tests__/*.test.ts` |

## Architecture

### Library Modules

| Module | File | Purpose |
|--------|------|---------|
| topic-analyzer | `topic-analyzer.ts` | AI-powered topic extraction from PDF content |
| path-generator | `path-generator.ts` | Creates learning path with topics and steps |
| progress-manager | `progress-manager.ts` | Handles topic completion and unlocking |
| material-linker | `material-linker.ts` | Links existing materials to topics |
| topic-material-generator | `topic-material-generator.ts` | Generates overview, mindmap, flashcards |
| final-quiz-generator | `final-quiz-generator.ts` | Creates topic completion quiz |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| LearningPathView | `learning-path-view.tsx` | Full path display with progress |
| TopicDetail | `topic-detail.tsx` | Expandable topic with steps |
| VisualOverview | `visual-overview.tsx` | Mermaid SVG flowchart |
| LearningPathsList | `learning-paths-list.tsx` | User's paths listing |
| TopicCard | `learning-path-view.tsx` | Individual topic card |

## Topic Analysis

```typescript
// AI extracts 2-5 macro-topics from PDF content
const result = await analyzeTopics(pdfText, title, subject);

// Returns:
{
  documentTitle: string;
  topics: IdentifiedTopic[];  // 2-5 topics
  suggestedOrder: string[];   // Pedagogical order
  totalEstimatedMinutes: number;
}

// Each topic:
{
  id: string;
  title: string;
  description: string;
  keyConcepts: string[];      // 3-5 concepts
  estimatedDifficulty: 'basic' | 'intermediate' | 'advanced';
  order: number;
  estimatedMinutes: number;
  textExcerpt: string;
}
```

## Progressive Unlock System

```typescript
// Topic statuses
type TopicStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

// First topic starts unlocked, rest are locked
// Complete topic → unlock next in order
// Path complete when all topics completed

// Complete a topic (with transaction for atomicity)
const result = await completeTopic(topicId, quizScore);
// Returns: { topicId, newStatus, quizScore, unlockedNext, nextTopicId, pathProgress, pathCompleted }
```

## Topic Steps

Each topic has 4 internal steps:

| Step | Type | Content |
|------|------|---------|
| 1 | overview | Text summary + Mermaid diagram |
| 2 | mindmap | Auto-generated concept map |
| 3 | flashcard | Key concepts as cards |
| 4 | quiz | Assessment questions |

```typescript
type TopicStepType = 'overview' | 'mindmap' | 'flashcard' | 'quiz';

type StepContent =
  | OverviewContent   // { text, mermaidCode? }
  | MindmapContent    // { nodes, svgData? }
  | FlashcardContent  // { cards: {front, back}[] }
  | QuizContent;      // { questions: {...}[] }
```

## API Endpoints

```
# Learning Paths
GET  /api/learning-path              # List user's paths
POST /api/learning-path              # Create path with topics
POST /api/learning-path/generate     # Generate from study kit

# Single Path
GET    /api/learning-path/[id]       # Get path details
DELETE /api/learning-path/[id]       # Delete path

# Topics
GET   /api/learning-path/[id]/topics/[topicId]              # Get topic with steps
PATCH /api/learning-path/[id]/topics/[topicId]              # Update status/score

# Attempts
GET  /api/learning-path/[id]/topics/[topicId]/attempts      # List attempts
POST /api/learning-path/[id]/topics/[topicId]/attempts      # Record attempt
```

## Database Models

```prisma
model LearningPath {
  id              String   @id @default(cuid())
  userId          String
  title           String
  subject         String?
  sourceStudyKitId String?
  totalTopics     Int      @default(0)
  completedTopics Int      @default(0)
  progressPercent Int      @default(0)
  status          String   @default("ready")  // ready|in_progress|completed
  visualOverview  String?  @db.Text           // Mermaid SVG
  topics          LearningPathTopic[]

  @@index([userId, status])
}

model LearningPathTopic {
  id               String   @id @default(cuid())
  pathId           String
  order            Int
  title            String
  description      String?  @db.Text
  keyConcepts      String   @db.Text          // JSON array
  difficulty       String   @default("intermediate")
  status           String   @default("locked")
  estimatedMinutes Int?
  quizScore        Int?
  steps            TopicStep[]
  attempts         TopicAttempt[]
  path             LearningPath @relation(...)
}

model TopicStep {
  id          String   @id @default(cuid())
  topicId     String
  order       Int
  type        String   // overview|mindmap|flashcard|quiz
  title       String
  content     String   @db.Text  // JSON
  isCompleted Boolean  @default(false)
}

model TopicAttempt {
  id        String   @id @default(cuid())
  topicId   String
  score     Int
  passed    Boolean
  answers   String   @db.Text  // JSON
}
```

## Visual Overview (Mermaid)

```typescript
// SVG is sanitized with DOMPurify before rendering
import DOMPurify from 'dompurify';

const sanitizedSvg = DOMPurify.sanitize(svg, {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ['use'],
});
containerRef.current.innerHTML = sanitizedSvg;
```

## Integration Points

- **StudyKitViewer**: "Genera Percorso" button triggers path generation
- **Zaino**: "Percorsi" filter shows learning paths
- **Gamification**: Path completion awards MirrorBucks

## Test Coverage

- **topic-analyzer.test.ts**: 10 tests
- **path-generator.test.ts**: 9 tests
- **progress-manager.test.ts**: 10 tests
- **material-linker.test.ts**: 9 tests
- **topic-material-generator.test.ts**: 10 tests
- **final-quiz-generator.test.ts**: 9 tests
- **visual-overview.test.ts**: 10 tests
- **Total**: 70+ unit tests
